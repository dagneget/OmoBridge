import {
  planBatches,
  sortQueueEntries,
  toIngestionRequest,
  type LocationQueue,
} from './locationQueue';
import type { CapturedLocation } from './locationCapture';

/** Uploads one batch and returns how many points the server actually stored. */
export type LocationBatchUploader = (
  jobId: string,
  points: CapturedLocation[]
) => Promise<number>;

export interface LocationSyncResult {
  /** Points the server confirmed it stored. */
  uploaded: number;
  /** Points discarded because the server would take none of them. */
  dropped: number;
  /** Points still queued for this job after the sync. */
  remaining: number;
  /**
   * True when the server accepted nothing for a non-empty batch, which means the job is
   * already terminal there. The queue is not retried for that job; see the note below.
   */
  jobFinishedOnServer: boolean;
}

export interface SyncJobLocationsOptions {
  queue: LocationQueue;
  jobId: string;
  upload: LocationBatchUploader;
  maxBatchSize?: number;
  /** Safety valve so a store that keeps handing back points cannot spin forever. */
  maxBatches?: number;
}

/**
 * Upload a job's queued points in device-timestamp order, a batch at a time, removing each
 * batch only after the server confirms it.
 *
 * Two server behaviours shape this:
 *
 *  1. `DeliveryService.ingestLocations` stores every point it is given and returns that count,
 *     so a batch that comes back as a non-zero count is safe to delete.
 *
 *  2. For a job that is already DELIVERED or CANCELLED it returns **0** with HTTP 200 and
 *     stores nothing -- it is not an error. Since it never dedupes, a non-zero-length batch
 *     that yields 0 can only mean the job is finished server-side. Those points are dropped
 *     and the job is marked finished, otherwise the queue would retry them forever and never
 *     drain. The frontend knows the local status too, but the server's answer wins because a
 *     job can be finished by a dispatcher or by the SMS checkpoint fallback while this device
 *     is offline.
 */
export async function syncJobLocations({
  queue,
  jobId,
  upload,
  maxBatchSize,
  maxBatches = 200,
}: SyncJobLocationsOptions): Promise<LocationSyncResult> {
  let uploaded = 0;
  let dropped = 0;
  let jobFinishedOnServer = false;

  for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
    const pending = sortQueueEntries(await queue.listForJob(jobId));
    if (pending.length === 0) break;

    const batches = planBatches(pending, maxBatchSize);
    let progressed = false;

    for (const batch of batches) {
      const ids = batch.map((entry) => entry.id);
      let stored: number;

      try {
        stored = await upload(jobId, batch.map(toIngestionRequest));
      } catch {
        // A network or server failure must not delete the points: leave them for the next
        // attempt and let the caller retry later.
        return {
          uploaded,
          dropped,
          remaining: (await queue.count(jobId)) ?? 0,
          jobFinishedOnServer,
        };
      }

      if (stored === 0) {
        // Terminal on the server. Drop this batch and stop retrying the job.
        await queue.remove(ids);
        dropped += batch.length;
        jobFinishedOnServer = true;
        progressed = false;
        break;
      }

      await queue.remove(ids);
      uploaded += batch.length;
      progressed = true;
    }

    if (jobFinishedOnServer) break;
    // Nothing moved: either the store is misbehaving or every batch was a no-op.
    if (!progressed) break;
  }

  return {
    uploaded,
    dropped,
    remaining: await queue.count(jobId),
    jobFinishedOnServer,
  };
}

/** Drain every job that has queued points. Used by the provider home and sync centre. */
export async function syncAllJobs(
  queue: LocationQueue,
  upload: LocationBatchUploader,
  maxBatchSize?: number
): Promise<Record<string, LocationSyncResult>> {
  const results: Record<string, LocationSyncResult> = {};
  for (const jobId of await queue.jobIds()) {
    results[jobId] = await syncJobLocations({ queue, jobId, upload, maxBatchSize });
  }
  return results;
}