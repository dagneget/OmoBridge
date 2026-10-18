import { sortStatusChanges, type QueuedStatusChange, type StatusQueue } from './statusQueue';
import type { LocationQueue, LocationQueueEntry } from './locationQueue';

/**
 * F-1501: what the pending-sync screen shows, kept out of React so the rules around it can be
 * tested on their own.
 *
 * There are two queues with genuinely different characters, and the screen has to respect both:
 *
 * - **Status changes are an ordered chain.** `syncJobStatuses` replays them oldest first against
 *   the job's *current* server state, because the backend only accepts a transition that is legal
 *   from where the job actually is. That is what makes discarding one of them dangerous — see
 *   `statusChangesDiscardedWith`.
 * - **Location points are additive.** Each is an independent fix; dropping one loses a bit of the
 *   drawn route but cannot invalidate any other.
 */

/** Everything queued for one job, in the order it must be replayed. */
export interface JobSyncSummary {
  jobId: string;
  /** Status changes, oldest first. Empty when this job has only location points queued. */
  statusChanges: QueuedStatusChange[];
  /** How many location fixes are queued. Points are shown as a count — a job offline for an hour
   *  queues thousands, and listing them individually would make the screen unusable. */
  locationCount: number;
  /** When the oldest thing for this job was queued, used to order the job list. */
  earliestQueuedAt: string;
}

/**
 * Fold both queues into one per-job view, oldest job first.
 *
 * Jobs are ordered by their oldest queued item rather than by id, because "what have I been
 * sitting on longest" is the question the provider is actually asking when they open this.
 */
export function summarizeQueues(
  statusEntries: QueuedStatusChange[],
  locationEntries: LocationQueueEntry[]
): JobSyncSummary[] {
  const byJob = new Map<string, JobSyncSummary>();

  for (const change of statusEntries) {
    const summary = byJob.get(change.jobId) ?? {
      jobId: change.jobId,
      statusChanges: [],
      locationCount: 0,
      earliestQueuedAt: change.queuedAt,
    };
    summary.statusChanges.push(change);
    if (change.queuedAt < summary.earliestQueuedAt) summary.earliestQueuedAt = change.queuedAt;
    byJob.set(change.jobId, summary);
  }

  for (const point of locationEntries) {
    const summary = byJob.get(point.jobId) ?? {
      jobId: point.jobId,
      statusChanges: [],
      locationCount: 0,
      earliestQueuedAt: point.queuedAt,
    };
    summary.locationCount += 1;
    if (point.queuedAt < summary.earliestQueuedAt) summary.earliestQueuedAt = point.queuedAt;
    byJob.set(point.jobId, summary);
  }

  return [...byJob.values()]
    .map((summary) => ({ ...summary, statusChanges: sortStatusChanges(summary.statusChanges) }))
    .sort((a, b) => {
      if (a.earliestQueuedAt === b.earliestQueuedAt) return a.jobId < b.jobId ? -1 : 1;
      return a.earliestQueuedAt < b.earliestQueuedAt ? -1 : 1;
    });
}

/**
 * Every status change that has to go when one is discarded: the chosen one and **all of them
 * after it**.
 *
 * ## Why this rule exists
 * Queued changes replay in order against the job's live server state. Discarding an early change
 * leaves a later one replaying from a state it was never meant to follow — `PICKED_UP` dropped,
 * so `DELIVERED` is offered while the server still has the job `ASSIGNED`. The backend refuses
 * that as an illegal transition, and `syncJobStatuses` treats a refusal as final: it removes the
 * change and shows the provider the server's message, because a refused transition can never
 * become valid later.
 *
 * The result would be a silent loss — the provider discards one change believing the rest are
 * safe, and quietly loses the ones behind it too. So they are discarded together, visibly, at the
 * moment of the decision.
 *
 * Discarding the last change, or the only one, discards nothing extra.
 */
export function statusChangesDiscardedWith(
  entries: QueuedStatusChange[],
  discardId: number
): number[] {
  const ordered = sortStatusChanges(entries);
  const index = ordered.findIndex((entry) => entry.id === discardId);
  // Not in this list: nothing is discarded on a caller's stale copy of the queue.
  if (index === -1) return [];
  return ordered.slice(index).map((entry) => entry.id);
}

/**
 * True when discarding `discardId` would take other changes with it.
 *
 * The screen uses this to ask before acting; it is a separate function because "would this be
 * destructive" and "what exactly goes" are different questions and both need to be right.
 */
export function isDestructiveDiscard(entries: QueuedStatusChange[], discardId: number): boolean {
  return statusChangesDiscardedWith(entries, discardId).length > 1;
}

/** The result of one sync attempt, as the screen needs to report it. */
export interface SyncAttemptReport {
  applied: number;
  /** Changes the server refused. Removed from the queue by the sync itself. */
  conflicts: number;
  /**
   * The server's own words for each refusal.
   *
   * `StatusReplayOutcome` carries these because a refusal means the device has been acting on a
   * stale view — usually a dispatcher or the SMS checkpoint moved the job while it was offline.
   * The provider needs to be told what the job actually is now, so the messages are surfaced
   * rather than reduced to "an error occurred".
   */
  conflictMessages: string[];
  /** Changes still queued because the device is offline or the request failed. */
  remaining: number;
  /** True when nothing was left to send. */
  empty: boolean;
}

/** Read both queues for every job they mention. */
export async function loadPendingSync(
  statusQueue: StatusQueue,
  locationQueue: LocationQueue
): Promise<JobSyncSummary[]> {
  const [statusEntries, locationEntries] = await Promise.all([
    allStatusEntries(statusQueue),
    allLocationEntries(locationQueue),
  ]);
  return summarizeQueues(statusEntries, locationEntries);
}

/**
 * Every status entry, across all jobs.
 *
 * `StatusQueue` exposes a per-job view and a list of job ids, so a full read is those two calls
 * combined rather than a new method — the queue interface is shared with F-1105's replay code and
 * is not worth widening for a screen.
 */
async function allStatusEntries(queue: StatusQueue): Promise<QueuedStatusChange[]> {
  const jobIds = await queue.jobIds();
  const perJob = await Promise.all(jobIds.map((jobId) => queue.listForJob(jobId)));
  return perJob.flat();
}

async function allLocationEntries(queue: LocationQueue): Promise<LocationQueueEntry[]> {
  const jobIds = await queue.jobIds();
  const perJob = await Promise.all(jobIds.map((jobId) => queue.listForJob(jobId)));
  // Order does not survive into the view on purpose: only the count and the oldest `queuedAt`
  // are used, so sorting here would be work with nothing reading the result.
  return perJob.flat();
}
