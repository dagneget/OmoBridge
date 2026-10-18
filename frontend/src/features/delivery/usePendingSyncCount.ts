import { useCallback, useEffect, useState } from 'react';

import {
  createIdbLocationQueue,
  type LocationQueue,
} from './locationQueue';
import { createIdbStatusQueue, type StatusQueue } from './statusQueue';

/**
 * How many actions this device is still holding for the server, for the navigation badge (F-1501).
 *
 * ## Why it only polls while something is queued
 * This hook runs inside the dashboard layout, so it is mounted for every screen a delivery
 * provider visits. Polling an idle queue would be a permanent background cost for a badge that
 * would read zero either way, so the interval exists **only while the count is above zero** and
 * stops the moment the queue drains. It also re-reads immediately on `online`, which is the only
 * event that can change the count without this device doing anything.
 *
 * ## Why it never throws
 * A count is not worth breaking the layout for. If storage is unavailable or evicted, the badge
 * shows nothing and the sync screen explains the problem properly, where there is room for it.
 */

export interface UsePendingSyncCountOptions {
  /** Injected for tests; defaults to the IndexedDB queues. */
  statusQueue?: StatusQueue;
  locationQueue?: LocationQueue;
  /** How often to re-read while the count is above zero. */
  pollMs?: number;
}

const DEFAULT_POLL_MS = 30_000;

export function usePendingSyncCount(
  options: UsePendingSyncCountOptions = {}
): number | null {
  const { statusQueue, locationQueue, pollMs = DEFAULT_POLL_MS } = options;
  const [count, setCount] = useState<number | null>(null);

  const read = useCallback(() => {
    // Written as a promise chain rather than an async function so the setState calls sit
    // inside a `.then`, where they are visibly deferred instead of looking like a synchronous
    // update from the effect that calls this.
    const openStatus = statusQueue ? Promise.resolve(statusQueue) : createIdbStatusQueue();
    const openLocation = locationQueue ? Promise.resolve(locationQueue) : createIdbLocationQueue();

    return Promise.all([openStatus, openLocation])
      .then(([status, location]) => Promise.all([status.count(), location.count()]))
      .then(([statusCount, locationCount]) => {
        setCount(statusCount + locationCount);
      })
      .catch(() => {
        // Deliberately swallowed: see the note above. The badge is a hint, not a control.
        setCount(null);
      });
  }, [statusQueue, locationQueue]);

  useEffect(() => {
    void read();
  }, [read]);

  useEffect(() => {
    const update = () => {
      // Only a return to connectivity can change the count without this device acting.
      if (navigator.onLine) void read();
    };
    window.addEventListener('online', update);
    return () => window.removeEventListener('online', update);
  }, [read]);

  useEffect(() => {
    if (!count) return undefined;
    const id = setInterval(() => void read(), pollMs);
    return () => clearInterval(id);
  }, [count, pollMs, read]);

  return count;
}
