import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createMemoryLocationQueue,
  sortQueueEntries,
  planBatches,
  toIngestionRequest,
  MAX_LOCATION_BATCH_SIZE,
  type LocationQueue,
  type LocationQueueEntry,
} from '../features/delivery/locationQueue';
import { syncJobLocations, syncAllJobs } from '../features/delivery/locationSync';
import type { CapturedLocation } from '../features/delivery/locationCapture';

const JOB_A = 'aaaaaaaa-0000-0000-0000-0000000000a1';
const JOB_B = 'aaaaaaaa-0000-0000-0000-0000000000b1';

const at = (iso: string, latitude: number, longitude: number): CapturedLocation => ({
  latitude,
  longitude,
  recordedAt: iso,
});

describe('Offline location queue and sync (F-1104)', () => {
  let queue: LocationQueue;

  beforeEach(() => {
    queue = createMemoryLocationQueue();
  });

  describe('ordering and batching', () => {
    it('returns a job’s points oldest first by device timestamp', async () => {
      // Enqueued deliberately out of order, as an offline replay would be.
      await queue.enqueue(JOB_A, [
        at('2026-10-18T09:02:00.000Z', 5.86, 36.42),
        at('2026-10-18T09:00:00.000Z', 5.85, 36.40),
        at('2026-10-18T09:01:00.000Z', 5.855, 36.41),
      ]);

      const entries = await queue.listForJob(JOB_A);
      expect(entries.map((e) => e.recordedAt)).toEqual([
        '2026-10-18T09:00:00.000Z',
        '2026-10-18T09:01:00.000Z',
        '2026-10-18T09:02:00.000Z',
      ]);
    });

    it('breaks ties on identical timestamps by insertion order', () => {
      const sorted = sortQueueEntries([
        { id: 3, recordedAt: '2026-10-18T09:00:00.000Z' },
        { id: 1, recordedAt: '2026-10-18T09:00:00.000Z' },
        { id: 2, recordedAt: '2026-10-18T09:00:00.000Z' },
      ]);
      expect(sorted.map((e) => e.id)).toEqual([1, 2, 3]);
    });

    it('caps a batch at the agreed size and preserves order across batches', () => {
      const entries = Array.from({ length: 120 }, (_, i) => i);
      const batches = planBatches(entries);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(50);
      expect(batches[1]).toHaveLength(50);
      expect(batches[2]).toHaveLength(20);
      expect(batches.flat()).toEqual(entries);
      expect(MAX_LOCATION_BATCH_SIZE).toBe(50);
    });

    it('rejects a non-positive batch size rather than looping forever', () => {
      expect(() => planBatches([1, 2, 3], 0)).toThrow(RangeError);
    });

    it('strips storage-only fields so the payload matches LocationIngestionRequest', () => {
      const entry: LocationQueueEntry = {
        id: 7,
        jobId: JOB_A,
        latitude: 5.85,
        longitude: 36.4,
        speed: 3.3,
        recordedAt: '2026-10-18T09:00:00.000Z',
        queuedAt: '2026-10-18T11:00:00.000Z',
      };
      expect(Object.keys(toIngestionRequest(entry)).sort()).toEqual([
        'latitude',
        'longitude',
        'recordedAt',
        'speed',
      ]);
    });
  });

  describe('the task scenario: offline, record, reconnect, upload in order', () => {
    it('uploads points recorded while offline in device-timestamp order', async () => {
      // Recorded offline, arriving out of order.
      await queue.enqueue(JOB_A, [
        at('2026-10-18T09:02:00.000Z', 5.86, 36.42),
        at('2026-10-18T09:00:00.000Z', 5.85, 36.40),
        at('2026-10-18T09:01:00.000Z', 5.855, 36.41),
      ]);
      expect(await queue.count(JOB_A)).toBe(3);

      const seen: CapturedLocation[][] = [];
      const result = await syncJobLocations({
        queue,
        jobId: JOB_A,
        upload: async (_jobId, points) => {
          seen.push(points);
          return points.length;
        },
      });

      expect(seen).toHaveLength(1);
      expect(seen[0].map((p) => p.recordedAt)).toEqual([
        '2026-10-18T09:00:00.000Z',
        '2026-10-18T09:01:00.000Z',
        '2026-10-18T09:02:00.000Z',
      ]);
      expect(result).toMatchObject({ uploaded: 3, dropped: 0, remaining: 0 });
      // Cleared only after the server confirmed it.
      expect(await queue.count(JOB_A)).toBe(0);
    });

    it('sends several batches when more points were queued than one batch allows', async () => {
      await queue.enqueue(
        JOB_A,
        Array.from({ length: 120 }, (_, i) =>
          at(new Date(Date.UTC(2026, 9, 18, 9, 0, i)).toISOString(), 5.85 + i * 0.0001, 36.4)
        )
      );

      const sizes: number[] = [];
      const result = await syncJobLocations({
        queue,
        jobId: JOB_A,
        upload: async (_jobId, points) => {
          sizes.push(points.length);
          return points.length;
        },
      });

      expect(sizes).toEqual([50, 50, 20]);
      expect(result.uploaded).toBe(120);
      expect(await queue.count(JOB_A)).toBe(0);
    });
  });

  describe('failure handling', () => {
    it('keeps the points when the upload fails, so nothing is lost', async () => {
      await queue.enqueue(JOB_A, [at('2026-10-18T09:00:00.000Z', 5.85, 36.4)]);

      const result = await syncJobLocations({
        queue,
        jobId: JOB_A,
        upload: async () => {
          throw new Error('network down');
        },
      });

      expect(result.uploaded).toBe(0);
      expect(result.remaining).toBe(1);
      // Still queued for the next attempt.
      expect(await queue.count(JOB_A)).toBe(1);
    });

    it('keeps only the un-sent batches when a later batch fails', async () => {
      await queue.enqueue(
        JOB_A,
        Array.from({ length: 60 }, (_, i) =>
          at(new Date(Date.UTC(2026, 9, 18, 9, 0, i)).toISOString(), 5.85, 36.4)
        )
      );

      let call = 0;
      const result = await syncJobLocations({
        queue,
        jobId: JOB_A,
        upload: async (_jobId, points) => {
          call += 1;
          if (call === 1) return points.length;
          throw new Error('dropped mid-sync');
        },
      });

      expect(result.uploaded).toBe(50);
      expect(result.remaining).toBe(10);
      expect(await queue.count(JOB_A)).toBe(10);
    });
  });

  describe('job already delivered on the server', () => {
    it('drops the points and stops retrying when the server stores none', async () => {
      await queue.enqueue(JOB_A, [
        at('2026-10-18T09:00:00.000Z', 5.85, 36.4),
        at('2026-10-18T09:01:00.000Z', 5.86, 36.42),
      ]);

      // DeliveryService.ingestLocations returns 0 with HTTP 200 for a terminal job.
      const result = await syncJobLocations({
        queue,
        jobId: JOB_A,
        upload: async () => 0,
      });

      expect(result.jobFinishedOnServer).toBe(true);
      expect(result.dropped).toBe(2);
      expect(result.uploaded).toBe(0);
      expect(result.remaining).toBe(0);
      expect(await queue.count(JOB_A)).toBe(0);
    });

    it('does not retry forever once the server says the job is finished', async () => {
      await queue.enqueue(JOB_A, [at('2026-10-18T09:00:00.000Z', 5.85, 36.4)]);

      const upload = vi.fn(async () => 0);
      await syncJobLocations({ queue, jobId: JOB_A, upload });
      const firstCallCount = upload.mock.calls.length;

      // A second sync has nothing left to send, so the server is not asked again.
      await syncJobLocations({ queue, jobId: JOB_A, upload });

      expect(upload.mock.calls.length).toBe(firstCallCount);
    });

    it('still uploads normally when the server stores the batch', async () => {
      await queue.enqueue(JOB_A, [at('2026-10-18T09:00:00.000Z', 5.85, 36.4)]);
      const result = await syncJobLocations({ queue, jobId: JOB_A, upload: async (_j, p) => p.length });
      expect(result.jobFinishedOnServer).toBe(false);
      expect(result.uploaded).toBe(1);
    });
  });

  describe('multiple jobs', () => {
    it('keeps each job’s points separate', async () => {
      await queue.enqueue(JOB_A, [at('2026-10-18T09:00:00.000Z', 5.85, 36.4)]);
      await queue.enqueue(JOB_B, [
        at('2026-10-18T09:05:00.000Z', 5.9, 36.5),
        at('2026-10-18T09:04:00.000Z', 5.89, 36.49),
      ]);

      expect((await queue.jobIds()).sort()).toEqual([JOB_A, JOB_B].sort());
      expect(await queue.count(JOB_A)).toBe(1);
      expect(await queue.count(JOB_B)).toBe(2);

      await syncJobLocations({ queue, jobId: JOB_A, upload: async (_j, p) => p.length });
      expect(await queue.count(JOB_A)).toBe(0);
      expect(await queue.count(JOB_B)).toBe(2);

      await queue.clearJob(JOB_B);
      expect(await queue.count()).toBe(0);
    });

    it('drains every queued job', async () => {
      await queue.enqueue(JOB_A, [at('2026-10-18T09:00:00.000Z', 5.85, 36.4)]);
      await queue.enqueue(JOB_B, [at('2026-10-18T09:05:00.000Z', 5.9, 36.5)]);

      const results = await syncAllJobs(queue, async (_j, p) => p.length);
      expect(results[JOB_A].uploaded).toBe(1);
      expect(results[JOB_B].uploaded).toBe(1);
      expect(await queue.count()).toBe(0);
    });
  });

  it('does nothing when there is nothing queued', async () => {
    const upload = vi.fn(async (_j: string, p: CapturedLocation[]) => p.length);
    const result = await syncJobLocations({ queue, jobId: JOB_A, upload });

    expect(upload).not.toHaveBeenCalled();
    expect(result).toMatchObject({ uploaded: 0, dropped: 0, remaining: 0 });
  });
});