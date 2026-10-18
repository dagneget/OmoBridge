import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, RefreshCw, Truck, WifiOff } from 'lucide-react';

import {
  Button,
  Card,
  EmptyState,
  MapComponent,
  Skeleton,
  StatusChip,
} from '../../components/common';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { queryKeys } from '../../services/queryKeys';
import { normalizeApiError } from '../../services/apiError';
import defaultI18n from '../../i18n';
import { formatDateTime } from '../../utils/formatters';
import { trackingService } from '../../features/tracking';
import {
  TRACKING_POLL_MS,
  buildTrail,
  hasPosition,
  relativeTimeKey,
  stalenessOf,
  trackingView,
} from '../../features/tracking';

/**
 * F-604: the buyer-facing live tracking page, reached from a link containing a tracking token.
 *
 * The token is the only credential — there is no login — so this screen must never display or
 * request anything beyond what `GET /api/v1/delivery/track/{token}` returns. It shows a job
 * number, a status, a position and a trail: no names, no phone numbers, no addresses.
 *
 * ## Polling, not SSE
 * F-604 asked for an SSE stream with a polling fallback. The backend has no SSE endpoint, no
 * `SseEmitter` and no WebSocket anywhere in the codebase, so building one here would mean
 * inventing a contract. This page polls the real endpoint instead, and the gap is logged as
 * F-604-E1. Polling stops as soon as the job reaches a terminal status.
 */

/**
 * The buyer-facing lifecycle. Deliberately narrower than the provider's transition table: a
 * waiting buyer wants "where is it", not the failure and cancellation branches.
 */
const BUYER_LIFECYCLE = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] as const;

export default function LiveTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const { i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();

  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };
  const interpolate = (template: string, values: Record<string, string>) =>
    Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, v), template);

  const query = useQuery({
    queryKey: queryKeys.delivery.tracking(String(token)),
    queryFn: () => trackingService.getTracking(String(token)),
    enabled: Boolean(token),
    // A 404 means the link is not valid; retrying it would just delay the explanation.
    retry: false,
    staleTime: 0,
    refetchInterval: (current) => {
      if (current.state.error) return false;
      const data = current.state.data;
      if (!data) return false;
      // Keep watching only while the job can still move.
      return trackingView(data).kind === 'live' ? TRACKING_POLL_MS : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const tracking = query.data;
  const trail = useMemo(() => buildTrail(tracking?.history), [tracking]);

  const relativeFor = (iso: string | undefined): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const { key, count } = relativeTimeKey(date);
    const template = tr(`relative.${key}`, 'just now');
    return interpolate(template, { count: String(count) });
  };

  /* ------------------------------------------------------------------ states */

  if (!token) {
    return (
      <Shell tr={tr}>
        <EmptyState
          title={tr('tracking.invalidTitle', 'This tracking link is not complete')}
          description={tr(
            'tracking.invalidBody',
            'Check the link you were sent. It should end with your tracking number.'
          )}
        />
      </Shell>
    );
  }

  if (query.isPending) {
    return (
      <Shell tr={tr}>
        <div className="space-y-4" data-testid="tracking-loading">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Shell>
    );
  }

  if (query.isError) {
    const error = normalizeApiError(query.error);

    // A 404 is the server saying "no such token" — the most common cause is an expired or
    // mistyped link, so say that rather than showing a generic failure.
    if (error.status === 404) {
      return (
        <Shell tr={tr}>
          <EmptyState
            title={tr('tracking.notFoundTitle', 'We could not find this delivery')}
            description={tr(
              'tracking.notFoundBody',
              'The link may have expired, or the number may have been mistyped. Ask whoever sent it for a new one.'
            )}
            action={
              <Link to="/" className="text-sm font-medium text-primary hover:underline">
                {tr('tracking.backHome', 'Back to OmoBridge')}
              </Link>
            }
          />
        </Shell>
      );
    }

    return (
      <Shell tr={tr}>
        <Card className="p-5 space-y-4" data-testid="tracking-error">
          <div className="flex items-start gap-3">
            {error.isNetworkError || !isOnline ? (
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {tr('tracking.unavailableTitle', 'Live tracking is unavailable right now')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tr(
                  'tracking.unavailableBody',
                  'We could not reach the tracking service. Your delivery is not affected.'
                )}
              </p>
            </div>
          </div>
          <Button onClick={() => void query.refetch()} data-testid="tracking-retry">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {tr('tracking.retry', 'Try again')}
          </Button>
        </Card>
      </Shell>
    );
  }

  /* ------------------------------------------------------------- success view */

  const status = String(tracking?.status ?? 'UNKNOWN').toUpperCase();
  const lastRecordedAt = tracking?.lastRecordedAt;
  const staleness = tracking ? stalenessOf(tracking) : { kind: 'none' as const };
  const position = tracking && hasPosition(tracking) ? tracking : null;
  const isLive = tracking ? trackingView(tracking).kind === 'live' : false;

  return (
    <Shell tr={tr}>
      <div className="space-y-4" data-testid="live-tracking-page">
        {/* Header ------------------------------------------------------- */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {tr('tracking.title', 'Live delivery tracking')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr(
              'tracking.subtitle',
              'Follow this delivery as it makes its way across South Omo.'
            )}
          </p>
        </div>

        <Card className="p-4 space-y-3" data-testid="tracking-summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {tr('tracking.jobNumber', 'Tracking number')}
              </span>
              <p className="font-mono text-base font-bold text-foreground break-all">
                {tracking?.jobNo ?? token}
              </p>
            </div>
            <StatusChip status={status} />
          </div>

          {/* "Last updated" answers when we last asked; the stale warning below answers when
              the vehicle actually moved. They are different questions and both matter. */}
          {lastRecordedAt && (
            <p className="text-xs text-muted-foreground" data-testid="tracking-last-updated">
              {tr('tracking.lastUpdated', 'Last updated')} {relativeFor(lastRecordedAt)}
              {' · '}
              {formatDateTime(new Date(lastRecordedAt), 'timeOnly')}
            </p>
          )}
        </Card>

        {/* Stale warning ------------------------------------------------ */}
        {staleness.kind === 'stale' && (
          <div
            role="status"
            data-testid="tracking-stale-warning"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
          >
            {tr(
              'tracking.staleWarning',
              'This position has not changed for a while. It may no longer be accurate.'
            )}
          </div>
        )}

        {!isOnline && (
          <div
            role="status"
            data-testid="tracking-offline-notice"
            className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
          >
            {tr(
              'tracking.offlineNotice',
              'You are offline, so this is the last position we received.'
            )}
          </div>
        )}

        {/* Position ----------------------------------------------------- */}
        {position ? (
          <MapComponent
            latitude={position.currentLatitude as number}
            longitude={position.currentLongitude as number}
            trail={trail}
            zoom={12}
            className="h-64 w-full sm:h-72"
            showDirectionsButton={false}
          />
        ) : (
          <Card className="p-5">
            <div className="flex items-start gap-3" data-testid="tracking-no-position">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {tr('tracking.noPositionTitle', 'No location reported yet')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tr(
                    'tracking.noPositionBody',
                    'Once the driver starts sharing their location, it will appear here.'
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Timeline ----------------------------------------------------- */}
        <Card className="p-4 sm:p-5" data-testid="tracking-timeline">
          <h2 className="text-base font-semibold text-foreground mb-4">
            {tr('tracking.timelineTitle', 'Progress')}
          </h2>
          <ol className="space-y-0">
            {BUYER_LIFECYCLE.map((step, index) => {
              const currentIndex = BUYER_LIFECYCLE.indexOf(
                status as (typeof BUYER_LIFECYCLE)[number]
              );
              const done = currentIndex >= 0 && index < currentIndex;
              const current = index === currentIndex;

              return (
                <li key={step} className="flex gap-3">
                  {/* Rail */}
                  <div className="flex flex-col items-center">
                    <span
                      data-testid={`timeline-dot-${step.toLowerCase()}`}
                      aria-hidden="true"
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                        current
                          ? 'border-primary bg-primary'
                          : done
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background'
                      }`}
                    />
                    {index < BUYER_LIFECYCLE.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`w-0.5 flex-1 min-h-6 ${done ? 'bg-primary' : 'bg-border'}`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pb-4 min-w-0">
                    <p
                      className={`text-sm ${
                        current ? 'font-semibold text-foreground' : 'text-foreground'
                      } ${done || current ? '' : 'text-muted-foreground'}`}
                    >
                      {tr(
                        `tracking.step.${step.toLowerCase()}`,
                        step.replace('_', ' ').toLowerCase()
                      )}
                    </p>
                    {current && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tr('tracking.currentStep', 'Current step')}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Terminal failure is shown outside the happy-path rail, because it is not a step
            the delivery reached — presenting it as one would read as progress. */}
        {(status === 'FAILED' || status === 'CANCELLED') && (
          <div
            role="status"
            data-testid="tracking-failed-notice"
            className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {status === 'FAILED'
              ? tr(
                  'tracking.failedNotice',
                  'This delivery could not be completed. Please contact whoever placed the order.'
                )
              : tr('tracking.cancelledNotice', 'This delivery was cancelled.')}
          </div>
        )}

        {!isLive && (
          <p className="text-xs text-muted-foreground" data-testid="tracking-complete-notice">
            {tr(
              'tracking.completeNotice',
              'This delivery has reached its final status, so live updates have stopped.'
            )}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {tr(
            'tracking.privacyNote',
            'Anyone with this link can see this delivery’s status and position. Do not share it widely.'
          )}
        </p>
      </div>
    </Shell>
  );
}

/** Page chrome: the public tracking screen is standalone, so it owns its own container. */
function Shell({
  children,
  tr,
}: {
  children: React.ReactNode;
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      {children}
      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Truck className="h-3.5 w-3.5" aria-hidden="true" />
        {tr('tracking.poweredBy', 'Powered by OmoBridge')}
      </p>
    </main>
  );
}
