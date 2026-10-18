import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createLocationCapture,
  haversineMetres,
  PERMISSION_DENIED,
  TIMEOUT,
  DEFAULT_INTERVAL_MS,
  type CapturedLocation,
  type GeolocationLike,
  type GeolocationPositionLike,
} from '../features/delivery/locationCapture';

/**
 * Fake Geolocation. `watchPosition` hands back an id and lets the test push fixes, which is
 * exactly what a real device does asynchronously. Records whether the watch was cleared so
 * "stop after delivery" can be asserted.
 */
function createFakeGeolocation() {
  let nextId = 1;
  let currentId: number | null = null;
  let success: ((position: GeolocationPositionLike) => void) | null = null;
  let failure: ((error: { code: number; message: string }) => void) | null = null;
  let options: PositionOptions | undefined;
  const cleared: number[] = [];

  const geolocation: GeolocationLike & { emit: (p: GeolocationPositionLike) => void } = {
    watchPosition(ok, err, opts) {
      const id = nextId++;
      currentId = id;
      success = ok;
      failure = err ?? null;
      options = opts;
      return id;
    },
    clearWatch(id) {
      cleared.push(id);
      if (currentId === id) {
        currentId = null;
        success = null;
      }
    },
    emit(position) {
      if (!success) throw new Error('no active watch');
      success(position);
    },
  };

  return {
    geolocation,
    cleared,
    isWatching: () => currentId !== null,
    failWith: (code: number, message: string) => failure?.({ code, message }),
    getOptions: () => options,
    clearFailure: () => {
      failure = null;
    },
  };
}

const fix = (lat: number, lon: number, timestamp: number, speed?: number) => ({
  coords: { latitude: lat, longitude: lon, speed },
  timestamp,
});

describe('Location capture engine (F-1103)', () => {
  let fake: ReturnType<typeof createFakeGeolocation>;
  let points: CapturedLocation[];

  beforeEach(() => {
    fake = createFakeGeolocation();
    points = [];
  });

  const capture = (overrides: Partial<Parameters<typeof createLocationCapture>[0]> = {}) =>
    createLocationCapture({
      geolocation: fake.geolocation,
      onPoint: (point) => points.push(point),
      ...overrides,
    });

  it('captures a point with a device timestamp from the fix, not the receive time', () => {
    const engine = capture();
    engine.start();

    const deviceTime = Date.UTC(2026, 9, 18, 7, 30, 15);
    fake.geolocation.emit(fix(5.85, 36.4, deviceTime));

    expect(points).toHaveLength(1);
    expect(points[0].latitude).toBe(5.85);
    expect(points[0].longitude).toBe(36.4);
    // The backend sorts replayed batches on recordedAt, so it must be the device clock.
    expect(points[0].recordedAt).toBe('2026-10-18T07:30:15.000Z');
  });

  it('falls back to the injected clock when the fix carries no usable timestamp', () => {
    const engine = capture({ now: () => Date.UTC(2026, 0, 2, 3, 4, 5) });
    engine.start();

    fake.geolocation.emit({ coords: { latitude: 5.85, longitude: 36.4 }, timestamp: Number.NaN });

    expect(points[0].recordedAt).toBe('2026-01-02T03:04:05.000Z');
  });

  it('omits speed when the device does not report one, since the backend allows null', () => {
    const engine = capture();
    engine.start();
    fake.geolocation.emit(fix(5.85, 36.4, 1_000_000));
    expect(points[0]).not.toHaveProperty('speed');

    points = [];
    const engine2 = capture();
    engine2.start();
    fake.geolocation.emit(fix(5.86, 36.4, 2_000_000, 4.2));
    expect(points[0].speed).toBe(4.2);
  });

  it('asks for low-accuracy, cached-tolerant fixes to save battery', () => {
    const engine = capture();
    engine.start();

    const options = fake.getOptions();
    expect(options?.enableHighAccuracy).toBe(false);
    expect(options?.maximumAge).toBeGreaterThan(0);
    expect(options?.timeout).toBeGreaterThan(0);
    expect(DEFAULT_INTERVAL_MS).toBe(30_000);
  });

  it('throttles bursts of fixes to one point per interval', () => {
    const engine = capture({ intervalMs: 30_000 });
    engine.start();

    const base = 1_700_000_000_000;
    // Ten fixes inside one second, as a stationary device would produce.
    for (let i = 0; i < 10; i += 1) {
      fake.geolocation.emit(fix(5.85 + i * 0.0001, 36.4, base + i * 100));
    }
    expect(points).toHaveLength(1);

    // Once the interval has elapsed, the next fix is accepted.
    fake.geolocation.emit(fix(5.851, 36.4, base + 31_000));
    expect(points).toHaveLength(2);
  });

  it('ignores a repeated fix the browser replays', () => {
    const engine = capture({ intervalMs: 0 });
    engine.start();

    const t = 1_700_000_000_000;
    fake.geolocation.emit(fix(5.85, 36.4, t));
    fake.geolocation.emit(fix(5.85, 36.4, t));
    fake.geolocation.emit(fix(5.85, 36.4, t - 5_000));

    expect(points).toHaveLength(1);
  });

  it('drops a fix implying an impossible jump, then keeps the next sane one', () => {
    const engine = capture({ intervalMs: 0 });
    engine.start();

    const base = 1_700_000_000_000;
    fake.geolocation.emit(fix(5.85, 36.4, base));
    // ~1000 km away one second later.
    fake.geolocation.emit(fix(15.0, 45.0, base + 1_000));
    expect(points).toHaveLength(1);

    // ~111 m in 10 s is about 40 km/h, a plausible road speed.
    fake.geolocation.emit(fix(5.851, 36.4, base + 10_000));
    expect(points).toHaveLength(2);
  });

  it('rejects non-finite and out-of-range coordinates', () => {
    const engine = capture({ intervalMs: 0 });
    engine.start();

    const base = 1_700_000_000_000;
    fake.geolocation.emit(fix(Number.NaN, 36.4, base));
    fake.geolocation.emit(fix(5.85, Number.POSITIVE_INFINITY, base + 1_000));
    fake.geolocation.emit(fix(120, 36.4, base + 2_000));
    fake.geolocation.emit(fix(5.85, 200, base + 3_000));

    expect(points).toHaveLength(0);
  });

  it('clears the watch on stop, and is safe to start or stop twice', () => {
    const engine = capture();
    engine.start();
    expect(fake.isWatching()).toBe(true);

    // A second start must not create a second watch.
    engine.start();
    expect(fake.cleared).toHaveLength(0);

    engine.stop();
    expect(fake.cleared).toHaveLength(1);
    expect(fake.isWatching()).toBe(false);
    expect(engine.isWatching()).toBe(false);

    // Stopping again must not clear a watch that no longer exists.
    engine.stop();
    expect(fake.cleared).toHaveLength(1);
  });

  it('reports a permission denial and a timeout through onError', () => {
    const onError = vi.fn();
    const engine = capture({ onError });
    engine.start();

    fake.failWith(PERMISSION_DENIED, 'User denied Geolocation');
    fake.failWith(TIMEOUT, 'Timeout expired');

    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0][0].code).toBe(PERMISSION_DENIED);
    expect(onError.mock.calls[1][0].code).toBe(TIMEOUT);
  });

  it('produces points that satisfy the backend LocationIngestionRequest shape', () => {
    const engine = capture();
    engine.start();
    fake.geolocation.emit(fix(5.85, 36.4, 1_700_000_000_000, 3.3));

    const point = points[0];
    expect(Object.keys(point).sort()).toEqual(
      ['latitude', 'longitude', 'recordedAt', 'speed'].sort()
    );
    expect(typeof point.latitude).toBe('number');
    expect(typeof point.longitude).toBe('number');
    expect(typeof point.recordedAt).toBe('string');
    // Must round-trip as an ISO instant, the way the backend parses Instant.
    expect(new Date(point.recordedAt).toISOString()).toBe(point.recordedAt);
  });

  it('measures distance with the haversine formula', () => {
    // Jinka to Dimeka is roughly 15 km.
    const metres = haversineMetres(5.7833, 36.0833, 5.7167, 36.1667);
    expect(metres).toBeGreaterThan(10_000);
    expect(metres).toBeLessThan(20_000);
    expect(haversineMetres(5.85, 36.4, 5.85, 36.4)).toBe(0);
  });
});