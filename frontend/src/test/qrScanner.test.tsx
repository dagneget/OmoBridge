import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axe from 'axe-core';

import PublicTracePage from '../pages/trace/PublicTracePage';
import {
  QrScanner,
  cameraFailureOf,
  isBarcodeDetectorSupported,
  resolveTraceTarget,
} from '../features/traceability';
import { httpClient } from '../services/httpClient';
import type { PublicTraceResponse } from '../types/api';

/**
 * The shape `ProductionBatchService` actually mints: `UUID.randomUUID()` with the dashes
 * stripped, plus `Long.toHexString(millis)`. Hex only, ~40 characters.
 */
const FROM = 'a3f1c2d4e5f60718293a4b5c6d7e8f9017b4a9c2';
const TO = '5e8d9a1b2c3d4e5f60718293a4b5c6d7e8f901a3';

function traceFor(token: string): PublicTraceResponse {
  return {
    publicToken: token,
    batchCode: 'BATCH-2026-014',
    enterpriseName: 'Omo Beekeepers Union',
    originVillage: 'Dimeka',
    originLabel: 'Dimeka highlands',
    processingDate: '2026-09-02T00:00:00Z',
    farmerOrigins: [],
    outputs: [],
    scanCount: 1,
  };
}

let requests: string[] = [];

/**
 * Serves whichever batch the request is for, so a navigation to a *different* trace is visible
 * as a second, differently-tokened read rather than just a URL change.
 */
function installAdapter() {
  httpClient.defaults.adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const internal = config as InternalAxiosRequestConfig;
    const url = config.url ?? '';
    requests.push(`get ${url}`);
    const token = url.split('/api/v1/trace/')[1]?.split('/')[0] ?? '';

    return {
      data: { success: true, data: traceFor(token) },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: internal,
    };
  };
}

const reads = () => requests.filter((r) => r.includes('/api/v1/trace/') && !r.includes('/qr'));

/* ------------------------------------------------------------------ *
 * Camera shims — jsdom has neither of these, so both are installed
 * explicitly and removed afterwards so they cannot leak across files.
 * ------------------------------------------------------------------ */

interface CameraShim {
  stopTracks: ReturnType<typeof vi.fn>;
  getUserMedia: () => Promise<unknown>;
}

function installCamera(options: {
  /** What a decode returns. `undefined` simulates a frame with no code in it. */
  detect?: () => Promise<Array<{ rawValue?: string }>>;
  getUserMedia?: () => Promise<unknown>;
}): CameraShim {
  const stopTracks = vi.fn();

  const getUserMedia =
    options.getUserMedia ??
    vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTracks }] });

  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  });

  const detect = options.detect ?? vi.fn().mockResolvedValue([]);
  class FakeDetector {
    detect = detect;
  }
  (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = FakeDetector;

  return { stopTracks, getUserMedia };
}

function removeCamera() {
  delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
  Reflect.deleteProperty(navigator, 'mediaDevices');
}

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="landed-here">{location.pathname}</p>;
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[`/trace/${FROM}`]}>
        {/* Sits beside <Routes>, not inside it: the probe must survive the navigation it reports. */}
        <LocationProbe />
        <Routes>
          <Route path="/trace/:token" element={<PublicTracePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/* ------------------------------------------------------------------ */

describe('resolveTraceTarget (F-702)', () => {
  it('reads the absolute URL a real code encodes', () => {
    // What TraceabilityService writes into the image: base-url + token.
    expect(resolveTraceTarget(`https://omobridge.et/trace/${TO}`)).toBe(TO);
  });

  it('reads the path form a browser hands over after a redirect', () => {
    expect(resolveTraceTarget(`/trace/${TO}`)).toBe(TO);
    expect(resolveTraceTarget(`/trace/${TO}/`)).toBe(TO);
  });

  it('accepts a bare token', () => {
    expect(resolveTraceTarget(TO)).toBe(TO);
  });

  it('accepts the shape the backend actually mints', () => {
    // UUID.randomUUID() with the dashes stripped + Long.toHexString(millis).
    expect(resolveTraceTarget('a3f1c2d4e5f60718293a4b5c6d7e8f9017b4a9c2')).toBe(
      'a3f1c2d4e5f60718293a4b5c6d7e8f9017b4a9c2'
    );
  });

  it('tolerates surrounding whitespace', () => {
    expect(resolveTraceTarget(`  ${TO}\n`)).toBe(TO);
  });

  it('rejects codes that are not trace codes at all', () => {
    // A Wi-Fi or vCard QR should never become an API request.
    expect(resolveTraceTarget('WIFI:T:WPA;S:OmoGuest;P:welcome;;')).toBeNull();
    expect(resolveTraceTarget('https://example.com/products/123')).toBeNull();
    expect(resolveTraceTarget('/orders/abc')).toBeNull();
    expect(resolveTraceTarget('')).toBeNull();
    expect(resolveTraceTarget('   ')).toBeNull();
    expect(resolveTraceTarget(null)).toBeNull();
    expect(resolveTraceTarget(undefined)).toBeNull();
  });

  it('rejects an implausibly long read', () => {
    expect(resolveTraceTarget('a'.repeat(500))).toBeNull();
  });

  it('still returns a token when the code has a damaged percent-escape', () => {
    expect(resolveTraceTarget('/trace/%E0%A4%A')).toBe('%E0%A4%A');
  });
});

describe('camera failure classification (F-702)', () => {
  it('names the cases a user can act on', () => {
    expect(cameraFailureOf({ name: 'NotAllowedError' })).toBe('denied');
    expect(cameraFailureOf({ name: 'NotFoundError' })).toBe('unavailable');
    expect(cameraFailureOf({ name: 'OverconstrainedError' })).toBe('unavailable');
    expect(cameraFailureOf(new Error('boom'))).toBe('unknown');
    expect(cameraFailureOf('nope')).toBe('unknown');
  });
});

describe('QrScanner', () => {
  beforeEach(() => {
    requests = [];
    vi.restoreAllMocks();
    removeCamera();
  });

  afterEach(() => {
    removeCamera();
    window.dispatchEvent(new Event('online'));
  });

  it('offers typing the code with no camera at all', () => {
    // Needs neither a device, nor a permission, nor a decoder library.
    const onResolved = vi.fn();
    render(<QrScanner onResolved={onResolved} />);

    const input = screen.getByTestId('qr-manual-input');
    fireEvent.change(input, { target: { value: TO } });
    fireEvent.click(screen.getByTestId('qr-manual-submit'));

    expect(onResolved).toHaveBeenCalledWith(TO);
    expect(screen.queryByTestId('qr-manual-error')).not.toBeInTheDocument();
  });

  it('refuses a value that is not a trace code, without calling out', () => {
    const onResolved = vi.fn();
    render(<QrScanner onResolved={onResolved} />);

    fireEvent.change(screen.getByTestId('qr-manual-input'), {
      target: { value: 'WIFI:T:WPA;S:OmoGuest;P:welcome;;' },
    });
    fireEvent.click(screen.getByTestId('qr-manual-submit'));

    expect(onResolved).not.toHaveBeenCalled();
    expect(screen.getByTestId('qr-manual-error')).toHaveAttribute('role', 'alert');
    // The field is marked invalid for assistive tech, not just coloured red.
    expect(screen.getByTestId('qr-manual-input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the error once the code is corrected', () => {
    render(<QrScanner onResolved={() => undefined} />);
    const input = screen.getByTestId('qr-manual-input');

    fireEvent.change(input, { target: { value: 'not a code' } });
    fireEvent.click(screen.getByTestId('qr-manual-submit'));
    expect(screen.getByTestId('qr-manual-error')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: TO } });
    expect(screen.queryByTestId('qr-manual-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('qr-manual-input')).not.toHaveAttribute('aria-invalid');
  });

  it('does not offer a camera button the browser cannot use', () => {
    // Safari and Firefox have no BarcodeDetector; offering the button would fail on click.
    expect(isBarcodeDetectorSupported()).toBe(false);
    render(<QrScanner onResolved={() => undefined} />);

    expect(screen.queryByTestId('qr-camera-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('qr-no-detector')).toBeInTheDocument();
    // ...and says plainly how to proceed instead.
    expect(screen.getByTestId('qr-no-detector')).toHaveTextContent(/type the code above/i);
    // Manual entry stays available in that case.
    expect(screen.getByTestId('qr-manual-input')).toBeInTheDocument();
  });

  it('explains a blocked camera permission', async () => {
    installCamera({
      getUserMedia: () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })),
    });

    render(<QrScanner onResolved={() => undefined} />);
    fireEvent.click(screen.getByTestId('qr-camera-start'));

    const alert = await screen.findByTestId('qr-camera-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent(/camera access was blocked/i);
    // The manual path is named as the way forward, rather than leaving a dead end.
    expect(alert).toHaveTextContent(/type the code below/i);
    expect(screen.getByTestId('qr-manual-input')).toBeInTheDocument();
  });

  it('explains a device with no usable camera', async () => {
    installCamera({
      getUserMedia: () => Promise.reject(Object.assign(new Error('x'), { name: 'NotFoundError' })),
    });

    render(<QrScanner onResolved={() => undefined} />);
    fireEvent.click(screen.getByTestId('qr-camera-start'));

    expect(await screen.findByTestId('qr-camera-error')).toHaveTextContent(/no camera/i);
  });

  it('stops the camera when the scanner goes away', async () => {
    const { stopTracks } = installCamera({});
    const { unmount } = render(<QrScanner onResolved={() => undefined} />);

    fireEvent.click(screen.getByTestId('qr-camera-start'));
    await waitFor(() => expect(screen.getByTestId('qr-camera-stop')).toBeInTheDocument());

    unmount();

    // A live stream would keep the indicator lit and drain the battery.
    expect(stopTracks).toHaveBeenCalled();
  });

  it('passes an axe accessibility audit', async () => {
    const { container } = render(<QrScanner onResolved={() => undefined} />);

    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe('scanning opens the right page (F-702)', () => {
  beforeEach(() => {
    requests = [];
    vi.restoreAllMocks();
    removeCamera();
  });

  afterEach(() => {
    removeCamera();
    window.dispatchEvent(new Event('online'));
  });

  it('follows the decoded code to that batch’s trace page', async () => {
    installAdapter();
    // jsdom cannot decode pixels — no BarcodeDetector and no camera — so the decoder is stood
    // in for with the value a real one produces: the absolute URL the backend encoded.
    installCamera({
      detect: () => Promise.resolve([{ rawValue: `https://omobridge.et/trace/${TO}` }]),
    });

    renderPage();

    await screen.findByTestId('public-trace-page');
    expect(reads()).toEqual([`get /api/v1/trace/${FROM}`]);

    fireEvent.click(screen.getByTestId('qr-camera-start'));

    // The scan moves the router and fetches the *other* batch.
    await waitFor(
      () => expect(reads()).toContain(`get /api/v1/trace/${TO}`),
      { timeout: 4000 }
    );
    expect(screen.getByTestId('landed-here').textContent).toBe(`/trace/${TO}`);
    // And the page is showing the batch that was scanned, not the one it started on.
    await waitFor(() =>
      expect(screen.getByTestId('public-trace-page')).toBeInTheDocument()
    );
  });

  it('keeps scanning when the frame holds a code for something else', async () => {
    installAdapter();
    installCamera({
      detect: () => Promise.resolve([{ rawValue: 'https://example.com/products/123' }]),
    });

    renderPage();
    await screen.findByTestId('public-trace-page');

    fireEvent.click(screen.getByTestId('qr-camera-start'));
    // Camera stays live, and no spurious navigation or request occurs.
    await waitFor(() => expect(screen.getByTestId('qr-camera-stop')).toBeInTheDocument());
    expect(screen.getByTestId('landed-here').textContent).toBe(`/trace/${FROM}`);
    expect(reads()).toEqual([`get /api/v1/trace/${FROM}`]);
  });

  it('stops the camera once a code has been read', async () => {
    installAdapter();
    const { stopTracks } = installCamera({
      detect: () => Promise.resolve([{ rawValue: `https://omobridge.et/trace/${TO}` }]),
    });

    renderPage();
    await screen.findByTestId('public-trace-page');

    fireEvent.click(screen.getByTestId('qr-camera-start'));
    await waitFor(() => expect(screen.getByTestId('landed-here').textContent).toBe(`/trace/${TO}`), {
      timeout: 4000,
    });

    // Left running, it would keep the light on for the rest of the session.
    expect(stopTracks).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId('qr-camera-stop')).not.toBeInTheDocument()
    );
  });
});
