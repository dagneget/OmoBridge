import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import axe from 'axe-core';

import PublicTracePage from '../pages/trace/PublicTracePage';
import { TraceQrCode, TraceQrLabel } from '../features/traceability';
import { httpClient } from '../services/httpClient';
import type { PublicTraceResponse } from '../types/api';

const TOKEN = 'trace-honey-001';

const trace: PublicTraceResponse = {
  publicToken: TOKEN,
  batchCode: 'BATCH-2026-014',
  enterpriseName: 'Omo Beekeepers Union',
  originVillage: 'Dimeka',
  processingDate: '2026-09-02T00:00:00Z',
  farmerOrigins: [],
  outputs: [],
  scanCount: 3,
};

let requests: string[] = [];

/** Only the JSON read needs a transport stub; the QR image is loaded by the browser itself. */
function installAdapter(mode: 'ok' | 'not-found' = 'ok') {
  httpClient.defaults.adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const internal = config as InternalAxiosRequestConfig;
    requests.push(`get ${config.url ?? ''}`);

    if (mode === 'not-found') {
      throw new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', internal, undefined, {
        data: { success: false, code: 'RESOURCE_NOT_FOUND' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: internal,
      });
    }

    return {
      data: { success: true, data: trace },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: internal,
    };
  };
}

const qrImage = () => screen.getByTestId('trace-qr-image');
const qrSrc = () => qrImage().getAttribute('src') ?? '';
const withClient = (node: React.ReactNode) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
  >
    {node}
  </QueryClientProvider>
);

const renderPage = () =>
  render(
    withClient(
      <MemoryRouter initialEntries={[`/trace/${TOKEN}`]}>
        <Routes>
          <Route path="/trace/:token" element={<PublicTracePage />} />
        </Routes>
      </MemoryRouter>
    )
  );

const renderLabel = () =>
  render(
    withClient(
      <TraceQrLabel
        publicToken={TOKEN}
        batchCode={trace.batchCode}
        enterpriseName={trace.enterpriseName}
      />
    )
  );

describe('QR display and print (F-703)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requests = [];
  });

  afterEach(() => {
    window.dispatchEvent(new Event('online'));
  });

  it('points at the API for the code rather than drawing one locally', () => {
    renderLabel();

    // The content of the code is the backend's decision (app.traceability.base-url + token),
    // so the client must display the server's bytes and never generate its own.
    expect(qrSrc()).toBe(`/api/v1/trace/${TOKEN}/qr?width=224&height=224`);
  });

  it('requests the size it will render, so the image is not upscaled', () => {
    render(withClient(<TraceQrCode publicToken={TOKEN} size={300} />));

    expect(qrSrc()).toContain('width=300');
    expect(qrSrc()).toContain('height=300');
  });

  it('describes the image for a screen reader', () => {
    renderLabel();

    // Asserted directly: toHaveAttribute treats its second argument as a literal here.
    expect(qrImage().getAttribute('alt')).toMatch(/trace page/i);
  });

  it('loads from a placeholder rather than collapsing the layout', () => {
    renderLabel();

    expect(screen.getByTestId('trace-qr-loading')).toBeInTheDocument();
    fireEvent.load(qrImage());
    expect(screen.queryByTestId('trace-qr-loading')).not.toBeInTheDocument();
  });

  it('offers a retry when the code cannot be fetched', () => {
    renderLabel();

    fireEvent.error(qrImage());

    const error = screen.getByTestId('trace-qr-error');
    expect(error).toHaveTextContent('QR code unavailable');

    fireEvent.click(screen.getByTestId('trace-qr-retry'));
    // A retry must not be answered from a cached failure, so the request is deliberately new.
    expect(qrSrc()).toContain('retry=1');
    expect(screen.queryByTestId('trace-qr-error')).not.toBeInTheDocument();
  });

  it('prints the label, not the page', () => {
    installAdapter();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    renderLabel();

    const button = screen.getByTestId('trace-qr-print');
    expect(button.className).toContain('print:hidden');
    expect(screen.getByTestId('trace-qr-printable').className).toContain('print:border-0');

    button.click();
    expect(print).toHaveBeenCalledOnce();
  });

  it('keeps the code large enough to scan off paper', () => {
    renderLabel();

    const image = qrImage();
    // 224px ≈ 59mm at 96dpi; below roughly 20mm a printed code stops scanning reliably.
    expect(image).toHaveAttribute('width', '224');
    expect(image.className).toContain('print:w-56');
  });

  it('shows the address in plain text so a damaged label can still be typed in', async () => {
    renderLabel();

    const label = screen.getByTestId('trace-qr-printable');
    expect(label).toHaveTextContent(`/trace/${TOKEN}`);
    expect(label).toHaveTextContent('BATCH-2026-014');
    expect(label).toHaveTextContent('Omo Beekeepers Union');
  });

  it('passes an axe accessibility audit', async () => {
    const { container } = renderLabel();

    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe('QR on the trace page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requests = [];
  });

  afterEach(() => {
    window.dispatchEvent(new Event('online'));
  });

  it('offers a printable label alongside the trace story', async () => {
    installAdapter();

    renderPage();

    expect(await screen.findByTestId('trace-qr-label')).toBeInTheDocument();
    expect(qrSrc()).toContain(`/api/v1/trace/${TOKEN}/qr`);
  });

  it('hides the shopper’s view when printing so only the label comes out', async () => {
    installAdapter();

    renderPage();
    await screen.findByTestId('trace-qr-label');

    // The consumer content is wrapped in print:hidden; the label is not.
    expect(screen.getByTestId('trace-origin').closest('.print\\:hidden')).not.toBeNull();
    expect(screen.getByTestId('trace-qr-printable').closest('.print\\:hidden')).toBeNull();
  });

  it('does not show a label when the token is invalid', async () => {
    installAdapter('not-found');

    renderPage();

    await waitFor(() => expect(screen.queryByTestId('trace-qr-label')).not.toBeInTheDocument());
    // A QR for an unverifiable batch would point consumers at a dead end.
    expect(screen.queryByTestId('trace-qr-image')).not.toBeInTheDocument();
  });
});
