import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import ProductionBatchWizardPage from '../pages/dashboard/enterprise/ProductionBatchWizardPage';
import {
  mockInventoryLots,
  mockInventoryLocations,
  mockProductTypes,
  mockProductionBatches,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

function renderWithProviders(ui: React.ReactElement) {
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
      <MemoryRouter initialEntries={['/dashboard/enterprise/production/new']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('F-904: Production Batch Creation Wizard & Conservation of Mass', () => {
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

    vi.spyOn(enterpriseService, 'getEnterpriseLots').mockResolvedValue(
      mockInventoryLots.filter((l) => l.status === 'ACTIVE')
    );
    vi.spyOn(enterpriseService, 'getProductTypes').mockResolvedValue(mockProductTypes);
    vi.spyOn(enterpriseService, 'getLocations').mockResolvedValue(mockInventoryLocations);
    vi.spyOn(enterpriseService, 'getProductionBatches').mockResolvedValue(mockProductionBatches);
    vi.spyOn(enterpriseService, 'createProductionBatch').mockImplementation(async (_eid, req) => {
      const totalIn = req.inputs.reduce((a, b) => a + Number(b.quantity || 0), 0);
      const totalOut = req.outputs.reduce((a, b) => a + Number(b.quantity || 0), 0);
      const totalLoss = (req.losses || []).reduce((a, b) => a + Number(b.quantity || 0), 0);
      const discrepancy = Math.round((totalIn - (totalOut + totalLoss)) * 1000) / 1000;

      if (discrepancy !== 0) {
        const error: any = new Error(
          `BATCH_IMBALANCE: Total inputs (${totalIn} KG) must equal outputs (${totalOut}) + losses (${totalLoss}). Discrepancy: ${discrepancy} KG`
        );
        error.response = {
          data: {
            message: `BATCH_IMBALANCE: Total inputs (${totalIn} KG) must equal outputs (${totalOut}) + losses (${totalLoss}). Discrepancy: ${discrepancy} KG`,
          },
        };
        throw error;
      }

      return {
        id: `batch-${Date.now()}`,
        batchCode: 'BATCH-2026-999',
        enterpriseId: TARGET_ENTERPRISE_ID,
        status: req.completeImmediately ? 'COMPLETED' : 'DRAFT',
        processedAt: req.completeImmediately ? new Date().toISOString() : undefined,
        laborCost: req.laborCost || 0,
        processingCost: req.processingCost || 0,
        packagingCost: req.packagingCost || 0,
        notes: req.notes || '',
        inputs: req.inputs.map((i, idx) => ({
          id: `in-${idx}`,
          lotId: i.lotId,
          lotCode: 'LOT-2026-042',
          quantity: i.quantity,
          unit: i.unit,
        })),
        outputs: req.outputs.map((o, idx) => ({
          id: `out-${idx}`,
          productTypeId: o.productTypeId,
          productTypeName: 'South Omo White Forest Honey',
          quantity: o.quantity,
          unit: o.unit,
          grade: o.grade,
          resultingLotId: o.createInventoryLot ? `lot-out-${idx}` : undefined,
        })),
        losses: (req.losses || []).map((l, idx) => ({
          id: `loss-${idx}`,
          quantity: l.quantity,
          unit: l.unit,
          reason: l.reason,
        })),
        traceToken: 'token-mock-trace-999',
        createdAt: new Date().toISOString(),
      };
    });
  });

  it('renders the wizard header, steps, and initial empty input states', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    expect(await screen.findByText('Production Batch Wizard')).toBeInTheDocument();
    expect(screen.getByText(/Convert inspected inventory lots into finished retail commodities/i)).toBeInTheDocument();

    // Check step sections
    expect(screen.getByTestId('section-input-lots')).toBeInTheDocument();
    expect(screen.getByTestId('section-outputs')).toBeInTheDocument();
    expect(screen.getByTestId('section-losses')).toBeInTheDocument();
    expect(screen.getByTestId('mass-balance-container')).toBeInTheDocument();
    expect(screen.getByTestId('section-costs-notes')).toBeInTheDocument();
    expect(screen.getByTestId('section-trace-settings')).toBeInTheDocument();

    // Submit button should be disabled initially
    const submitBtn = screen.getByTestId('submit-batch-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('selects an active input lot and displays its balance and quantity input', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    // Wait for dropdown to populate with active lot options
    const dropdown = await screen.findByTestId('select-input-lot-dropdown');
    await waitFor(() => {
      expect(screen.getByText(/LOT-2026-042/)).toBeInTheDocument();
    });

    // Select lot-001 (Honey, 48 KG available)
    fireEvent.change(dropdown, { target: { value: 'lot-001' } });
    const addLotBtn = screen.getByTestId('add-input-lot-btn');
    expect(addLotBtn).toBeEnabled();

    fireEvent.click(addLotBtn);

    // Lot row should appear in the table
    expect(await screen.findByText('LOT-2026-042')).toBeInTheDocument();
    const qtyInput = screen.getByTestId('input-lot-quantity-lot-001') as HTMLInputElement;
    expect(qtyInput).toBeInTheDocument();
    expect(qtyInput.value).toBe('48');

    // Total input volume metric should be updated to 48.00
    const totalInputMetric = screen.getByTestId('total-inputs-metric');
    expect(totalInputMetric).toHaveTextContent('48.00');
  });

  it('shows an overdraw warning if consumed quantity exceeds lot balance', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    const dropdown = await screen.findByTestId('select-input-lot-dropdown');
    await waitFor(() => {
      expect(screen.getByText(/LOT-2026-042/)).toBeInTheDocument();
    });

    fireEvent.change(dropdown, { target: { value: 'lot-001' } });
    fireEvent.click(screen.getByTestId('add-input-lot-btn'));

    const qtyInput = await screen.findByTestId('input-lot-quantity-lot-001');
    // Try to enter 60 KG when only 48 KG is available
    fireEvent.change(qtyInput, { target: { value: '60' } });

    expect(await screen.findByText(/Exceeds balance of 48 KG/i)).toBeInTheDocument();
    expect(screen.getByTestId('submit-batch-btn')).toBeDisabled();
  });

  it('adds output products and calculates total output volume', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    const addOutputBtn = await screen.findByTestId('add-output-btn');
    fireEvent.click(addOutputBtn);

    expect(await screen.findByTestId('output-row-0')).toBeInTheDocument();
    const outputQty = screen.getByTestId('output-quantity-0');
    fireEvent.change(outputQty, { target: { value: '45' } });

    const totalOutputMetric = screen.getByTestId('total-outputs-metric');
    expect(totalOutputMetric).toHaveTextContent('45.00');
  });

  it('flags conservation of mass imbalance when inputs != outputs + losses', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    // 1. Add 48 KG input
    const dropdown = await screen.findByTestId('select-input-lot-dropdown');
    await waitFor(() => {
      expect(screen.getByText(/LOT-2026-042/)).toBeInTheDocument();
    });
    fireEvent.change(dropdown, { target: { value: 'lot-001' } });
    fireEvent.click(screen.getByTestId('add-input-lot-btn'));

    // 2. Add 40 KG output (Discrepancy: 48 - 40 = 8 KG)
    fireEvent.click(screen.getByTestId('add-output-btn'));
    const outputQty = await screen.findByTestId('output-quantity-0');
    fireEvent.change(outputQty, { target: { value: '40' } });

    // Mass balance check should indicate imbalance
    const imbalanceMsg = await screen.findByTestId('mass-balance-imbalance');
    expect(imbalanceMsg).toBeInTheDocument();
    expect(imbalanceMsg).toHaveTextContent(/Mass balance discrepancy/i);
    expect(imbalanceMsg).toHaveTextContent(/Variance: \+8 KG/i);

    // Submission button must remain blocked
    expect(screen.getByTestId('submit-batch-btn')).toBeDisabled();
  });

  it('auto-allocates mass discrepancy to processing losses and verifies balance', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    // Add 48 KG input
    const dropdown = await screen.findByTestId('select-input-lot-dropdown');
    await waitFor(() => {
      expect(screen.getByText(/LOT-2026-042/)).toBeInTheDocument();
    });
    fireEvent.change(dropdown, { target: { value: 'lot-001' } });
    fireEvent.click(screen.getByTestId('add-input-lot-btn'));

    // Add 45 KG output (Discrepancy: 3 KG)
    fireEvent.click(screen.getByTestId('add-output-btn'));
    const outputQty = await screen.findByTestId('output-quantity-0');
    fireEvent.change(outputQty, { target: { value: '45' } });

    // Click auto-allocate loss button
    const autoAllocateBtn = await screen.findByTestId('auto-allocate-loss-btn');
    expect(autoAllocateBtn).toBeInTheDocument();
    fireEvent.click(autoAllocateBtn);

    // Verify loss entry was created with 3.00 KG
    const lossQty = (await screen.findByTestId('loss-quantity-0')) as HTMLInputElement;
    expect(lossQty.value).toBe('3.00');

    // Mass conservation is now balanced
    const balancedMsg = await screen.findByTestId('mass-balance-balanced');
    expect(balancedMsg).toBeInTheDocument();
    expect(balancedMsg).toHaveTextContent(/Mass conservation balanced: 48.00 KG in = 48.00 KG accounted for/i);

    // Submit button is now enabled
    expect(screen.getByTestId('submit-batch-btn')).toBeEnabled();
  });

  it('calculates operational costs from labor, processing, and packaging inputs', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    const laborInput = await screen.findByTestId('input-labor-cost');
    const procInput = screen.getByTestId('input-processing-cost');
    const pkgInput = screen.getByTestId('input-packaging-cost');

    fireEvent.change(laborInput, { target: { value: '1500' } });
    fireEvent.change(procInput, { target: { value: '2000' } });
    fireEvent.change(pkgInput, { target: { value: '500' } });

    const totalCostCard = screen.getByTestId('total-cost-card');
    // Total should be 4,000 ETB
    expect(totalCostCard).toHaveTextContent(/4,000/);
  });

  it('displays server error banner when backend rejects batch creation', async () => {
    vi.spyOn(enterpriseService, 'createProductionBatch').mockRejectedValueOnce({
      response: {
        data: {
          message: 'BATCH_IMBALANCE: Total inputs (48 KG) must equal outputs (45) + losses (0). Discrepancy: 3 KG',
        },
      },
    });

    renderWithProviders(<ProductionBatchWizardPage />);

    // Add input
    const dropdown = await screen.findByTestId('select-input-lot-dropdown');
    await waitFor(() => {
      expect(screen.getByText(/LOT-2026-042/)).toBeInTheDocument();
    });
    fireEvent.change(dropdown, { target: { value: 'lot-001' } });
    fireEvent.click(screen.getByTestId('add-input-lot-btn'));

    // Add output 45 KG and 3 KG loss to satisfy client check
    fireEvent.click(screen.getByTestId('add-output-btn'));
    const outputQty = await screen.findByTestId('output-quantity-0');
    fireEvent.change(outputQty, { target: { value: '45' } });
    fireEvent.click(screen.getByTestId('auto-allocate-loss-btn'));

    // Submit batch
    const submitBtn = await screen.findByTestId('submit-batch-btn');
    fireEvent.click(submitBtn);

    // Expect server error banner
    const errorBanner = await screen.findByTestId('server-error-banner');
    expect(errorBanner).toBeInTheDocument();
    expect(errorBanner).toHaveTextContent(/BATCH_IMBALANCE/i);
  });

  it('successfully creates batch and displays confirmation banner with batch code', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    // 1. Add input lot
    const dropdown = await screen.findByTestId('select-input-lot-dropdown');
    await waitFor(() => {
      expect(screen.getByText(/LOT-2026-042/)).toBeInTheDocument();
    });
    fireEvent.change(dropdown, { target: { value: 'lot-001' } });
    fireEvent.click(screen.getByTestId('add-input-lot-btn'));

    // 2. Add output product (45 KG)
    fireEvent.click(screen.getByTestId('add-output-btn'));
    const outputQty = await screen.findByTestId('output-quantity-0');
    fireEvent.change(outputQty, { target: { value: '45' } });

    // 3. Auto-allocate remaining 3 KG to losses
    fireEvent.click(screen.getByTestId('auto-allocate-loss-btn'));

    // 4. Fill notes
    fireEvent.change(screen.getByTestId('input-notes'), { target: { value: 'Standard batch milling run' } });

    // 5. Submit
    const submitBtn = screen.getByTestId('submit-batch-btn');
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    // Confirmation banner should appear
    const successBanner = await screen.findByTestId('success-batch-banner');
    expect(successBanner).toBeInTheDocument();
    expect(successBanner).toHaveTextContent(/Production Batch Successfully Created/i);
    expect(successBanner).toHaveTextContent(/BATCH-2026-999/i);
    expect(successBanner).toHaveTextContent(/Verify Public Trace/i);
  });

  it('switches to Batches History tab and filters by batch status', async () => {
    renderWithProviders(<ProductionBatchWizardPage />);

    const historyTab = await screen.findByTestId('tab-batches-history');
    fireEvent.click(historyTab);

    // Section should be visible
    expect(screen.getByTestId('section-batches-history')).toBeInTheDocument();
    expect(await screen.findByTestId('batches-table')).toBeInTheDocument();

    // Check row rendered for batch-001
    expect(screen.getByText('BATCH-2026-001')).toBeInTheDocument();
    expect(screen.getByTestId('batch-status-batch-001')).toHaveTextContent('COMPLETED');

    // Filter by DRAFT
    fireEvent.click(screen.getByTestId('filter-status-DRAFT'));
    // batch-001 is COMPLETED, so it should disappear from DRAFT view
    expect(screen.queryByText('BATCH-2026-001')).not.toBeInTheDocument();

    // Filter by COMPLETED
    fireEvent.click(screen.getByTestId('filter-status-COMPLETED'));
    expect(screen.getByText('BATCH-2026-001')).toBeInTheDocument();
  });
});
