import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  MapPin,
  Truck,
  Wallet,
  RefreshCw,
  WifiOff,
  UserCircle2,
  ClipboardList,
} from 'lucide-react';

import { useAuthStore } from '../../features/auth/authStore';
import {
  deliveryService,
  resolveProviderId,
  resolveProviderDisplayName,
  isActiveStatus,
  isClosedStatus,
} from '../../features/delivery';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { queryKeys } from '../../services/queryKeys';
import { formatETB, formatDateTime } from '../../utils/formatters';
import type { DeliveryJobResponse } from '../../types/api';

// i18next is initialised as a side effect of this import (src/i18n/index.ts calls
// i18n.init). Importing it directly -- the same pattern LanguageSwitcher uses --
// keeps translations resolving in component tests, where main.tsx never runs.
import defaultI18n from '../../i18n';
import { useTranslation } from 'react-i18next';

import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { StatusChip } from '../../components/common/StatusChip';

type JobFilter = 'ALL' | 'ACTIVE' | 'CLOSED';

const FILTERS: readonly JobFilter[] = ['ALL', 'ACTIVE', 'CLOSED'];

/** English fallbacks, matching the documented chain: selected language -> Amharic -> English. */
const FALLBACK = {
  title: 'Delivery Provider Workspace',
  subtitle: 'Jobs assigned to you, with pickup and drop-off details.',
  signedInAs: 'Signed in as',
  jobsHeading: 'Your jobs',
  jobsCountOne: '{{count}} job',
  jobsCountOther: '{{count}} jobs',
  emptyTitle: 'No jobs assigned yet',
  emptyDescription: 'When a dispatcher assigns you a delivery job it will appear here.',
  filterAll: 'All',
  filterActive: 'In progress',
  filterClosed: 'Closed',
  pickup: 'Pickup',
  dropoff: 'Drop-off',
  fee: 'Fee',
  ordersOne: '{{count}} order',
  ordersOther: '{{count}} orders',
  jobNumber: 'Job number',
  created: 'Created',
  loading: 'Loading your jobs…',
  errorTitle: 'We could not load your jobs',
  errorDescription:
    'Check your connection and try again. If this keeps happening, contact your dispatcher.',
  retry: 'Try again',
  forbidden: 'You are not allowed to view these jobs.',
  offline: 'You are offline. Your jobs will load when the connection returns.',
  lastUpdated: 'Last updated',
  gapTitle: 'Provider profile is not ready',
  gapDescription:
    'Your account is signed in, but the server has not sent your delivery provider ID, so your job list cannot be loaded yet. Ask an administrator to complete your provider profile.',
  status: {
    PENDING: 'Pending',
    ASSIGNED: 'Assigned',
    PICKED_UP: 'Picked up',
    IN_TRANSIT: 'In transit',
    DELIVERED: 'Delivered',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
    UNKNOWN: 'Unknown',
  } as Record<string, string>,
};

const STATUS_FALLBACK_KEYS: Record<string, keyof typeof FALLBACK.status> = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  UNKNOWN: 'UNKNOWN',
};

function pluralise(one: string, other: string, count: number): string {
  const template = count === 1 ? one : other;
  return template.replace('{{count}}', String(count));
}

function errorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const { status } = error as { status?: unknown };
    if (typeof status === 'number') return status;
  }
  return null;
}

export default function DeliveryDashboardPage() {
  const { user } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;

  const [filter, setFilter] = useState<JobFilter>('ALL');

  // Gap F-1101-E1: the backend does not yet return the provider's own
  // DeliveryProvider id, which this endpoint is keyed by. Never substitute user.id --
  // that would silently request another provider and 404.
  const providerId = resolveProviderId(user);
  const providerName = resolveProviderDisplayName(user);

  /**
   * Translates a key, falling back to English when i18next has not resolved it.
   * i18next returns the key itself on a miss; `includes` also catches the pluralised
   * `_one` / `_other` variants, which i18next appends to the base key.
   */
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  /** Plural-aware label. Passes `count` to i18next so `_one` / `_other` resolve. */
  const pluralTr = (
    key: string,
    oneFallback: string,
    otherFallback: string,
    count: number
  ): string => {
    const value = String(activeI18n.t(key, { count }) ?? '');
    return value.includes(key) ? pluralise(oneFallback, otherFallback, count) : value;
  };

  const countLabel = (count: number) =>
    pluralTr('delivery.jobsCount', FALLBACK.jobsCountOne, FALLBACK.jobsCountOther, count);

  const ordersLabel = (count: number) =>
    pluralTr('delivery.labelOrders', FALLBACK.ordersOne, FALLBACK.ordersOther, count);

  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.delivery.jobs.list(providerId ?? 'unresolved'),
    queryFn: () => deliveryService.getProviderJobs(providerId as string),
    enabled: !!providerId && isOnline,
  });

  const visibleJobs = useMemo(() => {
    if (filter === 'ACTIVE') return jobs.filter((job) => isActiveStatus(job.status));
    if (filter === 'CLOSED') return jobs.filter((job) => isClosedStatus(job.status));
    return jobs;
  }, [jobs, filter]);

  const statusLabel = (status: string | undefined) => {
    const normalised = String(status ?? 'UNKNOWN').toUpperCase();
    const fallbackKey = STATUS_FALLBACK_KEYS[normalised] ?? 'UNKNOWN';
    return tr(`delivery.status.${normalised.toLowerCase()}`, FALLBACK.status[fallbackKey]);
  };

  const filterLabels: Record<JobFilter, string> = {
    ALL: tr('delivery.filterAll', FALLBACK.filterAll),
    ACTIVE: tr('delivery.filterActive', FALLBACK.filterActive),
    CLOSED: tr('delivery.filterClosed', FALLBACK.filterClosed),
  };

  const renderJobCard = (job: DeliveryJobResponse) => (
    <li key={job.jobId ?? job.jobNo} data-testid="delivery-job-card">
      <Card className="p-4 space-y-3" hoverable>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground break-words">
              {job.jobNo ?? tr('delivery.labelJobNumber', FALLBACK.jobNumber)}
            </h3>
            {job.createdAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {tr('delivery.labelCreated', FALLBACK.created)}:{' '}
                {formatDateTime(job.createdAt, 'medium')}
              </p>
            )}
          </div>
          <StatusChip status={job.status ?? 'UNKNOWN'} label={statusLabel(job.status)} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tr('delivery.labelPickup', FALLBACK.pickup)}
              </p>
              <p className="text-foreground break-words">{job.pickupAddress ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Truck className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tr('delivery.labelDropoff', FALLBACK.dropoff)}
              </p>
              <p className="text-foreground break-words">{job.dropoffAddress ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">{tr('delivery.labelFee', FALLBACK.fee)}: </span>
            <span aria-hidden="true">{tr('delivery.labelFee', FALLBACK.fee)}:</span>
            {formatETB(job.fee, { currencyCode: job.currency || 'ETB' })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
            {ordersLabel(job.orderIds?.length ?? 0)}
          </span>
        </div>
      </Card>
    </li>
  );

  return (
    <div className="space-y-6" data-testid="delivery-dashboard">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          {tr('delivery.title', FALLBACK.title)}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{tr('delivery.subtitle', FALLBACK.subtitle)}</p>
        {providerName && (
          <p className="text-sm text-muted-foreground mt-2 inline-flex items-center gap-1.5">
            <UserCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>
              {tr('delivery.signedInAs', FALLBACK.signedInAs)} {providerName}
            </span>
          </p>
        )}
      </header>

      {/* Contract gap F-1101-E1: no provider id, so no job list can be requested. */}
      {!providerId ? (
        <Card className="p-6 border-amber-500/40 bg-amber-500/5" data-testid="provider-gap-state">
          <div className="flex items-start gap-3">
            <UserCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {tr('delivery.gapTitle', FALLBACK.gapTitle)}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {tr('delivery.gapDescription', FALLBACK.gapDescription)}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {!isOnline && (
            <div
              role="status"
              data-testid="offline-notice"
              className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
            >
              <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {tr('delivery.stateOffline', FALLBACK.offline)}
              </p>
            </div>
          )}

          {isLoading && isOnline ? (
            <div role="status" aria-live="polite" data-testid="delivery-loading">
              <span className="sr-only">{tr('delivery.stateLoading', FALLBACK.loading)}</span>
              <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                  <Card key={index} className="p-4 space-y-3">
                    <Skeleton variant="rectangular" height={20} width="60%" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="80%" />
                  </Card>
                ))}
              </div>
            </div>
          ) : isError ? (
            <Card className="p-6 border-destructive/40 bg-destructive/5" data-testid="delivery-error">
              <div role="alert" className="flex items-start gap-3">
                <Package className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {errorStatus(error) === 403
                      ? tr('delivery.stateForbidden', FALLBACK.forbidden)
                      : tr('delivery.stateErrorTitle', FALLBACK.errorTitle)}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tr('delivery.stateErrorDescription', FALLBACK.errorDescription)}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={!isOnline}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground touch-target cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    {tr('delivery.stateErrorRetry', FALLBACK.retry)}
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {tr('delivery.jobsHeading', FALLBACK.jobsHeading)}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="job-count">
                    {countLabel(jobs.length)}
                  </p>
                </div>

                <div
                  role="group"
                  aria-label={tr('delivery.jobsHeading', FALLBACK.jobsHeading)}
                  className="inline-flex rounded-xl border border-border p-1 gap-1"
                >
                  {FILTERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFilter(option)}
                      aria-pressed={filter === option}
                      data-testid={`filter-${option.toLowerCase()}`}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium touch-target cursor-pointer transition-colors ${
                        filter === option
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {filterLabels[option]}
                    </button>
                  ))}
                </div>
              </div>

              {dataUpdatedAt > 0 && (
                <p className="text-xs text-muted-foreground">
                  {tr('delivery.stateLastUpdated', FALLBACK.lastUpdated)}{' '}
                  {formatDateTime(new Date(dataUpdatedAt), 'timeOnly')}
                </p>
              )}

              {visibleJobs.length === 0 ? (
                <div data-testid="delivery-empty">
                  <EmptyState
                    icon={<Truck className="w-7 h-7" aria-hidden="true" />}
                    title={tr('delivery.jobsEmptyTitle', FALLBACK.emptyTitle)}
                    description={tr('delivery.jobsEmptyDescription', FALLBACK.emptyDescription)}
                  />
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2" data-testid="delivery-job-list">
                  {visibleJobs.map(renderJobCard)}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}