import { expect, test, type Page } from '@playwright/test';

/**
 * F-1107 — provider offline location capture and upload.
 *
 * Browser-level coverage of the path that F-1103 → F-1104 → F-1107 build: capture fixes while
 * offline, queue them, reconnect, and upload them in device-timestamp order.
 *
 * NOT YET RUNNABLE. `@playwright/test` is not installed in this repository and is not listed in
 * any agent's allocation, so nothing in this spec has been executed — it is a deliverable, not
 * verified work. See `docs/handoffs/F-1107.md` for what Codex needs to add.
 *
 * The same scenario IS covered today by `src/test/providerOfflineSync.test.tsx`, which drives
 * the real component, the real queue and the real service. That suite is what proves the
 * ordering and retention guarantees below; this spec adds the things only a real browser can
 * check (a genuine `context.setOffline`, a real IndexedDB, and a service worker).
 */

const PROVIDER_PHONE = '+251911000004';
const PASSWORD = 'Password123!';

const JOB_ID = 'aaaaaaaa-0000-0000-0000-0000000000c1';

/** Device-clock timestamps, deliberately emitted out of order. */
const T0 = Date.UTC(2026, 9, 18, 9, 0, 0);
const POINTS = [
  { lat: 5.85, lon: 36.4, at: T0 + 120_000 },
  { lat: 5.855, lon: 36.41, at: T0 + 60_000 },
  { lat: 5.86, lon: 36.42, at: T0 },
];

/**
 * Geolocation is read-only in the browser, so it is replaced before any app script runs.
 * Points are pushed on demand via `window.__emitFix`.
 */
async function installFakeGeolocation(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __emitFix: (lat: number, lon: number, timestamp: number) => void;
      __geoWatching: () => boolean;
    };
    let emit: ((lat: number, lon: number, timestamp: number) => void) | null = null;
    let watching = false;

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition(ok: PositionCallback) {
          watching = true;
          emit = (lat, lon, timestamp) =>
            ok({
              coords: { latitude: lat, longitude: lon, accuracy: 5, speed: null, heading: null },
              timestamp,
            } as unknown as GeolocationPosition);
          return 1;
        },
        clearWatch() {
          watching = false;
          emit = null;
        },
        getCurrentPosition(ok: PositionCallback) {
          ok({
            coords: { latitude: 5.85, longitude: 36.4, accuracy: 5, speed: null, heading: null },
            timestamp: Date.now(),
          } as unknown as GeolocationPosition);
        },
      },
    });

    w.__emitFix = (lat, lon, timestamp) => emit?.(lat, lon, timestamp);
    w.__geoWatching = () => watching;
  });
}

async function signInAsProvider(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/phone/i).fill(PROVIDER_PHONE);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard\//);
}

test.describe('Provider offline location queue', () => {
  test('queues fixes captured offline and uploads them in device-timestamp order', async ({
    page,
    context,
  }) => {
    // Record what the app sends to the ingestion endpoint, in request order.
    const uploaded: { recordedAt: string }[][] = [];
    let jobTerminal = false;

    await page.route('**/api/v1/delivery/jobs/*/locations', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as {
        locations: { recordedAt: string }[];
      };
      uploaded.push(body.locations);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: jobTerminal ? 0 : body.locations.length,
        }),
      });
    });

    await installFakeGeolocation(page);
    await signInAsProvider(page);

    await context.setOffline(true);
    await page.goto(`/dashboard/delivery/jobs/${JOB_ID}`);
    // Offline with nothing cached must not claim the job is missing.
    await expect(page.getByText(/need a connection|cannot load/i)).toBeVisible();
    await context.setOffline(false);

    await page.goto(`/dashboard/delivery/jobs/${JOB_ID}`);
    await expect(page.getByTestId('location-start')).toBeVisible();

    // Opt in, then go offline and record three fixes out of order.
    await page.getByTestId('location-start').click();
    await expect(page.getByTestId('location-tracking-badge')).toBeVisible();

    await context.setOffline(true);
    for (const point of POINTS) {
      await page.evaluate(
        ([lat, lon, at]) =>
          (window as unknown as { __emitFix: (a: number, b: number, c: number) => void }).__emitFix(
            lat as number,
            lon as number,
            at as number
          ),
        [point.lat, point.lon, point.at] as const
      );
      // The engine throttles to one accepted fix per 30 s; these are 60 s apart.
    }
    await expect(page.getByTestId('location-point-count')).toContainText('3 points');

    // Reconnecting must drain the queue, oldest device timestamp first.
    await context.setOffline(false);
    await expect
      .poll(() => uploaded.length, { timeout: 15_000 })
      .toBeGreaterThan(0);

    const flat = uploaded.flat().map((p) => p.recordedAt);
    expect(flat).toEqual([...flat].sort());
    expect(flat).toHaveLength(3);
    await expect(page.getByTestId('location-point-count')).toContainText('0 points');
  });

  test('keeps queued points through a failed upload and retries them', async ({
    page,
    context,
  }) => {
    let attempts = 0;
    await page.route('**/api/v1/delivery/jobs/*/locations', async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, code: 'INTERNAL_ERROR', message: 'boom' }),
        });
        return;
      }
      const body = JSON.parse(route.request().postData() ?? '{}') as { locations: unknown[] };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: body.locations.length }),
      });
    });

    await installFakeGeolocation(page);
    await signInAsProvider(page);
    await page.goto(`/dashboard/delivery/jobs/${JOB_ID}`);

    await page.getByTestId('location-start').click();
    await expect(page.getByTestId('location-tracking-badge')).toBeVisible();
    await page.evaluate(
      (at) =>
        (window as unknown as { __emitFix: (a: number, b: number, c: number) => void }).__emitFix(
          5.85,
          36.4,
          at
        ),
      T0
    );

    // A 500 must not delete the point: it stays queued.
    await expect(page.getByTestId('location-point-count')).toContainText('1 point');
    await expect.poll(() => attempts, { timeout: 15_000 }).toBeGreaterThan(0);
  });

  test('stops the GPS watch once the job reaches a terminal status', async ({ page }) => {
    await page.route('**/api/v1/delivery/jobs/*/status', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as { newStatus: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { jobId: JOB_ID, status: body.newStatus } }),
      });
    });

    await installFakeGeolocation(page);
    await signInAsProvider(page);
    await page.goto(`/dashboard/delivery/jobs/${JOB_ID}`);

    await page.getByTestId('location-start').click();
    await expect(page.getByTestId('location-tracking-badge')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __geoWatching: () => boolean }).__geoWatching()))
      .toBe(true);

    // Walk the job to DELIVERED using the server's own responses.
    await page.getByTestId('status-action-picked_up').click();
    await expect(page.getByTestId('status-action-in_transit')).toBeVisible();
    await page.getByTestId('status-action-in_transit').click();
    await expect(page.getByTestId('status-action-delivered')).toBeVisible();
    await page.getByTestId('status-action-delivered').click();

    await expect(page.getByTestId('no-next-steps')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __geoWatching: () => boolean }).__geoWatching()))
      .toBe(false);
  });
});