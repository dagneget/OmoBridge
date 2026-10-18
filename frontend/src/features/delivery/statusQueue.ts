import { openDeliveryDb, STATUS_STORE, isIndexedDbAvailable, prefixRange } from './deliveryDb';
import type { DeliveryJobStatus } from './deliveryStatus';

/**
 * A status change the provider made while the device was offline.
 *
 * `queuedAt` is the device clock at the moment the provider tapped the button. It is the replay
 * order: queued changes are applied oldest first, because a later change can only be valid if
 * the earlier ones were accepted.
 */
export interface QueuedStatusChange {
  id: number;
  jobId: string;
  newStatus: DeliveryJobStatus;
  reason?: string;
  queuedAt: string;
}

export interface StatusQueue {
  enqueue: (jobId: string, newStatus: DeliveryJobStatus, reason?: string) => Promise<void>;
  /** One job's pending changes, oldest first. */
  listForJob: (jobId: string) => Promise<QueuedStatusChange[]>;
  remove: (ids: number[]) => Promise<void>;
  count: (jobId?: string) => Promise<number>;
  jobIds: () => Promise<string[]>;
  clearJob: (jobId: string) => Promise<void>;
}

/** Order by when the provider made the change, then by insertion for identical timestamps. */
export function sortStatusChanges(entries: QueuedStatusChange[]): QueuedStatusChange[] {
  return [...entries].sort((a, b) => {
    if (a.queuedAt === b.queuedAt) return a.id - b.id;
    return a.queuedAt < b.queuedAt ? -1 : 1;
  });
}

/**
 * In-memory queue: the test double, and the runtime fallback when IndexedDB is unavailable.
 */
export function createMemoryStatusQueue(): StatusQueue {
  let entries: QueuedStatusChange[] = [];
  let nextId = 1;

  return {
    async enqueue(jobId, newStatus, reason) {
      entries.push({
        id: nextId++,
        jobId,
        newStatus,
        ...(reason ? { reason } : {}),
        queuedAt: new Date().toISOString(),
      });
    },
    async listForJob(jobId) {
      return sortStatusChanges(entries.filter((entry) => entry.jobId === jobId));
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

export async function createIdbStatusQueue(): Promise<StatusQueue> {
  if (!isIndexedDbAvailable()) {
    return createMemoryStatusQueue();
  }

  const db = await openDeliveryDb();

  const listForJob = async (jobId: string): Promise<QueuedStatusChange[]> => {
    const entries = (await db.getAllFromIndex(
      STATUS_STORE,
      'by-job-queued',
      prefixRange(jobId)
    )) as QueuedStatusChange[];
    return sortStatusChanges(entries);
  };

  const remove = async (ids: number[]): Promise<void> => {
    if (ids.length === 0) return;
    const tx = db.transaction(STATUS_STORE, 'readwrite');
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
  };

  return {
    async enqueue(jobId, newStatus, reason) {
      const tx = db.transaction(STATUS_STORE, 'readwrite');
      await tx.store.add({
        jobId,
        newStatus,
        ...(reason ? { reason } : {}),
        queuedAt: new Date().toISOString(),
      } satisfies Omit<QueuedStatusChange, 'id'>);
      await tx.done;
    },

    listForJob,

    remove,

    async count(jobId) {
      if (!jobId) return db.count(STATUS_STORE);
      return db.countFromIndex(STATUS_STORE, 'by-job-queued', prefixRange(jobId));
    },

    async jobIds() {
      const tx = db.transaction(STATUS_STORE, 'readonly');
      const keys = await tx.store.index('by-job-queued').getAllKeys();
      await tx.done;
      return [...new Set((keys as [string, string][]).map((key) => key[0]))];
    },

    async clearJob(jobId) {
      await remove((await listForJob(jobId)).map((entry) => entry.id));
    },
  };
}