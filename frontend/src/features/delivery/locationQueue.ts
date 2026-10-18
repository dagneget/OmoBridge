import { openDB, type IDBPDatabase } from 'idb';

import type { CapturedLocation } from './locationCapture';

/**
 * One queued location fix.
 *
 * `id` is the storage key. `recordedAt` is the DEVICE timestamp captured in F-1103 and is the
 * field the backend sorts replayed batches on, so it is also the queue's ordering key: a batch
 * uploaded hours later must still reach the server in the order the route was travelled.
 */
export interface LocationQueueEntry extends CapturedLocation {
  id: number;
  jobId: string;
  /** When the point was written to the queue, for diagnostics only. Never sent. */
  queuedAt: string;
}

export interface LocationQueue {
  enqueue: (jobId: string, points: CapturedLocation[]) => Promise<void>;
  /** Entries for one job, oldest first by `recordedAt`, then by insertion order. */
  listForJob: (jobId: string) => Promise<LocationQueueEntry[]>;
  remove: (ids: number[]) => Promise<void>;
  count: (jobId?: string) => Promise<number>;
  jobIds: () => Promise<string[]>;
  clearJob: (jobId: string) => Promise<void>;
}

/**
 * Maximum points per request.
 *
 * `POST /api/v1/delivery/jobs/{jobId}/locations` carries `List<LocationIngestionRequest>` with
 * only a `@NotEmpty` constraint -- there is no server-side size cap and no rate limiter in the
 * backend. 50 is the batch size agreed in the plan's backend-gap table, so the client enforces
 * it: a long offline stretch can otherwise accumulate thousands of fixes and produce a single
 * request the server will have to parse in one go.
 */
export const MAX_LOCATION_BATCH_SIZE = 50;

/** Order by device timestamp, then by insertion order so equal timestamps stay stable. */
export function sortQueueEntries<T extends { recordedAt: string; id: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.recordedAt === b.recordedAt) return a.id - b.id;
    return a.recordedAt < b.recordedAt ? -1 : 1;
  });
}

/** Split entries into upload batches of at most `maxBatchSize`, preserving order. */
export function planBatches<T>(entries: T[], maxBatchSize = MAX_LOCATION_BATCH_SIZE): T[][] {
  if (maxBatchSize < 1) throw new RangeError('maxBatchSize must be at least 1');
  const batches: T[][] = [];
  for (let i = 0; i < entries.length; i += maxBatchSize) {
    batches.push(entries.slice(i, i + maxBatchSize));
  }
  return batches;
}

/** Strip storage-only fields so what is sent matches `LocationIngestionRequest` exactly. */
export function toIngestionRequest(entry: LocationQueueEntry): CapturedLocation {
  return {
    latitude: entry.latitude,
    longitude: entry.longitude,
    ...(entry.speed !== undefined ? { speed: entry.speed } : {}),
    recordedAt: entry.recordedAt,
  };
}

/**
 * In-memory queue.
 *
 * Used by tests, and as the fallback when IndexedDB is unavailable (private browsing in some
 * browsers, or a non-secure context). Same ordering guarantees as the IndexedDB queue, so the
 * sync logic behaves identically either way.
 */
export function createMemoryLocationQueue(): LocationQueue {
  let entries: LocationQueueEntry[] = [];
  let nextId = 1;

  return {
    async enqueue(jobId, points) {
      const queuedAt = new Date().toISOString();
      for (const point of points) {
        entries.push({ ...point, id: nextId++, jobId, queuedAt });
      }
    },
    async listForJob(jobId) {
      return sortQueueEntries(entries.filter((entry) => entry.jobId === jobId));
    },
    async remove(ids) {
      const doomed = new Set(ids);
      entries = entries.filter((entry) => !doomed.has(entry.id));
    },
    async count(jobId) {
      return jobId ? entries.filter((entry) => entry.jobId === jobId).length : entries.length;
    },
    async jobIds() {
      return [...new Set(entries.map((entry) => entry.jobId))];
    },
    async clearJob(jobId) {
      entries = entries.filter((entry) => entry.jobId !== jobId);
    },
  };
}

const DB_NAME = 'omobridge-delivery';
const STORE_NAME = 'locationQueue';
const DB_VERSION = 1;

function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

async function openQueueDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (db.objectStoreNames.contains(STORE_NAME)) return;
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      store.createIndex('by-job-recorded', ['jobId', 'recordedAt']);
    },
  });
}

/**
 * IndexedDB-backed queue.
 *
 * Reads go through the compound `by-job-recorded` index so each job's points come back already
 * ordered by device timestamp.
 */
export async function createIdbLocationQueue(): Promise<LocationQueue> {
  if (!isIndexedDbAvailable()) {
    return createMemoryLocationQueue();
  }

  const db = await openQueueDb();

  const listForJob = async (jobId: string): Promise<LocationQueueEntry[]> => {
    // The compound index is (jobId, recordedAt), so a bounded range scan returns this job's
    // points already ordered by device timestamp.
    const range = IDBKeyRange.bound([jobId, ''], [jobId, '\uffff']);
    const entries = (await db.getAllFromIndex(STORE_NAME, 'by-job-recorded', range)) as LocationQueueEntry[];
    // sortQueueEntries adds the id tie-break for equal timestamps.
    return sortQueueEntries(entries);
  };

  const remove = async (ids: number[]): Promise<void> => {
    if (ids.length === 0) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
  };

  return {
    async enqueue(jobId, points) {
      if (points.length === 0) return;
      const queuedAt = new Date().toISOString();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await Promise.all(
        points.map((point) =>
          tx.store.add({
            ...point,
            jobId,
            queuedAt,
          } satisfies Omit<LocationQueueEntry, 'id'>)
        )
      );
      await tx.done;
    },

    listForJob,

    remove,

    async count(jobId) {
      if (!jobId) return db.count(STORE_NAME);
      return db.countFromIndex(
        STORE_NAME,
        'by-job-recorded',
        IDBKeyRange.bound([jobId, ''], [jobId, '\uffff'])
      );
    },

    async jobIds() {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const keys = await tx.store.index('by-job-recorded').getAllKeys();
      await tx.done;
      return [...new Set((keys as [string, string][]).map((key) => key[0]))];
    },

    async clearJob(jobId) {
      await remove((await listForJob(jobId)).map((entry) => entry.id));
    },
  };
}
