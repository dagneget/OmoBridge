import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';

import ProviderJobDetailPage from '../pages/dashboard/delivery/ProviderJobDetailPage';
import { SmsCheckpointFallback } from '../features/delivery/SmsCheckpointFallback';
import { useAuthStore } from '../features/auth/authStore';
import { deliveryService } from '../features/delivery';
import {
  acceptedWordsFor,
  buildSmsCheckpointText,
  supportsSmsCheckpoint,
  SMS_CHECKPOINT_KEYWORDS,
} from '../features/delivery/smsCheckpoint';
import type { SmsCheckpointStatus } from '../features/delivery/smsCheckpoint';
import { nextStatuses } from '../features/delivery/deliveryStatus';
import type { DeliveryJobStatus } from '../features/delivery/deliveryStatus';
import type { DeliveryJobResponse } from '../types/api';

const PROVIDER_ID = '77777777-7777-7777-7777-777777777777';
const JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000014';

/**
 * The backend's own parsing, copied verbatim from `InboundSmsService`, so this file fails if the
 * message this app builds stops being something the server would accept.
 */
const SERVER_JOB_PATTERN = /(DEL-[0-9A-Z-]+)/i;
function serverTargetStatus(body: string): DeliveryJobStatus | null {
  const upper = body.toUpperCase();
  if (upper.includes('ARRIVED') || upper.includes('DELIVERED')) return 'DELIVERED';
  if (upper.includes('LEFT') || upper.includes('TRANSIT')) return 'IN_TRANSIT';
  if (upper.includes('PICKED') || upper.includes('COLLECTED')) return 'PICKED_UP';
  return null;
}

const makeJob = (overrides: Partial<DeliveryJobResponse> = {}): DeliveryJobResponse => ({
  jobId: JOB_ID,
  jobNo: 'DEL-2026-5001',
  providerId: PROVIDER_ID,
  providerName: 'Beko Transport',
  status: 'ASSIGNED',
  pickupAddress: 'Dimeka market',
  dropoffAddress: 'Turmi village centre',
  fee: 450,
  currency: 'ETB',
  orderIds: [],
  createdAt: '2026-10-18T06:00:00Z',
  ...overrides,
});

describe('SMS checkpoint format matches the backend (F-1106)', () => {
  it('builds a message the server parses to the job it names', () => {
    for (const [status, keyword] of Object.entries(SMS_CHECKPOINT_KEYWORDS)) {
      const text = buildSmsCheckpointText('DEL-2026-5001', status as SmsCheckpointStatus);

      // The server finds the job by number, so the regex must match it in the composed text.
      expect(SERVER_JOB_PATTERN.exec(text)?.[1]).toBe('DEL-2026-5001');
      // And the keyword must resolve to the very status the driver meant.
      expect(serverTargetStatus(text)).toBe(status);
      expect(text).toBe(`DEL-2026-5001 ${keyword}`);
    }
  });

  it('is unambiguous: no message resolves to a different status than its own', () => {
    // The server checks DELIVERED, then TRANSIT, then PICKED. A message naming two of them
    // would be resolved by check order rather than by intent, so none may overlap.
    const messages = Object.keys(SMS_CHECKPOINT_KEYWORDS).map((status) =>
      buildSmsCheckpointText('DEL-2026-5001', status as SmsCheckpointStatus)
    );
    const targets = messages.map(serverTargetStatus);
    expect(new Set(targets).size).toBe(messages.length);
    Object.keys(SMS_CHECKPOINT_KEYWORDS).forEach((status, index) => {
      expect(targets[index]).toBe(status);
    });
  });

  it('includes every alternative keyword the backend also accepts', () => {
    expect(acceptedWordsFor('PICKED_UP')).toEqual(['COLLECTED', 'PICKED']);
    expect(acceptedWordsFor('IN_TRANSIT')).toEqual(['TRANSIT', 'LEFT']);
    expect(acceptedWordsFor('DELIVERED')).toEqual(['DELIVERED', 'ARRIVED']);

    for (const status of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] as const) {
      for (const word of acceptedWordsFor(status)) {
        expect(serverTargetStatus(`DEL-2026-5001 ${word}`)).toBe(status);
      }
    }
  });

  it('offers SMS only for the statuses the backend can actually move', () => {
    // CANCELLED and FAILED have no keyword; offering them would be a dead instruction.
    expect(supportsSmsCheckpoint('PICKED_UP')).toBe(true);
    expect(supportsSmsCheckpoint('IN_TRANSIT')).toBe(true);
    expect(supportsSmsCheckpoint('DELIVERED')).toBe(true);
    expect(supportsSmsCheckpoint('CANCELLED')).toBe(false);
    expect(supportsSmsCheckpoint('FAILED')).toBe(false);
    expect(supportsSmsCheckpoint('ASSIGNED')).toBe(false);
    expect(supportsSmsCheckpoint('PENDING')).toBe(false);
  });
});

describe('SMS checkpoint fallback component', () => {
  const statusLabel = (status: string) => status;

  it('prefills each legal next status with the provider’s real job number', () => {
    render(
      <SmsCheckpointFallback jobNo="DEL-2026-5001" statuses={nextStatuses('ASSIGNED')} statusLabel={statusLabel} />
    );

    // ASSIGNED -> PICKED_UP | FAILED | CANCELLED, of which only PICKED_UP is sendable by SMS.
    expect(screen.getByTestId('sms-text-picked_up')).toHaveValue('DEL-2026-5001 COLLECTED');
    expect(screen.queryByTestId('sms-text-failed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sms-text-cancelled')).not.toBeInTheDocument();
  });

  it('covers the delivered step once the job is in transit', () => {
    render(
      <SmsCheckpointFallback jobNo="DEL-2026-5001" statuses={nextStatuses('IN_TRANSIT')} statusLabel={statusLabel} />
    );

    expect(screen.getByTestId('sms-text-delivered')).toHaveValue('DEL-2026-5001 DELIVERED');
    // Only the synonyms — DELIVERED is already visible in the field above.
    expect(screen.getByText('Also accepted: ARRIVED')).toBeInTheDocument();
  });

  it('renders nothing when no next status can be sent by SMS', () => {
    const { container } = render(
      <SmsCheckpointFallback jobNo="DEL-2026-5001" statuses={['FAILED', 'CANCELLED']} statusLabel={statusLabel} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing without a job number, since the server could not match it', () => {
    const { container } = render(
      <SmsCheckpointFallback statuses={['PICKED_UP']} statusLabel={statusLabel} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('copies the exact text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    render(
      <SmsCheckpointFallback jobNo="DEL-2026-5001" statuses={['PICKED_UP']} statusLabel={statusLabel} />
    );

    fireEvent.click(screen.getByTestId('sms-copy-picked_up'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('DEL-2026-5001 COLLECTED'));
    expect(await screen.findByTestId('sms-copy-picked_up')).toHaveTextContent('Copied');
  });

  it('does not report a failure when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('insecure context')) },
    });

    render(
      <SmsCheckpointFallback jobNo="DEL-2026-5001" statuses={['PICKED_UP']} statusLabel={statusLabel} />
    );

    fireEvent.click(screen.getByTestId('sms-copy-picked_up'));
    // The read-only field is still there to select by hand, so this is not an error state.
    await waitFor(() => expect(screen.getByTestId('sms-text-picked_up')).toHaveValue('DEL-2026-5001 COLLECTED'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('starts collapsed so it does not compete with the status buttons', () => {
    render(
      <SmsCheckpointFallback jobNo="DEL-2026-5001" statuses={['PICKED_UP']} statusLabel={statusLabel} />
    );
    const details = screen.getByTestId('sms-checkpoint-fallback');
    expect(details).not.toHaveAttribute('open');
  });

  it('passes an axe accessibility audit when open', async () => {
    const { container } = render(
      <SmsCheckpointFallback jobNo="DEL-2026-5001" statuses={['PICKED_UP']} statusLabel={statusLabel} />
    );
    fireEvent.click(screen.getByText('No signal? Send a checkpoint by SMS'));

    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe('SMS checkpoint on the provider screen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Beko Transport',
        roles: ['DELIVERY_PROVIDER'],
        status: 'ACTIVE',
        preferredLanguage: 'en',
        deliveryProviderId: PROVIDER_ID,
      } as never,
      token: 'provider-token',
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'DELIVERY_PROVIDER',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDetail = (job: DeliveryJobResponse) => {
    vi.spyOn(deliveryService, 'getProviderJobs').mockResolvedValue([job]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/dashboard/delivery/jobs/${JOB_ID}`]}>
          <Routes>
            <Route path="/dashboard/delivery/jobs/:jobId" element={<ProviderJobDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('offers the checkpoint for the step the provider is on', async () => {
    renderDetail(makeJob({ status: 'PICKED_UP' }));

    const fallback = await screen.findByTestId('sms-checkpoint-fallback');
    expect(fallback).toHaveTextContent('No signal? Send a checkpoint by SMS');
    // PICKED_UP -> IN_TRANSIT | FAILED | CANCELLED; only IN_TRANSIT is sendable.
    expect(screen.getByTestId('sms-text-in_transit')).toHaveValue('DEL-2026-5001 TRANSIT');
    expect(screen.queryByTestId('sms-text-failed')).not.toBeInTheDocument();
  });

  it('gives the delivered checkpoint on the last leg', async () => {
    renderDetail(makeJob({ status: 'IN_TRANSIT' }));

    await screen.findByTestId('sms-checkpoint-fallback');
    expect(screen.getByTestId('sms-text-delivered')).toHaveValue('DEL-2026-5001 DELIVERED');
  });

  it('disappears on a terminal job, where a checkpoint would do nothing', async () => {
    renderDetail(makeJob({ status: 'DELIVERED' }));

    await waitFor(() => expect(screen.getByTestId('delivery-job-detail')).toBeInTheDocument());
    expect(screen.queryByTestId('sms-checkpoint-fallback')).not.toBeInTheDocument();
  });
});
