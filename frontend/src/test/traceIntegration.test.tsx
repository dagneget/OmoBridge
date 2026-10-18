import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import PublicTracePage from '../pages/trace/PublicTracePage';
import { httpClient } from '../services/httpClient';
import type { PublicFarmerOriginResponse, PublicTraceResponse } from '../types/api';

const TOKEN = 'trace-honey-001';

/**
 * The default `app.traceability.base-url`. What the QR actually encodes is the backend's config,
 * but this is the value `TraceabilityService` falls back to and it must resolve into this app.
 */
const ENCODED_BASE = 'https://omobridge.et/trace/';

/**
 * A withheld name arrives as an explicit JSON `null` on the wire (the generated schema only
 * allows `undefined` — that drift is logged as F-701-E1 and covered in `publicTrace.test.tsx`).
 * `undefined` is used here for the same rendering outcome, since both are read as "not provided".
 */
const traceWith = (
  farmerOrigins: PublicFarmerOriginResponse[],
  overrides: Partial<PublicTraceResponse> = {}
): PublicTraceResponse => ({
  publicToken: TOKEN,
  batchCode: 'BATCH-2026-014',
  enterpriseName: 'Omo Beekeepers Union',
  originVillage: 'Dimeka',
  originLabel: 'Dimeka highlands',
  processingDate: '2026-09-02T00:00:00Z',
  publicStory: 'Harvested from forest honey in the Mago corridor.',
  farmerOrigins,
  outputs: [],
  scanCount: 7,
  ...overrides,
});

let requests: string[] = [];

function installAdapter(payload: PublicTraceResponse | 'not-found') {
  httpClient.defaults.adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const internal = config as InternalAxiosRequestConfig;
    requests.push(`get ${config.url ?? ''}`);

    if (payload === 'not-found') {
      throw new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', internal, undefined, {
        data: { success: false, code: 'RESOURCE_NOT_FOUND' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: internal,
      });
    }

    return {
      data: { success: true, data: payload },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: internal,
    };
  };
}

const traceReads = () => requests.filter((r) => r.includes('/api/v1/trace/') && !r.includes('/qr'));

/** Reuse one client across mounts so the cache survives an unmount, as it does in a session. */
const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

function mount(client: QueryClient, initialEntry = `/trace/${TOKEN}`) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/trace/:token" element={<PublicTracePage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Reports where the router actually landed, for the round-trip assertion. */
function LocationProbe() {
  const location = useLocation();
  return <p data-testid="landed-here">{location.pathname}</p>;
}

describe('Trace integration (F-704)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requests = [];
  });

  afterEach(() => {
    window.dispatchEvent(new Event('online'));
  });

  describe('consent states', () => {
    it('shows a name only for the growers who consented, never for the others', async () => {
      installAdapter(
        traceWith([
          { village: 'Dimeka', cooperativeGroup: 'Omo Beekeepers Union', farmerName: 'Almaz T.' },
          { village: 'Turmi', cooperativeGroup: 'Turmi Growers', farmerName: undefined },
          { village: 'Kibish', cooperativeGroup: 'Kibish Group', farmerName: 'Bekele W.' },
        ])
      );

      mount(makeClient());

      await screen.findByTestId('public-trace-page');
      const farmers = screen.getByTestId('trace-farmers');

      // Consent is per grower, so one published name must not publish the others.
      const names = screen.getAllByTestId('trace-farmer-name').map((el) => el.textContent);
      expect(names.sort()).toEqual(['Almaz T.', 'Bekele W.']);

      // Every origin keeps its group, including the grower who withheld their name.
      expect(farmers).toHaveTextContent('Omo Beekeepers Union');
      expect(farmers).toHaveTextContent('Turmi Growers');
      expect(farmers).toHaveTextContent('Kibish Group');
      // Three origins, but only two names — consent is per grower, not per batch.
      expect(farmers.querySelectorAll('li')).toHaveLength(3);
      expect(screen.getAllByTestId('trace-farmer-name')).toHaveLength(2);
      // Somebody consented, so the "chosen not to publish" notice must not appear.
      expect(screen.queryByTestId('trace-names-withheld')).not.toBeInTheDocument();
    });

    it('explains the withholding when nobody consented', async () => {
      installAdapter(
        traceWith([
          { village: 'Dimeka', cooperativeGroup: 'Omo Beekeepers Union', farmerName: undefined },
          { village: 'Turmi', cooperativeGroup: 'Turmi Growers', farmerName: undefined },
        ])
      );

      mount(makeClient());

      const notice = await screen.findByTestId('trace-names-withheld');
      expect(notice).toHaveTextContent('chosen not to publish their names');
      expect(screen.queryByTestId('trace-farmer-name')).not.toBeInTheDocument();
      // The origins themselves are still public — consent is about people, not places.
      expect(screen.getByTestId('trace-farmers')).toHaveTextContent('Dimeka');
      expect(screen.getByTestId('trace-farmers')).toHaveTextContent('Turmi');
    });

    it('says nothing about consent on a batch with no grower records at all', async () => {
      installAdapter(traceWith([]));

      mount(makeClient());

      await screen.findByTestId('public-trace-page');
      // There is nothing withheld, so claiming somebody opted out would be untrue.
      expect(screen.queryByTestId('trace-farmers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trace-names-withheld')).not.toBeInTheDocument();
    });
  });

  describe('QR round trip', () => {
    it('resolves the encoded QR address to this app’s trace route', async () => {
      // Exactly what TraceabilityService puts in the code: base-url + publicToken.
      const encoded = `${ENCODED_BASE}${TOKEN}`;
      expect(encoded).toBe(`https://omobridge.et/trace/${TOKEN}`);

      // A scanner hands the browser a URL; extract the path and follow it.
      const path = new URL(encoded).pathname;
      expect(path).toBe(`/trace/${TOKEN}`);

      installAdapter(traceWith([]));
      mount(makeClient(), path);

      // The route param reaches the page and is used to fetch the batch.
      expect(await screen.findByTestId('public-trace-page')).toBeInTheDocument();
      await waitFor(() => expect(traceReads()).toEqual([`get /api/v1/trace/${TOKEN}`]));
    });

    it('lands on the not-found explanation for a code the backend does not know', async () => {
      installAdapter('not-found');
      mount(makeClient(), `/trace/${TOKEN}`);

      expect(await screen.findByText('We could not verify this product')).toBeInTheDocument();
      expect(traceReads()).toHaveLength(1);
    });
  });

  describe('cached for offline after one visit', () => {
    it('serves a second visit from cache without touching the network', async () => {
      installAdapter(traceWith([]));
      const client = makeClient();

      const first = mount(client);
      await screen.findByTestId('public-trace-page');
      expect(traceReads()).toHaveLength(1);
      first.unmount();

      // Reading the page again with no connection must not produce an error screen: the batch
      // is already in memory from the one visit that succeeded.
      window.dispatchEvent(new Event('offline'));

      const second = mount(client);
      expect(await screen.findByTestId('public-trace-page')).toBeInTheDocument();
      expect(screen.queryByTestId('trace-error')).not.toBeInTheDocument();
      // Still one read — the second visit was answered from the cache.
      expect(traceReads()).toHaveLength(1);

      second.unmount();
      window.dispatchEvent(new Event('online'));
    });
  });

  describe('read once, because every call is recorded as a scan', () => {
    it('does not re-read when the window regains focus or the connection returns', async () => {
      installAdapter(traceWith([]));

      mount(makeClient());
      await screen.findByTestId('public-trace-page');
      expect(traceReads()).toHaveLength(1);

      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
      await new Promise((resolve) => setTimeout(resolve, 50));

      // TraceabilityService writes a TraceScan row per request; a refetch would inflate the
      // producer's scan count with nobody behind it.
      expect(traceReads()).toHaveLength(1);
    });
  });
});
