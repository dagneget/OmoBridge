import { isActiveStatus } from '../delivery';
import type { DeliveryTrackingResponse, LocationPointResponse } from '../../types/api';

/**
 * Pure presentation rules for the public tracking page (F-604).
 *
 * Kept out of the component so the live/stale/terminal decisions can be tested directly: they
 * are the part most likely to be subtly wrong, and none of them need React.
 */

/** How often to re-read the tracking endpoint while the job is still moving. */
export const TRACKING_POLL_MS = 15_000;

/**
 * A position older than this is flagged as possibly out of date.
 *
 * Polling can be perfectly fresh while the driver's phone has not produced a fix for an hour —
 * in a tunnel, in a shed, or with the app closed. "Last updated" answers *when did we ask*;
 * this answers *when did the vehicle actually move*, which is the question a waiting buyer has.
 */
export const STALE_AFTER_MS = 5 * 60_000;

export type TrackingView =
  /** The job is still moving; keep polling. */
  | { kind: 'live' }
  /** The job has reached a terminal status; there is nothing more to poll for. */
  | { kind: 'closed' };

export function trackingView(tracking: DeliveryTrackingResponse): TrackingView {
  const status = String(tracking.status ?? '').toUpperCase();
  return isActiveStatus(status) ? { kind: 'live' } : { kind: 'closed' };
}

/** True when there is a usable fix to show. Guards the optional generated fields. */
export function hasPosition(tracking: DeliveryTrackingResponse): boolean {
  return (
    typeof tracking.currentLatitude === 'number' && typeof tracking.currentLongitude === 'number'
  );
}

/**
 * The breadcrumb, oldest first.
 *
 * The server already orders `history` by `recorded_at` (`findByJobIdOrderByRecordedAtAsc`), and
 * late points keep the timestamp they were captured with. A point queued offline and uploaded an
 * hour later therefore lands in its correct place in the trail rather than at the end of it — so
 * this deliberately sorts by `recordedAt` again instead of trusting arrival order, and drops
 * entries with no usable coordinates rather than plotting them at 0,0.
 */
export function buildTrail(history: LocationPointResponse[] | undefined): Array<[number, number]> {
  if (!history?.length) return [];

  return history
    .filter(
      (point) => typeof point.latitude === 'number' && typeof point.longitude === 'number'
    )
    .slice()
    .sort((a, b) => Date.parse(String(a.recordedAt)) - Date.parse(String(b.recordedAt)))
    .map((point) => [point.latitude as number, point.longitude as number] as [number, number]);
}

export type Staleness =
  /** No point has ever been received for this job. */
  | { kind: 'none' }
  | { kind: 'fresh'; ageMs: number }
  /** Older than `STALE_AFTER_MS` at `now`. */
  | { kind: 'stale'; ageMs: number }
  /** The recorded timestamp is unparseable; staleness cannot be judged. */
  | { kind: 'unknown' };

export function stalenessOf(
  tracking: DeliveryTrackingResponse,
  now: number = Date.now()
): Staleness {
  if (!tracking.lastRecordedAt) return { kind: 'none' };

  const recordedAt = Date.parse(tracking.lastRecordedAt);
  if (Number.isNaN(recordedAt)) return { kind: 'unknown' };

  const ageMs = Math.max(0, now - recordedAt);
  return ageMs > STALE_AFTER_MS ? { kind: 'stale', ageMs } : { kind: 'fresh', ageMs };
}

/**
 * Splits a relative time into an i18n key and a count.
 *
 * `utils/formatRelativeTime` already exists but returns fixed English, and this screen is public
 * and buyer-facing, so it needs to be translatable. The key is looked up as `relative.<key>`.
 */
export function relativeTimeKey(
  date: Date,
  now: Date = new Date()
): { key: 'justNow' | 'seconds' | 'minutes' | 'hours' | 'days'; count: number } {
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 30) return { key: 'justNow', count: 0 };
  if (diffSec < 60) return { key: 'seconds', count: diffSec };

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { key: 'minutes', count: diffMin };

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { key: 'hours', count: diffHours };

  return { key: 'days', count: Math.floor(diffHours / 24) };
}
