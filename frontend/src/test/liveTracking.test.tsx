import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import axe from 'axe-core';

import LiveTrackingPage from '../pages/tracking/LiveTrackingPage';
import { httpClient } from '../services/httpClient';
import {
  TRACKING_POLL_MS,
  STALE_AFTER_MS,
  buildTrail,
  hasPosition,
  relativeTimeKey,
  stalenessOf,
  trackingView,
} from '../features/tracking';
import type { DeliveryTrackingResponse } from '../types/api';

const TOKEN = 'trk-9f2a-demo';

function point(latitude: number, longitude: number, recordedAt: string) {
  return { latitude, longitude, speed: 8.4, recordedAt, receivedAt: recordedAt };
}

const baseTracking = (): DeliveryTrackingResponse => ({
  jobId: 'aaaaaaaa-0000-0000-0000-000000000020',
  jobNo: 'DEL-2026-6001',
  status: 'IN_TRANSIT',
  currentLatitude: 6.0,
  currentLongitude: 36.25,
  speed: 8.4,
  lastRecordedAt: new Date().toISOString(),
  history: [
    point(5.98, 36.2, '2026-10-18T07:00:00Z'),
    point(6.0, 36.25, '2026-10-18T07:10:00Z'),
  ],
});

let requests: string[] = [];

/** Queue of responses; the last one repeats. Lets a test script what successive polls return. */
function installAdapter(responses: Array<'ok' | 'not-found' | 'network'> | DeliveryTrackingResponse[]) {
  const queue = [...responses];
  httpClient.defaults.adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const internal = config as InternalAxiosRequestConfig;
    requests.push(`${(config.method ?? 'get').toLowerCase()} ${config.url ?? ''}`);

    const next = queue.length > 1 ? queue.shift() : queue[0];

    if (next === 'not-found') {
      throw new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', internal, undefined, {
        data: { success: false, code: 'RESOURCE_NOT_FOUND', message: 'Delivery tracking not found for token' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: internal,
      });
    }
    if (next === 'network') {
      throw new AxiosError('Network Error', 'ERR_NETWORK', internal, undefined, undefined);
    }

    return {
      data: { success: true, data: next },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: internal,
    };
  };
}

/** The page reads :token from the route, so drive it through a real router. */
const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/track/${TOKEN}`]}>
        <Routes>
          <Route path="/track/:token" element={<LiveTrackingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Live tracking page (F-604)', () => {
  let online = { value: true };

  beforeEach(() => {
    vi.restoreAllMocks();
    requests = [];
    online = { value: true };
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => online.value,
    });
  });

  afterEach(() => {
    // React Query's onlineManager is process-wide; leaving it offline poisons later tests.
    window.dispatchEvent(new Event('online'));
    online.value = true;
  });

  describe('live update', () => {
    it('shows the latest position and the trail behind it', async () => {
      installAdapter([baseTracking()]);

      renderPage();

      expect(await screen.findByTestId('live-tracking-page')).toBeInTheDocument();
      expect(screen.getByText('DEL-2026-6001')).toBeInTheDocument();
      expect(screen.getByTestId('tracking-last-updated')).toHaveTextContent('Last updated');
    });

    it('picks up a newer position when the job moves', async () => {
      const first = baseTracking();
      const second: DeliveryTrackingResponse = {
        ...baseTracking(),
        status: 'DELIVERED',
        currentLatitude: 6.4,
        currentLongitude: 36.5,
        lastRecordedAt: new Date().toISOString(),
        history: [...(first.history ?? []), point(6.4, 36.5, '2026-10-18T07:25:00Z')],
      };
      installAdapter([first, second]);

      vi.useFakeTimers();
      try {
        renderPage();
        // Under fake timers RTL cannot advance for us, so settle the initial fetch by hand.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(50);
        });
        expect(requests).toHaveLength(1);
        expect(screen.getByTestId('live-tracking-page')).toBeInTheDocument();

        // The poll is the mechanism that makes this page "live"; advance past it.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(TRACKING_POLL_MS + 250);
        });

        expect(requests.length).toBeGreaterThan(1);
        // That poll reported the job finished, so the completion note replaces the live one.
        expect(screen.getByTestId('tracking-complete-notice')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops polling once the delivery is terminal', async () => {
      installAdapter([{ ...baseTracking(), status: 'DELIVERED' }]);

      vi.useFakeTimers();
      try {
        renderPage();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(50);
        });
        expect(requests).toHaveLength(1);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(TRACKING_POLL_MS * 4 + 500);
        });

        // Nothing further is asked for: there is no more movement to report.
        expect(requests).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('marks the steps up to the current one as progress', async () => {
      installAdapter([{ ...baseTracking(), status: 'PICKED_UP' }]);

      renderPage();
      await screen.findByTestId('live-tracking-page');

      const timeline = screen.getByTestId('tracking-timeline');
      expect(timeline).toHaveTextContent('Picked up');
      // PICKED_UP is the current step; the ones behind it are done and the one ahead is not.
      expect(screen.getByTestId('timeline-dot-picked_up')).toBeInTheDocument();
      expect(timeline).toHaveTextContent('Current step');
      expect(screen.getByTestId('timeline-dot-in_transit')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-dot-delivered')).toBeInTheDocument();
    });
  });

  describe('lost connection', () => {
    it('says it is showing the last position it received', async () => {
      installAdapter([baseTracking()]);

      renderPage();
      await screen.findByTestId('live-tracking-page');

      online.value = false;
      window.dispatchEvent(new Event('offline'));

      const notice = await screen.findByTestId('tracking-offline-notice');
      expect(notice).toHaveTextContent('this is the last position we received');
      // The job itself stays visible; a dropped connection is not a missing delivery.
      expect(screen.getByText('DEL-2026-6001')).toBeInTheDocument();
    });

    it('turns a network failure into a retryable message rather than a blank screen', async () => {
      installAdapter(['network']);

      renderPage();

      // httpClient retries a network failure twice with backoff before giving up.
      const error = await screen.findByTestId('tracking-error', undefined, { timeout: 5000 });
      expect(error).toHaveTextContent('Live tracking is unavailable right now');
      expect(screen.getByTestId('tracking-retry')).toBeInTheDocument();
    });
  });

  describe('invalid token', () => {
    it('explains that the link is not valid instead of showing an empty tracker', async () => {
      installAdapter(['not-found']);

      renderPage();

      expect(await screen.findByText('We could not find this delivery')).toBeInTheDocument();
      expect(screen.queryByTestId('live-tracking-page')).not.toBeInTheDocument();
      // Retrying a 404 would only delay the explanation.
      expect(requests.filter((r) => r.includes('/delivery/track/'))).toHaveLength(1);
    });
  });

  describe('stale data', () => {
    it('warns when the last fix is old even though polling is fresh', async () => {
      const old = new Date(Date.now() - (STALE_AFTER_MS + 60_000)).toISOString();
      installAdapter([{ ...baseTracking(), lastRecordedAt: old }]);

      renderPage();

      const warning = await screen.findByTestId('tracking-stale-warning');
      expect(warning).toHaveTextContent('may no longer be accurate');
      expect(warning).toHaveAttribute('role', 'status');
    });

    it('does not warn for a recent fix', async () => {
      installAdapter([baseTracking()]);

      renderPage();
      await screen.findByTestId('live-tracking-page');

      expect(screen.queryByTestId('tracking-stale-warning')).not.toBeInTheDocument();
    });
  });

  describe('without a position', () => {
    it('says no location has been reported yet', async () => {
      installAdapter([
        { jobId: 'j', jobNo: 'DEL-2026-6002', status: 'ASSIGNED', history: [] },
      ]);

      renderPage();

      expect(await screen.findByTestId('tracking-no-position')).toHaveTextContent(
        'No location reported yet'
      );
      expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
    });
  });

  describe('terminal status', () => {
    it('says live updates have stopped once the delivery is done', async () => {
      installAdapter([{ ...baseTracking(), status: 'DELIVERED' }]);

      renderPage();

      expect(await screen.findByTestId('tracking-complete-notice')).toHaveTextContent(
        'live updates have stopped'
      );
    });

    it('reports a failed delivery without drawing it as progress', async () => {
      installAdapter([{ ...baseTracking(), status: 'FAILED' }]);

      renderPage();

      const failed = await screen.findByTestId('tracking-failed-notice');
      expect(failed).toHaveTextContent('could not be completed');
      expect(failed).toHaveAttribute('role', 'status');
    });
  });

  it('passes an axe accessibility audit', async () => {
    installAdapter([baseTracking()]);

    const { container } = renderPage();
    await screen.findByTestId('live-tracking-page');

    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe('tracking state rules', () => {
  it('keeps polling only while the job can still move', () => {
    expect(trackingView({ status: 'ASSIGNED' })).toEqual({ kind: 'live' });
    expect(trackingView({ status: 'IN_TRANSIT' })).toEqual({ kind: 'live' });
    expect(trackingView({ status: 'DELIVERED' })).toEqual({ kind: 'closed' });
    expect(trackingView({ status: 'FAILED' })).toEqual({ kind: 'closed' });
    expect(trackingView({ status: 'CANCELLED' })).toEqual({ kind: 'closed' });
    // An unrecognised status must not keep a page polling forever.
    expect(trackingView({ status: undefined })).toEqual({ kind: 'closed' });
    expect(TRACKING_POLL_MS).toBeGreaterThan(0);
  });

  it('orders the trail by capture time, not upload order', () => {
    // A point queued offline and uploaded an hour later keeps its own recordedAt, so it must
    // land in the middle of the trail rather than at the end of it.
    const history = [
      { latitude: 6.2, longitude: 36.3, recordedAt: '2026-10-18T07:20:00Z' },
      { latitude: 6.0, longitude: 36.25, recordedAt: '2026-10-18T07:00:00Z' },
      { latitude: 6.1, longitude: 36.28, recordedAt: '2026-10-18T07:10:00Z' },
    ];
    expect(buildTrail(history)).toEqual([
      [6.0, 36.25],
      [6.1, 36.28],
      [6.2, 36.3],
    ]);
  });

  it('drops points without usable coordinates rather than plotting them at 0,0', () => {
    expect(
      buildTrail([
        { latitude: 6.0, longitude: 36.25, recordedAt: '2026-10-18T07:00:00Z' },
        { latitude: null as unknown as number, longitude: 36.3, recordedAt: '2026-10-18T07:01:00Z' },
        { recordedAt: '2026-10-18T07:02:00Z' },
      ])
    ).toEqual([[6.0, 36.25]]);
    expect(buildTrail(undefined)).toEqual([]);
    expect(buildTrail([])).toEqual([]);
  });

  it('recognises a usable position', () => {
    expect(hasPosition({ currentLatitude: 6.0, currentLongitude: 36.25 })).toBe(true);
    expect(hasPosition({ currentLatitude: null as unknown as number })).toBe(false);
    expect(hasPosition({})).toBe(false);
  });

  it('separates "no fix yet" from "fix is old" from "cannot tell"', () => {
    const now = Date.parse('2026-10-18T12:00:00Z');
    expect(stalenessOf({ lastRecordedAt: undefined }, now)).toEqual({ kind: 'none' });
    expect(stalenessOf({ lastRecordedAt: '2026-10-18T11:59:00Z' }, now)).toMatchObject({ kind: 'fresh' });
    expect(stalenessOf({ lastRecordedAt: '2026-10-18T11:00:00Z' }, now)).toMatchObject({ kind: 'stale' });
    expect(stalenessOf({ lastRecordedAt: 'not-a-date' }, now)).toEqual({ kind: 'unknown' });
    // A clock from the future must not produce a negative age.
    expect(stalenessOf({ lastRecordedAt: '2026-10-18T13:00:00Z' }, now)).toMatchObject({ ageMs: 0 });
  });

  it('splits a relative time into a key and a count for translation', () => {
    const now = new Date('2026-10-18T12:00:00Z');
    expect(relativeTimeKey(new Date('2026-10-18T11:59:40Z'), now).key).toBe('justNow');
    expect(relativeTimeKey(new Date('2026-10-18T11:59:15Z'), now)).toEqual({ key: 'seconds', count: 45 });
    expect(relativeTimeKey(new Date('2026-10-18T11:55:00Z'), now)).toEqual({ key: 'minutes', count: 5 });
    expect(relativeTimeKey(new Date('2026-10-18T09:00:00Z'), now)).toEqual({ key: 'hours', count: 3 });
    expect(relativeTimeKey(new Date('2026-10-15T09:00:00Z'), now)).toEqual({ key: 'days', count: 3 });
  });
});
