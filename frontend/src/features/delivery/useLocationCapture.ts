import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createLocationCapture,
  PERMISSION_DENIED,
  type CapturedLocation,
  type GeolocationLike,
} from '../delivery/locationCapture';

/**
 * Geolocation permission state.
 *
 * The Permissions API is only used as a hint; it is not available in every browser (notably
 * older Safari and most non-secure contexts), so `unknown` is a real state rather than an
 * error. An actual request is only ever triggered by `navigator.geolocation`, because that
 * is what makes the browser show its own permission prompt.
 */
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export function useGeolocationPermission(): PermissionState {
  const [permission, setPermission] = useState<PermissionState>('unknown');

  useEffect(() => {
    const permissions = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
    if (!permissions || typeof permissions.query !== 'function') {
      return;
    }

    let cancelled = false;
    let status: PermissionStatus | undefined;

    try {
      permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          if (cancelled) return;
          status = result;
          setPermission(result.state as PermissionState);
          result.onchange = () => setPermission(result.state as PermissionState);
        })
        .catch(() => {
          // Firefox resolves query('geolocation') inconsistently. 'unknown' is already the
          // initial state, so there is nothing to set here.
        });
    } catch {
      // permissions.query threw synchronously (unsupported or blocked context).
      // 'unknown' is already the initial state.
    }

    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  return permission;
}

export interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

export interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
}

/**
 * `Navigator` already declares a non-optional `wakeLock` in the DOM lib, so it cannot be
 * redeclared as optional by intersection. Cast through `unknown` instead, which also keeps
 * the runtime feature check honest on browsers that do not ship it.
 */
type NavigatorWithOptionalWakeLock = Navigator & {
  wakeLock?: WakeLockLike;
};

/**
 * Hold a screen wake lock while `active`, so a driver watching the map does not have to keep
 * tapping the screen to stop the display sleeping mid-route.
 *
 * Best effort: `navigator.wakeLock` is unsupported on several browsers and is released by
 * the OS when the tab is backgrounded. Failure is not surfaced as an error because it must
 * never block location capture; the F-1108 limitation notice is where this is explained.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Already released by the browser; nothing to do.
      }
    }
  }, []);

  useEffect(() => {
    if (!active) {
      void release();
      return;
    }

    let cancelled = false;
    const nav =
      typeof navigator !== 'undefined'
        ? (navigator as unknown as NavigatorWithOptionalWakeLock)
        : undefined;

    if (!nav?.wakeLock) {
      return;
    }

    nav.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        // Re-acquire after the tab becomes visible again, if it was dropped.
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      })
      .catch(() => {
        // Denied or unsupported: capture continues without a wake lock.
      });

    return () => {
      cancelled = true;
      void release();
    };
  }, [active, release]);
}

export interface UseLocationCaptureOptions {
  /**
   * Called for every accepted fix. Supply this to persist points (F-1104 enqueues them);
   * when omitted the hook keeps them in memory only.
   */
  onPoint?: (point: CapturedLocation) => void;
}

export interface UseLocationCaptureResult {
  points: CapturedLocation[];
  isTracking: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

/**
 * Capture fixes for as long as the job is active.
 *
 * When `enabled` goes false the watch is torn down, which is how "stop after delivery"
 * is implemented: the caller simply stops passing a terminal job status.
 *
 * Points are buffered in memory only. Persisting them and uploading in batches is F-1104.
 */
export function useLocationCapture(
  enabled: boolean,
  options: UseLocationCaptureOptions = {}
): UseLocationCaptureResult {
  const [points, setPoints] = useState<CapturedLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const captureRef = useRef<ReturnType<typeof createLocationCapture> | null>(null);
  const [requested, setRequested] = useState(false);
  const shouldTrack = enabled && requested;

  // Keep the sink in a ref so a caller passing an inline arrow does not restart the watch on
  // every render, which would silently reset the throttle window. Updated in an effect rather
  // than during render; effects run in declaration order, so this is set before the capture
  // effect below reads it.
  const onPointRef = useRef(options.onPoint);

  useEffect(() => {
    onPointRef.current = options.onPoint;
  }, [options.onPoint]);

  // Derived during render rather than stored: the device's capability is not state we own.
  const geolocation = (
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { geolocation?: GeolocationLike }).geolocation
      : undefined
  ) as GeolocationLike | undefined;

  useEffect(() => {
    if (!shouldTrack || !geolocation) {
      captureRef.current?.stop();
      captureRef.current = null;
      return;
    }

    const capture = createLocationCapture({
      geolocation,
      onPoint: (point) => {
        const sink = onPointRef.current;
        if (sink) {
          sink(point);
        } else {
          setPoints((current) => [...current, point]);
        }
      },
      onError: (geoError) => {
        setError(
          geoError.code === PERMISSION_DENIED ? 'permission-denied' : 'gps-unavailable'
        );
        capture.stop();
      },
    });

    captureRef.current = capture;
    capture.start();

    return () => {
      capture.stop();
      captureRef.current = null;
    };
  }, [shouldTrack, geolocation]);

  // No reset effect is needed when `enabled` goes false: the watch is torn down above,
  // which is what "stop after delivery" means. Delivery statuses only move forward, so a
  // finished job never becomes active again and `requested` cannot leak into a new job.

  const start = useCallback(() => {
    setError(null);
    setRequested(true);
  }, []);

  const stop = useCallback(() => {
    setRequested(false);
  }, []);

  const clear = useCallback(() => setPoints([]), []);

  const effectiveError =
    error ?? (shouldTrack && !geolocation ? 'gps-unavailable' : null);

  return {
    points,
    isTracking: shouldTrack && !!geolocation && effectiveError === null,
    error: effectiveError,
    start,
    stop,
    clear,
  };
}