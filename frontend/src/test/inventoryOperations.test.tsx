import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InventoryManagementPage from '../pages/dashboard/enterprise/InventoryManagementPage';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import { mockUsers } from '../mocks/fixtures/users';
import {
  mockInventoryLots,
  mockInventoryLocations,
  mockInventoryMovements,
} from '../mocks/fixtures/enterprise';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

describe('F-902: Inventory Adjustments, Transfers, and Disposals', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    useAuthStore.setState({
      user: {
        ...mockUsers.enterprise,
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        roles: ['MICRO_ENTERPRISE'],
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
      activeRole: 'MICRO_ENTERPRISE',
    });

    vi.spyOn(enterpriseService, 'getEnterpriseLots').mockResolvedValue(mockInventoryLots);
    vi.spyOn(enterpriseService, 'getLocations').mockResolvedValue(mockInventoryLocations);
    vi.spyOn(enterpriseService, 'getLotMovements').mockImplementation((_entId, lotId) =>
      Promise.resolve(mockInventoryMovements[lotId] || [])
    );
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InventoryManagementPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  // 1. Adjust Balance - Overdraw Guard & Success
  it('displays overdraw error when adjustment decrease exceeds available balance', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('adjust-lot-btn-lot-001')).toBeInTheDocument();
    });

    // lot-001 has balance 48 KG
    fireEvent.click(screen.getByTestId('adjust-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-lot-modal')).toBeInTheDocument();
    });

    // Switch to Decrease
    fireEvent.click(screen.getByText('Decrease (-)'));

    // Try to decrease 50 KG (exceeds 48 KG)
    fireEvent.change(screen.getByTestId('adjust-quantity-input'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByTestId('adjust-reason-input'), {
      target: { value: 'Inventory loss' },
    });
    fireEvent.click(screen.getByTestId('confirm-adjust-checkbox'));

    fireEvent.click(screen.getByTestId('submit-adjust-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('adjust-error-alert')).toHaveTextContent(
        'Cannot write down more than available balance (48 KG)'
      );
    });
  });

  it('validates mandatory reason and confirmation checkbox for adjustments', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('adjust-lot-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('adjust-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-lot-modal')).toBeInTheDocument();
    });

    // Enter quantity but leave reason empty
    fireEvent.change(screen.getByTestId('adjust-quantity-input'), {
      target: { value: '5' },
    });

    fireEvent.click(screen.getByTestId('submit-adjust-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-error-alert')).toHaveTextContent(
        'Reason for adjustment is mandatory.'
      );
    });

    // Add reason but don't check confirmation
    fireEvent.change(screen.getByTestId('adjust-reason-input'), {
      target: { value: 'Physical cycle count correction' },
    });

    fireEvent.click(screen.getByTestId('submit-adjust-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-error-alert')).toHaveTextContent(
        'Please confirm the physical count adjustment.'
      );
    });
  });

  it('successfully executes a balance adjustment when inputs are valid', async () => {
    const adjustSpy = vi.spyOn(enterpriseService, 'adjustLot').mockResolvedValue({
      id: 'mov-adj-001',
      lotId: 'lot-001',
      movementType: 'ADJUSTMENT',
      quantity: 5,
      balanceAfter: 53,
      reason: 'Physical count adjustment',
      createdAt: '2026-10-18T12:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('adjust-lot-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('adjust-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-lot-modal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('adjust-quantity-input'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByTestId('adjust-reason-input'), {
      target: { value: 'Physical count adjustment' },
    });
    fireEvent.click(screen.getByTestId('confirm-adjust-checkbox'));

    fireEvent.click(screen.getByTestId('submit-adjust-btn'));

    await waitFor(() => {
      expect(adjustSpy).toHaveBeenCalledWith(TARGET_ENTERPRISE_ID, 'lot-001', {
        quantity: 5,
        reason: 'Physical count adjustment',
      });
      expect(screen.getByText(/Balance adjusted successfully/i)).toBeInTheDocument();
    });
  });

  // 2. Transfer Location - Overdraw & Destination Validation
  it('displays overdraw error when transfer quantity exceeds lot balance', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('transfer-lot-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('transfer-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('transfer-lot-modal')).toBeInTheDocument();
    });

    // Select destination
    fireEvent.change(screen.getByTestId('target-location-select'), {
      target: { value: 'loc-002' },
    });

    // Try to transfer 60 KG (lot balance is 48 KG)
    fireEvent.change(screen.getByTestId('transfer-quantity-input'), {
      target: { value: '60' },
    });
    fireEvent.change(screen.getByTestId('transfer-reason-input'), {
      target: { value: 'Relocate to Bay B' },
    });
    fireEvent.click(screen.getByTestId('confirm-transfer-checkbox'));

    fireEvent.click(screen.getByTestId('submit-transfer-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('transfer-error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('transfer-error-alert')).toHaveTextContent(
        'Transfer quantity cannot exceed current balance of 48 KG'
      );
    });
  });

  it('successfully executes a location transfer with valid target location and quantity', async () => {
    const transferSpy = vi.spyOn(enterpriseService, 'transferLot').mockResolvedValue({
      id: 'mov-tr-001',
      lotId: 'lot-001',
      movementType: 'TRANSFER_OUT',
      quantity: -10,
      balanceAfter: 38,
      reason: 'Relocation to cold storage hub',
      createdAt: '2026-10-18T12:30:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('transfer-lot-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('transfer-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('transfer-lot-modal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('target-location-select'), {
      target: { value: 'loc-003' },
    });
    fireEvent.change(screen.getByTestId('transfer-quantity-input'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByTestId('transfer-reason-input'), {
      target: { value: 'Relocation to cold storage hub' },
    });
    fireEvent.click(screen.getByTestId('confirm-transfer-checkbox'));

    fireEvent.click(screen.getByTestId('submit-transfer-btn'));

    await waitFor(() => {
      expect(transferSpy).toHaveBeenCalledWith(TARGET_ENTERPRISE_ID, 'lot-001', {
        targetLocationId: 'loc-003',
        quantity: 10,
        reason: 'Relocation to cold storage hub',
      });
      expect(screen.getByText(/Transferred successfully/i)).toBeInTheDocument();
    });
  });

  // 3. Record Disposal - Overdraw & Spoilage Validation
  it('displays overdraw error when disposal quantity exceeds current balance', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('dispose-lot-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('dispose-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('dispose-lot-modal')).toBeInTheDocument();
    });

    // Enter quantity 100 > balance 48
    fireEvent.change(screen.getByTestId('dispose-quantity-input'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByTestId('dispose-reason-input'), {
      target: { value: 'Water damage during flash flood' },
    });
    fireEvent.click(screen.getByTestId('confirm-dispose-checkbox'));

    fireEvent.click(screen.getByTestId('submit-dispose-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('dispose-error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('dispose-error-alert')).toHaveTextContent(
        'Disposal quantity cannot exceed current balance of 48 KG'
      );
    });
  });

  it('validates required disposal reason before submission', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('dispose-lot-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('dispose-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('dispose-lot-modal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('dispose-quantity-input'), {
      target: { value: '5' },
    });

    fireEvent.click(screen.getByTestId('submit-dispose-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('dispose-error-alert')).toHaveTextContent(
        'Disposal reason (e.g. spoilage, damage, infestation) is mandatory.'
      );
    });
  });

  it('successfully records disposal of damaged goods', async () => {
    const disposeSpy = vi.spyOn(enterpriseService, 'disposeLot').mockResolvedValue({
      id: 'mov-disp-001',
      lotId: 'lot-001',
      movementType: 'DISPOSAL',
      quantity: -5,
      balanceAfter: 43,
      reason: 'Insect contamination in outer seal',
      createdAt: '2026-10-18T13:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('dispose-lot-btn-lot-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('dispose-lot-btn-lot-001'));

    await waitFor(() => {
      expect(screen.getByTestId('dispose-lot-modal')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('dispose-quantity-input'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByTestId('dispose-reason-input'), {
      target: { value: 'Insect contamination in outer seal' },
    });
    fireEvent.click(screen.getByTestId('confirm-dispose-checkbox'));

    fireEvent.click(screen.getByTestId('submit-dispose-btn'));

    await waitFor(() => {
      expect(disposeSpy).toHaveBeenCalledWith(TARGET_ENTERPRISE_ID, 'lot-001', {
        quantity: 5,
        reason: 'Insect contamination in outer seal',
      });
      expect(screen.getByText(/Disposal recorded successfully/i)).toBeInTheDocument();
    });
  });
});
