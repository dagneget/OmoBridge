import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarDays, MapPin, Package, ScanLine, Sprout, WifiOff } from 'lucide-react';

import { Button, Card, EmptyState, Skeleton } from '../../components/common';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { queryKeys } from '../../services/queryKeys';
import { normalizeApiError } from '../../services/apiError';
import defaultI18n from '../../i18n';
import { formatDateTime } from '../../utils/formatters';
import {
  dedupeOrigins,
  formatOutputQuantity,
  hasAnyFarmerName,
  hasFarmerName,
  originGroupLabel,
  originHeading,
  publicTraceService,
} from '../../features/traceability';

/**
 * F-701: the public trace page behind the QR code printed on a product.
 *
 * It is reached by a bearer token with no session, so it shows only what
 * `GET /api/v1/trace/{publicToken}` returns.
 *
 * ## Two rules taken from the backend rather than assumed
 *
 * **1. Farmer names appear only when the API sends one.** `TraceabilityService` fills
 * `farmerName` in only when both `TraceRecord.showFarmerNames` and `Farmer.consentPublicName`
 * are true, and sends `null` otherwise. The page renders the village and group for every origin
 * and adds a name only when one is present — it never derives a person's name from the group or
 * the village, because a name shown here is someone who agreed to be shown.
 *
 * **2. This endpoint writes a row on every call.** `getPublicTrace` saves a `TraceScan` and the
 * `scanCount` is the running total, so refetching on focus or reconnect would inflate a
 * producer's scan count with no human behind it. The query is pinned to a single fetch and kept
 * for the session, which also satisfies "cached for offline after one visit" on top of the
 * service worker's HTTP cache.
 */

/** Dedupe again client-side: the backend dedupes on a composite key, and a repeat is noise. */
const ORIGIN_KEY = (o: { village?: string; cooperativeGroup?: string; farmerName?: string }) =>
  `${o.village}|${o.cooperativeGroup}|${o.farmerName}`;

export default function PublicTracePage() {
  const { token } = useParams<{ token: string }>();
  const { i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();

  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  const query = useQuery({
    queryKey: queryKeys.traceability.publicTrace(String(token)),
    queryFn: () => publicTraceService.getPublicTrace(String(token)),
    enabled: Boolean(token),
    retry: false,
    // Every request is recorded as a scan, so read once and keep it.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  if (!token) {
    return (
      <Shell tr={tr}>
        <EmptyState
          title={tr('trace.invalidTitle', 'This trace link is not complete')}
          description={tr(
            'trace.invalidBody',
            'Check the code you scanned. It should end with the product’s trace number.'
          )}
        />
      </Shell>
    );
  }

  if (query.isPending) {
    return (
      <Shell tr={tr}>
        <div className="space-y-4" data-testid="trace-loading">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </Shell>
    );
  }

  if (query.isError) {
    const error = normalizeApiError(query.error);

    if (error.status === 404) {
      return (
        <Shell tr={tr}>
          <EmptyState
            title={tr('trace.notFoundTitle', 'We could not verify this product')}
            description={tr(
              'trace.notFoundBody',
              'The code may have been mistyped, or the product may not be registered yet. Check the code on the label.'
            )}
            action={
              <Link to="/" className="text-sm font-medium text-primary hover:underline">
                {tr('trace.backHome', 'Back to OmoBridge')}
              </Link>
            }
          />
        </Shell>
      );
    }

    return (
      <Shell tr={tr}>
        <Card className="p-5 space-y-4" data-testid="trace-error">
          <div className="flex items-start gap-3">
            {error.isNetworkError || !isOnline ? (
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {tr('trace.unavailableTitle', 'Traceability is unavailable right now')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tr(
                  'trace.unavailableBody',
                  'We could not reach the traceability service. Please try again shortly.'
                )}
              </p>
            </div>
          </div>
          <Button onClick={() => void query.refetch()} data-testid="trace-retry">
            {tr('trace.retry', 'Try again')}
          </Button>
        </Card>
      </Shell>
    );
  }

  // Pending and error are both handled above, so this only narrows the type.
  const trace = query.data;
  if (!trace) return null;

  const heading = originHeading(trace);
  const origins = dedupeOrigins(trace.farmerOrigins ?? []);
  const outputs = trace.outputs ?? [];
  const showNames = hasAnyFarmerName(trace);
  const processingDate = trace.processingDate ? new Date(trace.processingDate) : null;

  return (
    <Shell tr={tr}>
      <div className="space-y-4" data-testid="public-trace-page">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {tr('trace.title', 'Product origin & traceability')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr('trace.subtitle', 'Verified batch lineage from South Omo smallholders.')}
          </p>
        </div>

        {/* Origin ---------------------------------------------------- */}
        <Card className="p-4 sm:p-5 space-y-3" data-testid="trace-origin">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {tr('trace.originLabel', 'Origin')}
              </span>
              {heading ? (
                <p className="text-lg font-semibold text-foreground break-words">{heading}</p>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="trace-origin-missing">
                  {tr('trace.originMissing', 'The producer has not recorded an origin for this batch.')}
                </p>
              )}
              {trace.originLabel && trace.originLabel !== heading && (
                <p className="text-sm text-muted-foreground break-words">{trace.originLabel}</p>
              )}
              {trace.enterpriseName && (
                <p className="text-sm text-muted-foreground break-words">{trace.enterpriseName}</p>
              )}
            </div>
          </div>

          {processingDate && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="trace-processing-date">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tr('trace.processedOn', 'Processed')} {formatDateTime(processingDate, 'dateOnly')}
            </p>
          )}

          {trace.batchCode && (
            <p className="text-xs text-muted-foreground font-mono break-all">
              {tr('trace.batchCode', 'Batch')} {trace.batchCode}
            </p>
          )}
        </Card>

        {/* Story ------------------------------------------------------ */}
        {trace.publicStory && (
          <Card className="p-4 sm:p-5" data-testid="trace-story">
            <div className="flex items-start gap-3">
              <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 space-y-2">
                <h2 className="text-base font-semibold text-foreground">
                  {tr('trace.storyTitle', 'The story behind this batch')}
                </h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
                  {trace.publicStory}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Who grew it ------------------------------------------------ */}
        {origins.length > 0 && (
          <Card className="p-4 sm:p-5" data-testid="trace-farmers">
            <h2 className="text-base font-semibold text-foreground mb-3">
              {tr('trace.farmersTitle', 'Who grew this')}
            </h2>

            {/* A consent notice is only useful when something is being withheld. */}
            {!showNames && (
              <p className="mb-3 text-xs text-muted-foreground" data-testid="trace-names-withheld">
                {tr(
                  'trace.namesWithheld',
                  'The growers of this batch have chosen not to publish their names.'
                )}
              </p>
            )}

            <ul className="space-y-3">
              {origins.map((origin, index) => (
                <li
                  key={`${ORIGIN_KEY(origin)}-${index}`}
                  className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-0.5">
                    {originGroupLabel(origin) && (
                      <p className="text-sm font-medium text-foreground break-words">
                        {originGroupLabel(origin)}
                      </p>
                    )}
                    {origin.village && originGroupLabel(origin) !== origin.village && (
                      <p className="text-sm text-muted-foreground break-words">{origin.village}</p>
                    )}
                  </div>

                  {/* A name is shown only because the API sent one — see the note at the top
                      of this file. It is never derived from the group or the village. */}
                  {hasFarmerName(origin) && (
                    <span className="shrink-0 text-sm text-foreground" data-testid="trace-farmer-name">
                      {origin.farmerName}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* What it became ---------------------------------------------- */}
        {outputs.length > 0 && (
          <Card className="p-4 sm:p-5" data-testid="trace-outputs">
            <h2 className="text-base font-semibold text-foreground mb-3">
              {tr('trace.outputsTitle', 'What this batch became')}
            </h2>
            <ul className="space-y-2">
              {outputs.map((output, index) => (
                <li
                  key={`${output.productName ?? 'item'}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 min-w-0 text-foreground">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="break-words">{output.productName ?? '—'}</span>
                    {output.grade && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {output.grade}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">{formatOutputQuantity(output)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {typeof trace.scanCount === 'number' && trace.scanCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="trace-scan-count">
            <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
            {tr('trace.scanCount', '{{count}} verifications').replace(
              '{{count}}',
              String(trace.scanCount)
            )}
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({
  children,
  tr,
}: {
  children: React.ReactNode;
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      {children}
      <p className="mt-8 text-xs text-muted-foreground">{tr('trace.poweredBy', 'Powered by OmoBridge')}</p>
    </main>
  );
}
