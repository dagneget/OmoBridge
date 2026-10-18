import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Truck,
  Wallet,
  RefreshCw,
  WifiOff,
  UserCircle2,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';

import { useAuthStore } from '../../../features/auth/authStore';
import {
  deliveryService,
  resolveProviderId,
  nextStatuses,
} from '../../../features/delivery';
import type { DeliveryJobStatus } from '../../../features/delivery';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { queryKeys } from '../../../services/queryKeys';
import { normalizeApiError } from '../../../services/apiError';
import { formatETB, formatDateTime } from '../../../utils/formatters';
import type { DeliveryJobResponse } from '../../../types/api';

import defaultI18n from '../../../i18n';
import { useTranslation } from 'react-i18next';

import { Card } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { Skeleton } from '../../../components/common/Skeleton';
import { StatusChip } from '../../../components/common/StatusChip';

const FALLBACK = {
  detailTitle: 'Job {{jobNo}}',
  backToJobs: 'Back to jobs',
  currentStatus: 'Current status',
  nextSteps: 'What can you do next?',
  reasonLabel: 'Reason (optional)',
  reasonHint: 'Add a note for the dispatcher, for example a delay or an access problem.',
  actionPickedUp: 'Picked up',
  actionInTransit: 'In transit',
  actionDelivered: 'Delivered',
  actionFailed: 'Mark as failed',
  actionCancelled: 'Cancel job',
  noNextSteps: 'This job is finished. There are no further status changes.',
  updatedTo: 'Status updated to {{status}}.',
  rejectedTitle: 'The server rejected this change',
  rejectedFallback: 'The status could not be updated. The job is still {{status}}.',
  detailLoading: 'Loading job…',
  detailNotFoundTitle: 'Job not found',
  detailNotFoundDescription: 'This job is not in the list assigned to you.',
  updateBlockedOffline: 'Status changes need a connection.',
  pickup: 'Pickup',
  dropoff: 'Drop-off',
  fee: 'Fee',
  labelJobNumber: 'Job number',
  labelCreated: 'Created',
  labelPickedUpAt: 'Picked up at',
  labelDeliveredAt: 'Delivered at',
  gapTitle: 'Provider profile is not ready',
  gapDescription:
    'Your account is signed in, but the server has not sent your delivery provider ID, so this job cannot be loaded yet.',
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

const ACTION_FALLBACKS: Record<string, string> = {
  PICKED_UP: FALLBACK.actionPickedUp,
  IN_TRANSIT: FALLBACK.actionInTransit,
  DELIVERED: FALLBACK.actionDelivered,
  FAILED: FALLBACK.actionFailed,
  CANCELLED: FALLBACK.actionCancelled,
};

const ACTION_ICONS: Record<string, typeof Truck> = {
  PICKED_UP: MapPin,
  IN_TRANSIT: Truck,
  DELIVERED: Truck,
  FAILED: AlertTriangle,
  CANCELLED: AlertTriangle,
};

export default function ProviderJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;

  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState(jobId);

  const providerId = resolveProviderId(user);

  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  const interpolate = (template: string, values: Record<string, string>) =>
    Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, v), template);

  const statusLabel = (status: string | undefined) => {
    const normalised = String(status ?? 'UNKNOWN').toUpperCase();
    return tr(`delivery.status.${normalised.toLowerCase()}`, FALLBACK.status[normalised] ?? FALLBACK.status.UNKNOWN);
  };

  const {
    data: jobs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.delivery.jobs.list(providerId ?? 'unresolved'),
    queryFn: () => deliveryService.getProviderJobs(providerId as string),
    enabled: !!providerId && isOnline,
  });

  // The backend exposes no single-job GET for providers, so the job is resolved from the
  // assigned list. This also keeps "only own jobs appear" true: a job id that is not in
  // the signed-in provider's own list simply is not found.
  const job: DeliveryJobResponse | undefined = jobs?.find((candidate) => candidate.jobId === jobId);

  const mutation = useMutation({
    mutationFn: ({ status }: { status: DeliveryJobStatus }) =>
      deliveryService.updateJobStatus(jobId as string, status, reason || undefined),
    onSuccess: (updated) => {
      setReason('');
      setRejection(null);
      setNotice(
        interpolate(tr('delivery.updatedTo', FALLBACK.updatedTo), {
          status: statusLabel(updated.status),
        })
      );
      // The server's response is the authority; replace the cached job with it.
      queryClient.setQueryData<DeliveryJobResponse[]>(
        queryKeys.delivery.jobs.list(providerId ?? 'unresolved'),
        (current) =>
          current?.map((candidate) => (candidate.jobId === updated.jobId ? updated : candidate)) ?? current
      );
    },
    onError: (mutationError) => {
      setNotice(null);
      const normalized = normalizeApiError(mutationError);
      const serverMessage =
        normalized.status >= 400 && normalized.status < 600 && normalized.message
          ? normalized.message
          : null;
      setRejection(
        serverMessage?.trim()
          ? `${tr('delivery.rejectedTitle', FALLBACK.rejectedTitle)} — ${serverMessage.trim()}`
          : interpolate(tr('delivery.rejectedFallback', FALLBACK.rejectedFallback), {
              status: statusLabel(job?.status),
            })
      );
      // Re-sync so the screen reflects the server's actual state after a rejection.
      refetch();
    },
  });

  // A new job must not inherit the previous one's message or reason. Adjusting state
  // during render (the documented pattern for prop-driven resets) avoids a cascading
  // extra render that an effect would cause.
  if (jobId !== lastJobId) {
    setLastJobId(jobId);
    setReason('');
    setNotice(null);
    setRejection(null);
  }

  const available = nextStatuses(job?.status);
  const isPending = mutation.isPending;

  if (!providerId) {
    return (
      <div className="space-y-6" data-testid="delivery-job-detail">
        <Card className="p-6 border-amber-500/40 bg-amber-500/5" data-testid="provider-gap-state">
          <div className="flex items-start gap-3">
            <UserCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {tr('delivery.gapTitle', FALLBACK.gapTitle)}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {tr('delivery.gapDescription', FALLBACK.gapDescription)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="delivery-job-detail">
      <Link
        to="/dashboard/delivery"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground touch-target"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {tr('delivery.backToJobs', FALLBACK.backToJobs)}
      </Link>

      {isLoading && isOnline ? (
        <div role="status" aria-live="polite" data-testid="delivery-job-loading">
          <span className="sr-only">{tr('delivery.detailLoading', FALLBACK.detailLoading)}</span>
          <Card className="p-6 space-y-4" aria-hidden="true">
            <Skeleton variant="rectangular" height={24} width="50%" />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="75%" />
          </Card>
        </div>
      ) : !isOnline && !job ? (
        // Offline with nothing cached: say so, rather than claiming the job is missing.
        <div data-testid="offline-unavailable">
          <EmptyState
            icon={<WifiOff className="w-7 h-7" aria-hidden="true" />}
            title={tr('delivery.updateBlockedOffline', FALLBACK.updateBlockedOffline)}
            description={tr('delivery.stateOffline', 'Your jobs will load when the connection returns.')}
          />
        </div>
      ) : isError ? (
        <Card className="p-6 border-destructive/40 bg-destructive/5" data-testid="delivery-job-error">
          <div role="alert" className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="text-base font-semibold text-foreground">
                {tr('delivery.stateErrorTitle', 'We could not load this job')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {tr('delivery.stateErrorDescription', 'Check your connection and try again.')}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={!isOnline}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium touch-target cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {tr('delivery.stateErrorRetry', 'Try again')}
              </button>
            </div>
          </div>
        </Card>
      ) : !job ? (
        <div data-testid="delivery-job-not-found">
          <EmptyState
            icon={<Truck className="w-7 h-7" aria-hidden="true" />}
            title={tr('delivery.detailNotFoundTitle', FALLBACK.detailNotFoundTitle)}
            description={tr('delivery.detailNotFoundDescription', FALLBACK.detailNotFoundDescription)}
          />
        </div>
      ) : (
        <>
          <header>
            <h1 className="text-2xl font-bold text-foreground">
              {interpolate(tr('delivery.detailTitle', FALLBACK.detailTitle), {
                jobNo: job.jobNo ?? '',
              })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tr('delivery.labelJobNumber', FALLBACK.labelJobNumber)}: {job.jobNo ?? '—'}
            </p>
          </header>

          {!isOnline && (
            <div
              role="status"
              data-testid="offline-notice"
              className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
            >
              <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {tr('delivery.updateBlockedOffline', FALLBACK.updateBlockedOffline)}
              </p>
            </div>
          )}

          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tr('delivery.currentStatus', FALLBACK.currentStatus)}
              </span>
              <StatusChip status={job.status ?? 'UNKNOWN'} label={statusLabel(job.status)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                {tr('delivery.labelFee', FALLBACK.fee)}:{' '}
                {formatETB(job.fee, { currencyCode: job.currency || 'ETB' })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
                {job.orderIds?.length ?? 0}
              </span>
              {job.createdAt && (
                <span>
                  {tr('delivery.labelCreated', FALLBACK.labelCreated)}:{' '}
                  {formatDateTime(job.createdAt, 'medium')}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-6 space-y-4" data-testid="status-actions">
            <h2 className="text-base font-semibold text-foreground">
              {tr('delivery.nextSteps', FALLBACK.nextSteps)}
            </h2>

            {notice && (
              <p
                role="status"
                data-testid="status-updated-notice"
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200"
              >
                {notice}
              </p>
            )}

            {rejection && (
              <p
                role="alert"
                data-testid="status-rejected-notice"
                className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {rejection}
              </p>
            )}

            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="no-next-steps">
                {tr('delivery.noNextSteps', FALLBACK.noNextSteps)}
              </p>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="status-reason"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    {tr('delivery.reasonLabel', FALLBACK.reasonLabel)}
                  </label>
                  <textarea
                    id="status-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={tr('delivery.reasonHint', FALLBACK.reasonHint)}
                    disabled={isPending || !isOnline}
                    rows={2}
                    data-testid="status-reason"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {available.map((status) => {
                    const Icon = ACTION_ICONS[status] ?? Truck;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => mutation.mutate({ status })}
                        disabled={isPending || !isOnline}
                        data-testid={`status-action-${status.toLowerCase()}`}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium touch-target cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
                          status === 'DELIVERED'
                            ? 'bg-primary text-primary-foreground border-transparent'
                            : status === 'FAILED' || status === 'CANCELLED'
                              ? 'border-destructive/40 text-destructive hover:bg-destructive/5'
                              : 'border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {tr(`delivery.status.${status.toLowerCase()}`, ACTION_FALLBACKS[status])}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}