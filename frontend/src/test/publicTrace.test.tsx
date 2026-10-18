import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import axe from 'axe-core';

import PublicTracePage from '../pages/trace/PublicTracePage';
import { httpClient } from '../services/httpClient';
import {
  dedupeOrigins,
  formatOutputQuantity,
  hasAnyFarmerName,
  hasFarmerName,
  originGroupLabel,
  originHeading,
} from '../features/traceability';
import type { PublicTraceResponse } from '../types/api';

const TOKEN = 'trace-honey-001';

const baseTrace = (overrides: Partial<PublicTraceResponse> = {}): PublicTraceResponse => ({
  publicToken: TOKEN,
  batchCode: 'BATCH-2026-014',
  enterpriseName: 'Omo Beekeepers Union',
  originVillage: 'Dimeka',
  originLabel: 'Dimeka highlands',
  processingDate: '2026-09-02T00:00:00Z',
  publicStory: 'Harvested from forest honey in the Mago corridor.',
  farmerOrigins: [
    { village: 'Dimeka', cooperativeGroup: 'Omo Beekeepers Union', farmerName: 'Almaz T.' },
  ],
  outputs: [{ productName: 'Forest honey', quantity: 120, unit: 'kg', grade: 'A' }],
  scanCount: 42,
  ...overrides,
});

let requests: string[] = [];

function installAdapter(responses: Array<'not-found' | 'network' | PublicTraceResponse>) {
  const queue = [...responses];
  httpClient.defaults.adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const internal = config as InternalAxiosRequestConfig;
    requests.push(`${(config.method ?? 'get').toLowerCase()} ${config.url ?? ''}`);

    const next = queue.length > 1 ? queue.shift()! : queue[0];

    if (next === 'not-found') {
      throw new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', internal, undefined, {
        data: { success: false, code: 'RESOURCE_NOT_FOUND', message: 'Trace record not found' },
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

const traceRequests = () => requests.filter((r) => r.includes('/api/v1/trace/'));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/trace/${TOKEN}`]}>
        <Routes>
          <Route path="/trace/:token" element={<PublicTracePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Public trace page (F-701)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requests = [];
  });

  afterEach(() => {
    window.dispatchEvent(new Event('online'));
  });

  describe('farmer names present', () => {
    it('shows the name the API sent', async () => {
      installAdapter([baseTrace()]);

      renderPage();

      expect(await screen.findByTestId('public-trace-page')).toBeInTheDocument();
      expect(screen.getByTestId('trace-farmer-name')).toHaveTextContent('Almaz T.');
      // No withholding notice when a name is published.
      expect(screen.queryByTestId('trace-names-withheld')).not.toBeInTheDocument();
    });
  });

  describe('farmer names absent', () => {
    it('never invents a name from the group or the village', async () => {
      installAdapter([
        baseTrace({
          farmerOrigins: [
            { village: 'Dimeka', cooperativeGroup: 'Omo Beekeepers Union', farmerName: undefined },
          ],
        }),
      ]);

      renderPage();
      await screen.findByTestId('public-trace-page');

      expect(screen.queryByTestId('trace-farmer-name')).not.toBeInTheDocument();
      // The group is still shown — withholding a name is not withholding the origin.
      expect(screen.getByTestId('trace-farmers')).toHaveTextContent('Omo Beekeepers Union');
      expect(screen.getByTestId('trace-farmers')).toHaveTextContent('Dimeka');
    });

    it('says the growers chose not to be named', async () => {
      installAdapter([
        baseTrace({
          farmerOrigins: [
            { village: 'Turmi', cooperativeGroup: 'Turmi Growers', farmerName: '' },
          ],
        }),
      ]);

      renderPage();

      const notice = await screen.findByTestId('trace-names-withheld');
      expect(notice).toHaveTextContent('chosen not to publish their names');
    });

    it('does not mention withholding when at least one grower consented', async () => {
      installAdapter([
        baseTrace({
          farmerOrigins: [
            { village: 'Dimeka', cooperativeGroup: 'Group A', farmerName: 'Almaz T.' },
            { village: 'Turmi', cooperativeGroup: 'Group B', farmerName: undefined },
          ],
        }),
      ]);

      renderPage();
      await screen.findByTestId('public-trace-page');

      expect(screen.getByTestId('trace-farmer-name')).toHaveTextContent('Almaz T.');
      expect(screen.queryByTestId('trace-names-withheld')).not.toBeInTheDocument();
    });
  });

  describe('invalid token', () => {
    it('explains the code could not be verified', async () => {
      installAdapter(['not-found']);

      renderPage();

      expect(await screen.findByText('We could not verify this product')).toBeInTheDocument();
      expect(screen.queryByTestId('public-trace-page')).not.toBeInTheDocument();
      // A 404 is not retried: an unregistered code will not become registered by asking again.
      expect(traceRequests()).toHaveLength(1);
    });
  });

  describe('read once, because every call is recorded as a scan', () => {
    it('does not re-read when the window regains focus', async () => {
      installAdapter([baseTrace()]);

      renderPage();
      await screen.findByTestId('public-trace-page');
      expect(traceRequests()).toHaveLength(1);

      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The backend writes a TraceScan row per request, so a focus-refetch would inflate the
      // producer's scan count with nobody behind it.
      expect(traceRequests()).toHaveLength(1);
    });
  });

  describe('content', () => {
    it('shows origin, processing date, story and outputs', async () => {
      installAdapter([baseTrace()]);

      renderPage();
      await screen.findByTestId('public-trace-page');

      expect(screen.getByTestId('trace-origin')).toHaveTextContent('Dimeka');
      expect(screen.getByTestId('trace-origin')).toHaveTextContent('Omo Beekeepers Union');
      expect(screen.getByTestId('trace-processing-date')).toHaveTextContent('Processed');
      expect(screen.getByTestId('trace-story')).toHaveTextContent('Harvested from forest honey');
      expect(screen.getByTestId('trace-outputs')).toHaveTextContent('Forest honey');
      expect(screen.getByTestId('trace-outputs')).toHaveTextContent('120 kg');
      expect(screen.getByTestId('trace-scan-count')).toHaveTextContent('42 verifications');
    });

    it('renders without a story, origins or outputs', async () => {
      installAdapter([
        baseTrace({
          publicStory: undefined,
          farmerOrigins: [],
          outputs: [],
          scanCount: 0,
          originVillage: undefined,
          originLabel: undefined,
          enterpriseName: undefined,
        }),
      ]);

      renderPage();

      expect(await screen.findByTestId('public-trace-page')).toBeInTheDocument();
      // A batch with no origin is not an error, so the page says so rather than showing a hole.
      expect(screen.getByTestId('trace-origin-missing')).toHaveTextContent(
        'has not recorded an origin'
      );
      expect(screen.queryByTestId('trace-story')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trace-farmers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trace-outputs')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trace-scan-count')).not.toBeInTheDocument();
    });
  });

  describe('lost connection', () => {
    it('turns a network failure into a retryable message', async () => {
      installAdapter(['network']);

      renderPage();

      // httpClient retries a GET network failure twice with backoff before giving up.
      const error = await screen.findByTestId('trace-error', undefined, { timeout: 5000 });
      expect(error).toHaveTextContent('Traceability is unavailable right now');
      expect(screen.getByTestId('trace-retry')).toBeInTheDocument();
    });
  });

  it('passes an axe accessibility audit', async () => {
    installAdapter([baseTrace()]);

    const { container } = renderPage();
    await screen.findByTestId('public-trace-page');

    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe('trace presentation rules', () => {
  it('prefers the village, then the batch label, then the enterprise', () => {
    expect(originHeading(baseTrace())).toBe('Dimeka');
    expect(originHeading(baseTrace({ originVillage: undefined }))).toBe('Dimeka highlands');
    expect(originHeading(baseTrace({ originVillage: undefined, originLabel: undefined }))).toBe(
      'Omo Beekeepers Union'
    );
    expect(originHeading(baseTrace({ originVillage: undefined, originLabel: undefined, enterpriseName: undefined }))).toBeNull();
    // Whitespace is not a name.
    expect(originHeading(baseTrace({ originVillage: '   ' }))).toBe('Dimeka highlands');
  });

  it('treats an empty name as withheld, not as published', () => {
    expect(hasFarmerName({ farmerName: 'Almaz T.' })).toBe(true);
    expect(hasFarmerName({ farmerName: undefined })).toBe(false);
    expect(hasFarmerName({ farmerName: '' })).toBe(false);
    expect(hasFarmerName({ farmerName: '  ' })).toBe(false);
    expect(hasFarmerName({})).toBe(false);

    expect(hasAnyFarmerName(baseTrace())).toBe(true);
    expect(hasAnyFarmerName(baseTrace({ farmerOrigins: [] }))).toBe(false);
    expect(hasAnyFarmerName(baseTrace({ farmerOrigins: [{ village: 'D', farmerName: undefined }] }))).toBe(false);
  });

  it('labels an origin by its group, falling back to the village', () => {
    expect(originGroupLabel({ cooperativeGroup: 'Union', village: 'Dimeka' })).toBe('Union');
    expect(originGroupLabel({ cooperativeGroup: undefined, village: 'Dimeka' })).toBe('Dimeka');
    expect(originGroupLabel({ cooperativeGroup: '', village: '' })).toBeNull();
  });

  it('joins a quantity with its unit', () => {
    expect(formatOutputQuantity({ quantity: 120, unit: 'kg' })).toBe('120 kg');
    expect(formatOutputQuantity({ quantity: 120, unit: undefined })).toBe('120');
    expect(formatOutputQuantity({ quantity: undefined, unit: 'kg' })).toBe('kg');
    expect(formatOutputQuantity({ quantity: undefined, unit: undefined })).toBeNull();
  });

  it('handles the explicit null the Java backend actually sends', () => {
    // The OpenAPI schema marks these optional (`string | undefined`), but
    // `TraceabilityService` maps a withheld name with Java's null, which serialises to a real
    // JSON null rather than an absent key. Both shapes must be treated as "not provided".
    const fromServer = {
      village: 'Dimeka',
      cooperativeGroup: null,
      farmerName: null,
    } as unknown as Parameters<typeof hasFarmerName>[0];

    expect(hasFarmerName(fromServer)).toBe(false);
    expect(originGroupLabel(fromServer)).toBe('Dimeka');
  });

  it('drops repeated origins', () => {
    const origins = dedupeOrigins([
      { village: 'Dimeka', cooperativeGroup: 'Union', farmerName: undefined },
      { village: 'Dimeka', cooperativeGroup: 'Union', farmerName: undefined },
      { village: 'Turmi', cooperativeGroup: 'Union', farmerName: undefined },
    ]);
    expect(origins).toHaveLength(2);
  });
});
