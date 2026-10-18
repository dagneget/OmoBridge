import type { LocationIngestionRequest } from '../../types/api';

/**
 * A captured fix, shaped to match the backend's `LocationIngestionRequest`
 * (POST /api/v1/delivery/jobs/{jobId}/locations).
 *
 * `recordedAt` is the DEVICE timestamp, not the server's receive time. The backend sorts a
 * replayed batch by it (`DeliveryService.ingestLocations` orders on `recordedAt`), so an
 * offline queue stays chronological even when it uploads late.
 */
export type CapturedLocation = LocationIngestionRequest;

/** The slice of the Geolocation API this module uses, so tests can supply a fake. */
export interface GeolocationLike {
  watchPosition(
    success: (position: GeolocationPositionLike) => void,
    error?: (error: GeolocationErrorLike) => void,
    options?: PositionOptions
  ): number;
  clearWatch(watchId: number): void;
}

export interface GeolocationPositionLike {
  coords: {
    latitude: number;
    longitude: number;
    speed?: number | null;
  };
  timestamp: number;
}

export interface GeolocationErrorLike {
  code: number;
  message: string;
}

/** GeolocationPositionError.PERMISSION_DENIED */
export const PERMISSION_DENIED = 1;
/** GeolocationPositionError.POSITION_UNAVAILABLE */
export const POSITION_UNAVAILABLE = 2;
/** GeolocationPositionError.TIMEOUT */
export const TIMEOUT = 3;

/**
 * One fix every 30 s, high accuracy off.
 *
 * The breadcrumb only has to show where the provider travelled, not survey it. Leaving
 * `enableHighAccuracy` off avoids waking the GPS chip continuously, which on the low-end
 * Android handsets this app targets is the difference between a battery that lasts the shift
 * and one that does not. The backend stores the points it receives; it does not ask for
 * survey-grade fixes.
 */
export const DEFAULT_INTERVAL_MS = 30_000;

/** Reuse a fix cached by the browser rather than spinning up a new measurement. */
export const DEFAULT_MAXIMUM_AGE_MS = 10_000;

/** Do not hang the UI waiting on a fix that will never arrive. */
export const DEFAULT_TIMEOUT_MS = 20_000;

/** A fix this far from the previous one is treated as a GPS jump and dropped. */
const MAX_PLAUSIBLE_SPEED_MPS = 55; // ~200 km/h

export interface LocationCaptureOptions {
  geolocation: GeolocationLike;
  /** Injectable clock so tests can produce deterministic device timestamps. */
  now?: () => number;
  intervalMs?: number;
  maximumAgeMs?: number;
  timeoutMs?: number;
  onPoint: (point: CapturedLocation) => void;
  onError?: (error: GeolocationErrorLike) => void;
}

export interface LocationCapture {
  start: () => void;
  stop: () => void;
  isWatching: () => boolean;
}

export function createLocationCapture(options: LocationCaptureOptions): LocationCapture {
  const {
    geolocation,
    now = () => Date.now(),
    intervalMs = DEFAULT_INTERVAL_MS,
    maximumAgeMs = DEFAULT_MAXIMUM_AGE_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onPoint,
    onError,
  } = options;

  let watchId: number | null = null;
  let lastRawTimestamp: number | null = null;
  let lastAccepted: GeolocationPositionLike | null = null;

  const handleSuccess = (position: GeolocationPositionLike) => {
    const { latitude, longitude, speed } = position.coords;

    // Reject anything non-finite rather than forwarding NaN to the server.
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return;
    }

    // Device timestamp, from the browser's own clock.
    const fixTime = Number.isFinite(position.timestamp) ? position.timestamp : now();

    // The browser can replay the same fix; only consider genuinely newer positions.
    if (lastRawTimestamp !== null && fixTime <= lastRawTimestamp) {
      return;
    }
    lastRawTimestamp = fixTime;

    /*
     * `watchPosition` takes no interval: it delivers a fix as soon as the GPS chip
     * produces one, which while stationary can be several per second. Throttle to one
     * accepted fix per `intervalMs` so a long stop does not drain the battery or flood the
     * offline queue. The browser-side `maximumAge` covers the opposite problem of a stale
     * cached fix.
     */
    if (lastAccepted !== null && fixTime - lastAccepted.timestamp < intervalMs) {
      return;
    }

    // Drop a fix that implies an impossible jump from the last accepted one.
    if (lastAccepted !== null) {
      const elapsedSeconds = (fixTime - lastAccepted.timestamp) / 1000;
      if (elapsedSeconds > 0) {
        const impliedSpeed =
          haversineMetres(
            lastAccepted.coords.latitude,
            lastAccepted.coords.longitude,
            latitude,
            longitude
          ) / elapsedSeconds;
        if (impliedSpeed > MAX_PLAUSIBLE_SPEED_MPS) {
          return;
        }
      }
    }

    lastAccepted = { coords: { latitude, longitude, speed }, timestamp: fixTime };

    onPoint({
      latitude,
      longitude,
      // `speed` is nullable in the backend contract; omit rather than send null.
      ...(typeof speed === 'number' && Number.isFinite(speed) ? { speed } : {}),
      recordedAt: new Date(fixTime).toISOString(),
    });
  };

  const handleError = (error: GeolocationErrorLike) => {
    onError?.(error);
  };

  return {
    start() {
      if (watchId !== null) return;
      watchId = geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: false,
        maximumAge: maximumAgeMs,
        timeout: timeoutMs,
      });
    },
    stop() {
      if (watchId === null) return;
      geolocation.clearWatch(watchId);
      watchId = null;
    },
    isWatching() {
      return watchId !== null;
    },
  };
}

/** Great-circle distance in metres. */
export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}