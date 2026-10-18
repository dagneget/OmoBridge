import { openDB, type IDBPDatabase } from 'idb';

/**
 * One IndexedDB database for the delivery provider app, owned in a single place.
 *
 * Both offline queues (location points in F-1104, status changes in F-1105) live here. They
 * deliberately share a database and a single version: IndexedDB refuses to open a database at a
 * lower version than it is already at, so two modules each calling `openDB` with their own
 * version would break as soon as one of them added a store.
 */

export const DELIVERY_DB_NAME = 'omobridge-delivery';
export const DELIVERY_DB_VERSION = 1;

export const LOCATION_STORE = 'locationQueue';
export const STATUS_STORE = 'statusQueue';

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Open the delivery database, creating any missing object store.
 *
 * Object stores are added to the upgrade callback one at a time so the version can be bumped
 * later without rewriting this function.
 */
export async function openDeliveryDb(): Promise<IDBPDatabase> {
  return openDB(DELIVERY_DB_NAME, DELIVERY_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(LOCATION_STORE)) {
        const store = db.createObjectStore(LOCATION_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        // Reading a job's points must already be in device-timestamp order.
        store.createIndex('by-job-recorded', ['jobId', 'recordedAt']);
      }
      if (!db.objectStoreNames.contains(STATUS_STORE)) {
        const store = db.createObjectStore(STATUS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        // Queued changes are replayed in the order the provider made them.
        store.createIndex('by-job-queued', ['jobId', 'queuedAt']);
      }
    },
  });
}

/** The lowest and highest key for a compound index prefix scan over one job. */
export function prefixRange<T>(first: T): IDBKeyRange {
  return IDBKeyRange.bound([first, ''], [first, '￿']);
}