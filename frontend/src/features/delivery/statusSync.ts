import { sortStatusChanges, type QueuedStatusChange, type StatusQueue } from './statusQueue';
import type { DeliveryJobStatus } from './deliveryStatus';

/** Applies one queued change. Throws if the server refuses it. */
export type StatusChangeApplier = (
  jobId: string,
  newStatus: DeliveryJobStatus,
  reason?: string
) => Promise<void>;

export type StatusReplayOutcome =
  | { kind: 'applied'; id: number; newStatus: DeliveryJobStatus }
  /**
   * The server refused the change. The provider must be told what the job actually is now,
   * because their device has been acting on a stale view — typically a dispatcher or the SMS
   * checkpoint fallback moved the job while this device was offline.
   */
  | {
      kind: 'conflict';
      id: number;
      attempted: DeliveryJobStatus;
      serverMessage: string;
    };

export interface StatusSyncResult {
  applied: StatusReplayOutcome[];
  conflicts: StatusReplayOutcome[];
  /** Changes left queued because the device is offline or the request failed outright. */
  remaining: number;
}

export interface SyncJobStatusesOptions {
  queue: StatusQueue;
  jobId: string;
  apply: StatusChangeApplier;
  /** Pulls the server's current state so a conflict can be shown against reality. */
  refreshJob?: () => Promise<void>;
}

/**
 * Replay a job's queued status changes oldest first.
 *
 * Ordering matters: the backend only accepts a transition that is legal from the job's *current*
 * state, so an out-of-order replay would reject changes that were genuinely valid when made.
 *
 * A rejected change is **removed, not retried**. It can never become valid later — the job only
 * moves forward, so a refused transition stays refused. Keeping it would block every later change
 * behind it. The provider is shown the server's message instead.
 *
 * A transport failure (offline, timeout) is different: that change is kept, because it may still
 * be valid when the connection returns.
 */
export async function syncJobStatuses({
  queue,
  jobId,
  apply,
  refreshJob,
}: SyncJobStatusesOptions): Promise<StatusSyncResult> {
  const applied: StatusReplayOutcome[] = [];
  const conflicts: StatusReplayOutcome[] = [];

  const pending = sortStatusChanges(await queue.listForJob(jobId));

  for (const change of pending as QueuedStatusChange[]) {
    try {
      await apply(jobId, change.newStatus, change.reason);
    } catch (error) {
      const message = extractServerMessage(error);

      // A rejection means the server understood and refused; a transport failure did not.
      if (isRejection(error)) {
        await queue.remove([change.id]);
        conflicts.push({
          kind: 'conflict',
          id: change.id,
          attempted: change.newStatus,
          serverMessage: message,
        });
        // Re-read the job so the conflict can be shown against the server's current state.
        await refreshJob?.();
        continue;
      }

      // Still offline or the server is unreachable: keep it for the next attempt and stop,
      // because later changes depend on this one having landed first.
      return { applied, conflicts, remaining: await queue.count(jobId) };
    }

    await queue.remove([change.id]);
    applied.push({ kind: 'applied', id: change.id, newStatus: change.newStatus });
  }

  return { applied, conflicts, remaining: await queue.count(jobId) };
}

export async function syncAllJobStatuses(
  queue: StatusQueue,
  apply: StatusChangeApplier,
  refreshJob?: () => Promise<void>
): Promise<Record<string, StatusSyncResult>> {
  const results: Record<string, StatusSyncResult> = {};
  for (const jobId of await queue.jobIds()) {
    results[jobId] = await syncJobStatuses({ queue, jobId, apply, refreshJob });
  }
  return results;
}

function isRejection(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const { status } = error as { status?: unknown };
    // A response came back, so the server had an opinion. 0 means no response at all.
    if (typeof status === 'number') return status >= 400;
  }
  return false;
}

function extractServerMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return 'The server rejected this change.';
}