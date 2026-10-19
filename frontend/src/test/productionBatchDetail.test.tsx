import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import ProductionBatchDetailPage from '../pages/dashboard/enterprise/ProductionBatchDetailPage';
import { mockProductionBatches } from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

function renderDetailPage(batchId: string = 'batch-001') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/dashboard/enterprise/production/${batchId}`]}>
        <Routes>
          <Route
            path="/dashboard/enterprise/production/:batchId"
            element={<ProductionBatchDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('F-905 & F-906: Production Batch Detail, Lifecycle, Trace Validation & Public Story', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    useAuthStore.setState({
      user: {
        id: 'test-user-enterprise',
        email: 'coop@southomo.org',
        roles: ['MICRO_ENTERPRISE'],
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        fullName: 'Ato Berhanu Haile',
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
      activeRole: 'MICRO_ENTERPRISE',
    });

    vi.spyOn(enterpriseService, 'getProductionBatchById').mockImplementation(async (_eid, batchId) => {
      const found = mockProductionBatches.find((b) => b.id === batchId);
      if (!found) throw new Error('Batch not found');
      return { ...found };
    });

    vi.spyOn(enterpriseService, 'validateTrace').mockResolvedValue({
      valid: true,
      note: 'Full chain of custody verified from farmer delivery to finished outputs',
      issues: [],
      inputLotCount: 1,
      farmerCount: 1,
    });

    vi.spyOn(enterpriseService, 'completeProductionBatch').mockImplementation(async (_eid, batchId) => {
      const found = mockProductionBatches.find((b) => b.id === batchId);
      return {
        ...(found || mockProductionBatches[0]),
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      };
    });

    vi.spyOn(enterpriseService, 'cancelProductionBatch').mockImplementation(async (_eid, batchId) => {
      const found = mockProductionBatches.find((b) => b.id === batchId);
      return {
        ...(found || mockProductionBatches[0]),
        status: 'CANCELLED',
      };
    });

    vi.spyOn(enterpriseService, 'updateTraceRecord').mockResolvedValue({
      batchId: 'batch-001',
      publicToken: 'TRC-OMO-2026-001',
      showFarmerNames: true,
      publicStory: 'Updated narrative',
    });
  });

  it('renders batch detail with header, status, and breadcrumbs', async () => {
    renderDetailPage('batch-001');

    expect(await screen.findByTestId('batch-title')).toHaveTextContent('BATCH-2026-001');
    expect(screen.getByTestId('batch-status-badge')).toHaveTextContent('COMPLETED');
    expect(screen.getByTestId('batch-code-breadcrumb')).toHaveTextContent('BATCH-2026-001');
    expect(screen.getByText(/Mass Balanced \(B-602\)/i)).toBeInTheDocument();
  });

  it('renders B-602 Conservation of Mass KPI grid and cost summary', async () => {
    renderDetailPage('batch-001');

    // Inputs: 30 KG, Outputs: 28.5 KG, Losses: 1.5 KG, Costs: 1,000.00 ETB
    expect(await screen.findByTestId('total-inputs-val')).toHaveTextContent('30');
    expect(screen.getByTestId('total-outputs-val')).toHaveTextContent('28.5');
    expect(screen.getByTestId('total-losses-val')).toHaveTextContent('1.5');
    expect(screen.getByTestId('total-costs-val')).toHaveTextContent(/1,000/);
  });

  it('renders raw material inputs and finished outputs tables', async () => {
    renderDetailPage('batch-001');

    expect(await screen.findByTestId('section-inputs')).toBeInTheDocument();
    expect(screen.getAllByText('LOT-2026-040').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('South Omo White Forest Honey')).toBeInTheDocument();

    expect(screen.getByTestId('section-outputs')).toBeInTheDocument();
    expect(screen.getByText('LOT-2026-041')).toBeInTheDocument();
    expect(screen.getAllByText('Bottled Wild White Honey (500g Jar)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('publish-product-out-001')).toBeInTheDocument();
  });

  it('renders trace validation chain of custody with verified status', async () => {
    renderDetailPage('batch-001');

    expect(await screen.findByTestId('section-trace-validation')).toBeInTheDocument();
    expect(screen.getByTestId('trace-validation-status')).toHaveTextContent(/Verified Complete Chain/i);
    expect(screen.getByTestId('trace-chain-flow')).toBeInTheDocument();
    expect(screen.getByText(/Full chain of custody verified/i)).toBeInTheDocument();
  });

  it('allows completing a DRAFT batch', async () => {
    renderDetailPage('batch-002'); // batch-002 is DRAFT

    const completeBtn = await screen.findByTestId('complete-batch-btn');
    expect(completeBtn).toBeInTheDocument();

    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(enterpriseService.completeProductionBatch).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'batch-002'
      );
    });
  });

  it('shows cancellation modal with stock reversal explanation (B-603) and cancels batch', async () => {
    renderDetailPage('batch-001');

    const cancelBtn = await screen.findByTestId('cancel-batch-btn');
    fireEvent.click(cancelBtn);

    // Modal opens
    expect(screen.getByTestId('cancel-batch-modal')).toBeInTheDocument();
    expect(screen.getByText(/Conservation of Stock Audit \(B-603\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Cancelling will automatically return all consumed raw materials back to inventory/i)
    ).toBeInTheDocument();

    // Confirm button is disabled without reason
    const confirmBtn = screen.getByTestId('confirm-cancel-batch-btn');
    expect(confirmBtn).toBeDisabled();

    // Enter reason
    const reasonInput = screen.getByTestId('cancel-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'Packaging contamination defect' } });
    expect(confirmBtn).toBeEnabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(enterpriseService.cancelProductionBatch).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'batch-001',
        'Packaging contamination defect'
      );
    });
  });

  it('toggles farmer consent, edits story, and saves trace record (F-906)', async () => {
    renderDetailPage('batch-001');

    expect(await screen.findByTestId('section-trace-management')).toBeInTheDocument();

    const consentToggle = screen.getByTestId('farmer-consent-toggle');
    expect(consentToggle).toBeChecked();

    // Toggle consent off
    fireEvent.click(consentToggle);
    expect(consentToggle).not.toBeChecked();

    // Edit story
    const storyTextarea = screen.getByTestId('public-story-textarea');
    fireEvent.change(storyTextarea, {
      target: { value: 'Harvested in the pristine highlands with solar extraction.' },
    });

    // Save
    const saveBtn = screen.getByTestId('save-story-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(enterpriseService.updateTraceRecord).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'batch-001',
        {
          publicStory: 'Harvested in the pristine highlands with solar extraction.',
          showFarmerNames: false,
        }
      );
    });

    expect(await screen.findByTestId('story-saved-banner')).toBeInTheDocument();
  });

  it('opens printable QR code modal with trace token (F-906)', async () => {
    renderDetailPage('batch-001');

    const printBtn = await screen.findByTestId('print-qr-btn');
    fireEvent.click(printBtn);

    expect(screen.getByTestId('qr-print-modal')).toBeInTheDocument();
    expect(screen.getAllByText('TRC-OMO-2026-001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('print-now-btn')).toBeInTheDocument();
  });

  it('renders error state when batch is not found', async () => {
    renderDetailPage('batch-nonexistent');

    expect(await screen.findByTestId('batch-detail-error')).toBeInTheDocument();
    expect(screen.getByText(/Production Batch Not Found/i)).toBeInTheDocument();
  });
});
