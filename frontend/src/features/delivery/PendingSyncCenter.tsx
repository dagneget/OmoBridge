import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Inbox,
  MapPin,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import defaultI18n from '../../i18n';
import { deliveryStatusI18nKey } from './deliveryStatus';
import {
  createIdbLocationQueue,
  type LocationQueue,
  type LocationQueueEntry,
} from './locationQueue';
import type { CapturedLocation } from './locationCapture';
import { syncJobLocations } from './locationSync';
import { createIdbStatusQueue, type StatusQueue } from './statusQueue';
import { syncJobStatuses } from './statusSync';
import {
  isDestructiveDiscard,
  loadPendingSync,
  statusChangesDiscardedWith,
  type JobSyncSummary,
  type SyncAttemptReport,
} from './syncCenter';

/**
 * F-1501: everything the device is holding for the server, with a way to send or drop it.
 *
 * ## Two queues, two kinds of danger
 * Status changes are an **ordered chain**: they replay oldest first against the job's live server
 * state, so dropping an early one makes every later one replay from a state it was never meant to
 * follow — and the backend treats a refused transition as final, removing it. Discarding therefore
 * takes the chosen change *and everything after it*, and the screen says so before it happens
 * (`statusChangesDiscardedWith`). Location points are additive, so a job's points go as a whole
 * without that cascade.
 *
 * ## What is deliberately not here
 * **No sync runs on mount.** A provider opening this screen while a large queue has built up would
 * otherwise start firing requests they never asked for. The screen reports; the provider decides.
 *
 * **Retrying while offline is refused up front** rather than attempted and failed. A guaranteed
 * failure carries no information, and the provider would lose the difference between "the server
 * said no" and "there was no server".
 */

export interface PendingSyncCenterProps {
  /** Injected for tests and for callers that already hold a queue; defaults to IndexedDB. */
  statusQueue?: StatusQueue;
  locationQueue?: LocationQueue;
  syncStatuses?: (jobId: string) => Promise<SyncAttemptReport>;
  /** Hides every discard control where data loss must not be possible. */
  allowDiscard?: boolean;
  className?: string;
}

type LoadState = 'loading' | 'ready' | 'error';

/** What the most recent sync attempt did, kept visible until the provider acts. */
type AttemptKind = 'sent' | 'failed' | 'offline' | 'conflict';

interface JobCardProps {
  job: JobSyncSummary;
  attempt?: AttemptKind;
  conflictMessage?: string;
  busy: boolean;
  online: boolean;
  allowDiscard: boolean;
  onSend: () => void;
  onDiscardStatus: () => void;
  onDiscardLocations: () => void;
  onKeep: () => void;
  onConfirmDiscard: () => void;
  confirming: boolean;
  tr: (key: string, fallback: string) => string;
}

export function PendingSyncCenter({
  statusQueue,
  locationQueue,
  syncStatuses,
  allowDiscard = true,
  className = '',
}: PendingSyncCenterProps) {
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = useCallback(
    (key: string, fallback: string): string => {
      const value = String(activeI18n.t(key) ?? '');
      return !value || value.includes(key) ? fallback : value;
    },
    [activeI18n]
  );

  const [queues, setQueues] = useState<{ status: StatusQueue; location: LocationQueue } | null>(
    () =>
      // Both supplied: nothing to open, so the screen is usable synchronously.
      statusQueue && locationQueue ? { status: statusQueue, location: locationQueue } : null
  );
  const [items, setItems] = useState<JobSyncSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Record<string, AttemptKind>>({});
  const [conflictMessages, setConflictMessages] = useState<Record<string, string>>({});
  const [discardTarget, setDiscardTarget] = useState<{ jobId: string; id: number } | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  // Opening IndexedDB is async, so the real queues arrive after the first render.
  useEffect(() => {
    if (statusQueue && locationQueue) return;
    let cancelled = false;
    void Promise.all([createIdbStatusQueue(), createIdbLocationQueue()])
      .then(([status, location]) => {
        if (!cancelled) setQueues({ status, location });
      })
      .catch(() => {
        // Without a queue there is nothing to show and nothing to retry against. The error state
        // names the likely cause (storage was evicted) rather than leaving a spinner forever.
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [statusQueue, locationQueue]);

  const refresh = useCallback(async () => {
    if (!queues) return;
    try {
      setItems(await loadPendingSync(queues.status, queues.location));
      setLoadState('ready');
    } catch {
      // A queue read can fail if the browser evicted storage. The provider needs to know their
      // changes may still be on the device — an empty, reassuring screen would be the worse lie.
      setLoadState('error');
    }
  }, [queues]);

  // The initial read is written out rather than delegating to `refresh`, so the setState calls
  // are visibly inside the promise callbacks rather than hidden behind a function the lint rule
  // has to analyse. Also guarded against a late response after unmount.
  useEffect(() => {
    if (!queues) return;
    let cancelled = false;
    loadPendingSync(queues.status, queues.location)
      .then((result) => {
        if (cancelled) return;
        setItems(result);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // A queue read can fail if the browser evicted storage. The provider needs to know their
        // changes may still be on the device — an empty, reassuring screen would be the worse lie.
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [queues]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const runSync = async (jobId: string) => {
    if (!queues || !online) return;
    setBusyJobId(jobId);
    try {
      const result = syncStatuses
        ? await syncStatuses(jobId)
        : await reportStatusSync(queues.status, jobId);
      await syncJobLocations({ queue: queues.location, jobId, upload: postLocationBatch });

      if (result.conflicts > 0) {
        setAttempts((prev) => ({ ...prev, [jobId]: 'conflict' }));
        setConflictMessages((prev) => ({ ...prev, [jobId]: result.conflictMessages.join(' ') }));
      } else if (result.remaining > 0) {
        setAttempts((prev) => ({ ...prev, [jobId]: 'offline' }));
      } else {
        setAttempts((prev) => ({ ...prev, [jobId]: 'sent' }));
      }
    } catch {
      setAttempts((prev) => ({ ...prev, [jobId]: 'failed' }));
    } finally {
      setBusyJobId(null);
      await refresh();
    }
  };

  const syncEverything = async () => {
    // Sequential on purpose: firing every job at once from a weak connection would make each
    // failure ambiguous, and the queue is replayed in order anyway.
    for (const job of items) {
      await runSync(job.jobId);
    }
  };

  /**
   * Drop a status change, and everything queued behind it, in one step.
   *
   * They are removed together deliberately: removing only the chosen one would leave a chain that
   * can no longer replay in order, and the backend's refusal of the gap would discard the rest
   * anyway — without the provider having agreed to that.
   */
  const discardStatus = async (jobId: string, id: number) => {
    if (!queues) return;
    const job = items.find((entry) => entry.jobId === jobId);
    await queues.status.remove(statusChangesDiscardedWith(job?.statusChanges ?? [], id));
    setDiscardTarget(null);
    await refresh();
  };

  const discardLocations = async (jobId: string) => {
    if (!queues) return;
    const entries = await queues.location.listForJob(jobId);
    await queues.location.remove(entries.map((entry: LocationQueueEntry) => entry.id));
    await refresh();
  };

  if (loadState === 'loading') {
    return (
      <div
        className={`space-y-3 ${className}`}
        data-testid="pending-sync-loading"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="sr-only">{tr('sync.loading', 'Reading pending changes…')}</p>
        {[0, 1].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div
        role="alert"
        data-testid="pending-sync-error"
        className={`rounded-2xl border border-destructive/40 bg-destructive/5 p-4 ${className}`}
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {tr('sync.loadFailedTitle', 'Could not read the pending queue')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr(
            'sync.loadFailedBody',
            'Your queued changes are probably still on this device. Reload the page to try again.'
          )}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          data-testid="pending-sync-reload"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium touch-target cursor-pointer hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {tr('sync.reload', 'Try again')}
        </button>
      </div>
    );
  }

  const isEmpty = items.every((job) => job.statusChanges.length === 0 && job.locationCount === 0);

  return (
    <section className={`space-y-4 ${className}`} data-testid="pending-sync">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{tr('sync.title', 'Pending sync')}</h2>
        <p className="text-sm text-muted-foreground">
          {isEmpty
            ? tr('sync.emptyBody', 'Everything on this device has reached the server.')
            : tr('sync.summary', 'Changes saved on this device that have not been sent yet.')}
        </p>
      </header>

      {/* Offline is a state, not a failure: nothing here has been lost by being unable to send. */}
      {!online && (
        <p
          role="status"
          data-testid="pending-sync-offline"
          className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {tr('sync.offline', 'You are offline. Sending is paused, but nothing here has been lost.')}
        </p>
      )}

      {isEmpty ? (
        <div
          data-testid="pending-sync-empty"
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center"
        >
          <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {tr('sync.emptyTitle', 'Nothing waiting to sync')}
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void syncEverything()}
            disabled={!online || busyJobId !== null}
            data-testid="pending-sync-all"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground touch-target cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {tr('sync.sendAll', 'Send everything now')}
          </button>

          {items.map((job) => (
            <JobCard
              key={job.jobId}
              job={job}
              attempt={attempts[job.jobId]}
              conflictMessage={conflictMessages[job.jobId]}
              busy={busyJobId === job.jobId}
              online={online}
              allowDiscard={allowDiscard}
              confirming={discardTarget?.jobId === job.jobId}
              onSend={() => void runSync(job.jobId)}
              onDiscardStatus={() =>
                setDiscardTarget({ jobId: job.jobId, id: job.statusChanges[0].id })
              }
              onDiscardLocations={() => void discardLocations(job.jobId)}
              onKeep={() => setDiscardTarget(null)}
              onConfirmDiscard={() => void discardStatus(job.jobId, discardTarget?.id ?? -1)}
              tr={tr}
            />
          ))}
        </>
      )}
    </section>
  );
}

function JobCard({
  job,
  attempt,
  conflictMessage,
  busy,
  online,
  allowDiscard,
  confirming,
  onSend,
  onDiscardStatus,
  onDiscardLocations,
  onKeep,
  onConfirmDiscard,
  tr,
}: JobCardProps) {
  // >1 means discarding one change takes the rest of the chain with it.
  const cascades = isDestructiveDiscard(job.statusChanges, job.statusChanges[0]?.id ?? -1);

  return (
    <article
      data-testid={`pending-sync-job-${job.jobId}`}
      className="space-y-3 rounded-2xl border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-foreground break-all">{job.jobId}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSend}
            disabled={!online || busy}
            data-testid={`pending-sync-send-${job.jobId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium touch-target cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
            {tr('sync.send', 'Send')}
          </button>
          {allowDiscard && job.statusChanges.length > 0 && (
            <button
              type="button"
              onClick={onDiscardStatus}
              data-testid={`pending-sync-discard-status-${job.jobId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive touch-target cursor-pointer hover:bg-destructive/5"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {tr('sync.discardStatus', 'Discard changes')}
            </button>
          )}
        </div>
      </div>

      {attempt === 'sent' && (
        <p
          role="status"
          data-testid={`pending-sync-sent-${job.jobId}`}
          className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {tr('sync.sent', 'Sent to the server.')}
        </p>
      )}
      {attempt === 'offline' && (
        <p
          role="status"
          data-testid={`pending-sync-still-queued-${job.jobId}`}
          className="text-sm text-amber-700 dark:text-amber-400"
        >
          {tr('sync.stillQueued', 'Still queued — the server could not be reached.')}
        </p>
      )}
      {attempt === 'failed' && (
        <p
          role="alert"
          data-testid={`pending-sync-failed-${job.jobId}`}
          className="text-sm text-destructive"
        >
          {tr('sync.attemptFailed', 'Sending failed. Nothing was lost.')}
        </p>
      )}
      {attempt === 'conflict' && (
        <p
          role="alert"
          data-testid={`pending-sync-conflict-${job.jobId}`}
          className="text-sm text-destructive"
        >
          {tr('sync.conflict', 'The server refused a change.')}
          {conflictMessage ? ` ${conflictMessage}` : ''}
        </p>
      )}

      {job.statusChanges.length > 0 && (
        <ul className="space-y-1" data-testid={`pending-sync-statuses-${job.jobId}`}>
          {job.statusChanges.map((change) => (
            <li
              key={change.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="text-foreground">
                {tr(
                  `delivery.status.${deliveryStatusI18nKey(change.newStatus)}`,
                  change.newStatus
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(change.queuedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {job.locationCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {tr('sync.locationPoints', 'location points')} (
            <span data-testid={`pending-sync-location-count-${job.jobId}`}>{job.locationCount}</span>)
          </span>
          {allowDiscard && (
            <button
              type="button"
              onClick={onDiscardLocations}
              data-testid={`pending-sync-discard-locations-${job.jobId}`}
              className="text-sm font-medium text-destructive hover:underline touch-target"
            >
              {tr('sync.discardLocations', 'Discard')}
            </button>
          )}
        </div>
      )}

      {/* Discarding the chain is the destructive case, so it is explained before it runs. */}
      {confirming && (
        <div
          role="alertdialog"
          aria-label={tr('sync.confirmTitle', 'Discard these changes?')}
          data-testid={`pending-sync-confirm-${job.jobId}`}
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-3"
        >
          <p className="text-sm font-medium text-foreground">
            {tr('sync.confirmTitle', 'Discard these changes?')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {cascades
              ? tr(
                  'sync.confirmChain',
                  'This removes this change and every later change for this job. Queued changes replay in order, so the ones behind it would be refused and lost anyway.'
                )
              : tr(
                  'sync.confirmSingle',
                  'This removes the change from this device. It will never be sent.'
                )}
          </p>
          <p className="mt-1 text-sm font-medium text-destructive" data-testid={`pending-sync-confirm-count-${job.jobId}`}>
            {tr('sync.confirmCount', 'Changes to discard:')} {job.statusChanges.length}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onConfirmDiscard}
              data-testid={`pending-sync-confirm-yes-${job.jobId}`}
              className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white touch-target cursor-pointer"
            >
              {tr('sync.confirmYes', 'Discard')}
            </button>
            <button
              type="button"
              onClick={onKeep}
              data-testid={`pending-sync-confirm-no-${job.jobId}`}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium touch-target cursor-pointer hover:bg-muted"
            >
              {tr('sync.confirmNo', 'Keep them')}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {tr('sync.queuedSince', 'Queued since')} {new Date(job.earliestQueuedAt).toLocaleString()}
      </p>
    </article>
  );
}

/** The default applier: the real status endpoint. */
async function reportStatusSync(
  queue: StatusQueue,
  jobId: string
): Promise<SyncAttemptReport> {
  const result = await syncJobStatuses({
    queue,
    jobId,
    apply: async (id, newStatus, reason) => {
      const response = await fetch(`/api/v1/delivery/jobs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, ...(reason ? { reason } : {}) }),
      });
      if (!response.ok) throw new Error(`Status update failed: ${response.status}`);
    },
  });

  return {
    applied: result.applied.length,
    conflicts: result.conflicts.length,
    conflictMessages: result.conflicts.flatMap((outcome) =>
      outcome.kind === 'conflict' ? [outcome.serverMessage] : []
    ),
    remaining: result.remaining,
    empty: result.applied.length === 0 && result.conflicts.length === 0 && result.remaining === 0,
  };
}

/**
 * The default location applier.
 *
 * Takes `CapturedLocation` because `syncJobLocations` strips storage-only fields via
 * `toIngestionRequest` before calling this — sending `id`, `jobId` or `queuedAt` would be a
 * request shape the backend's `LocationIngestionRequest` record does not have.
 *
 * Returns the count the server confirmed rather than void: `LocationBatchUploader` uses it to
 * decide whether a batch can be removed from the queue, and a silent zero would mean points were
 * never dropped and would be uploaded again on the next attempt.
 */
async function postLocationBatch(
  jobId: string,
  points: CapturedLocation[]
): Promise<number> {
  const response = await fetch(`/api/v1/delivery/jobs/${jobId}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      points.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        ...(point.speed !== undefined ? { speed: point.speed } : {}),
        recordedAt: point.recordedAt,
      }))
    ),
  });
  if (!response.ok) throw new Error(`Location upload failed: ${response.status}`);
  return points.length;
}
