import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { enterpriseService } from '../features/enterprise/enterpriseService';
import EnterpriseReportsPage from '../pages/dashboard/enterprise/EnterpriseReportsPage';
import type { AiReportResponse, EnterpriseImpactMetricsResponse } from '../types/api';

const TARGET_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

const mockMetrics: EnterpriseImpactMetricsResponse = {
  enterpriseId: TARGET_ENTERPRISE_ID,
  activeFarmersCount: 48,
  totalFarmerDisbursedEtb: 345000.0,
  totalSupplyQuantity: 12500.5,
  averageProducerPriceSharePercent: 76.5,
  averageHouseholdIncomeIncrementEtb: 4200.0,
  totalOrdersCount: 128,
  repeatBuyerRetentionRate: 42.0,
};

const mockReportsList: AiReportResponse[] = [
  {
    id: 'rep-001',
    enterpriseId: TARGET_ENTERPRISE_ID,
    reportType: 'WEEKLY_OPERATIONS_SUMMARY',
    period: '2026-W42',
    language: 'EN',
    content: `Weekly Operational Summary: Total Raw Intake: 485.5 kg raw honey received across 5 certified producer cooperatives. 76.5% producer price share maintained.`,
    status: 'APPROVED',
    createdAt: '2026-10-17T08:00:00Z',
  },
  {
    id: 'rep-002',
    enterpriseId: TARGET_ENTERPRISE_ID,
    reportType: 'FARMER_TRAINING_MESSAGE',
    period: '2026-W42',
    language: 'AM',
    content: `ለደቡብ ኦሞ ማር አምራች አርሶ አደሮች ሳምንታዊ የጥራት ምክር: የማር እንጀራ በሚሰበሰብበት ወቅት ንጽህናቸውን የጠበቁ አይዝጌ እቃዎችን ይጠቀሙ።`,
    status: 'GENERATED',
    createdAt: '2026-10-18T09:30:00Z',
  },
  {
    id: 'rep-003',
    enterpriseId: TARGET_ENTERPRISE_ID,
    reportType: 'IMPACT_ASSESSMENT',
    period: '2026-Q3',
    language: 'EN',
    content: `Q3 Fair-Trade Impact: 48 registered agro-pastoralist households supported. 4,200 ETB average income increment.`,
    status: 'APPROVED',
    createdAt: '2026-10-15T14:00:00Z',
  },
];

const renderWithProviders = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EnterpriseReportsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EnterpriseReportsPage Component (F-914)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'user-ent-1',
        phoneNumber: '+251911000003',
        fullName: 'Abebe Bikila',
        role: 'MICRO_ENTERPRISE',
        enterpriseId: TARGET_ENTERPRISE_ID,
        enterpriseName: 'South Omo Community Heritage Cooperative',
        verified: true,
      },
      token: 'mock-enterprise-token',
      isAuthenticated: true,
    });

    vi.spyOn(enterpriseService, 'getImpactMetrics').mockResolvedValue(mockMetrics);
    vi.spyOn(enterpriseService, 'getEnterpriseReports').mockResolvedValue([...mockReportsList]);
    vi.spyOn(enterpriseService, 'generateAiReport').mockImplementation(async (_eid, req) => ({
      id: `rep-${Date.now()}`,
      enterpriseId: TARGET_ENTERPRISE_ID,
      reportType: req.reportType,
      period: req.period,
      language: req.language || 'EN',
      content: `Generated narrative report for period ${req.period} in ${req.language || 'EN'}`,
      status: 'GENERATED',
      createdAt: new Date().toISOString(),
    }));
    vi.spyOn(enterpriseService, 'approveAiReport').mockImplementation(async (_eid, rid, approve) => {
      const existing = mockReportsList.find((r) => r.id === rid) || mockReportsList[0];
      return {
        ...existing,
        id: rid,
        status: approve ? 'APPROVED' : 'REJECTED',
      };
    });
  });

  it('renders impact metrics header accurately', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('76.5%')).toBeInTheDocument();
    });

    const metricsSection = screen.getByTestId('impact-metrics-section');
    expect(within(metricsSection).getByText('Producer Share')).toBeInTheDocument();
    expect(within(metricsSection).getByText('Repeat Buyers')).toBeInTheDocument();
    expect(within(metricsSection).getByText('42%')).toBeInTheDocument();
    expect(within(metricsSection).getByText(/48 active agro-pastoralists/)).toBeInTheDocument();
  });

  it('renders reports list with review status badges', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('report-card-rep-001')).toBeInTheDocument();
    });

    // rep-001 is APPROVED
    expect(screen.getByTestId('report-card-rep-001')).toHaveTextContent('Weekly Operational Summary');
    // rep-002 is GENERATED (Needs Review)
    expect(screen.getByTestId('report-card-rep-002')).toBeInTheDocument();
    expect(screen.getByTestId('badge-needs-review')).toBeInTheDocument();
  });

  it('filters reports by Needs Review filter tab', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('report-card-rep-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('filter-needs_review'));

    // rep-002 is GENERATED, should be visible
    expect(screen.getByTestId('report-card-rep-002')).toBeInTheDocument();
    // rep-001 is APPROVED, should be filtered out
    expect(screen.queryByTestId('report-card-rep-001')).not.toBeInTheDocument();

    // Click All Reports to restore
    fireEvent.click(screen.getByTestId('filter-all'));
    expect(screen.getByTestId('report-card-rep-001')).toBeInTheDocument();
  });

  it('generates a new AI narrative report via form submission', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('btn-generate-report')).toBeInTheDocument();
    });

    const periodInput = screen.getByTestId('input-report-period');
    fireEvent.change(periodInput, { target: { value: '2026-W43' } });

    const languageSelect = screen.getByTestId('select-report-language');
    fireEvent.change(languageSelect, { target: { value: 'AM' } });

    fireEvent.click(screen.getByTestId('btn-generate-report'));

    await waitFor(() => {
      expect(enterpriseService.generateAiReport).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        expect.objectContaining({
          period: '2026-W43',
          language: 'AM',
        })
      );
    });
  });

  it('approves a report requiring review', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('btn-approve-rep-002')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-approve-rep-002'));

    await waitFor(() => {
      expect(enterpriseService.approveAiReport).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'rep-002',
        true
      );
    });
  });

  it('rejects an unsuitable generated report', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('btn-reject-rep-002')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-reject-rep-002'));

    await waitFor(() => {
      expect(enterpriseService.approveAiReport).toHaveBeenCalledWith(
        TARGET_ENTERPRISE_ID,
        'rep-002',
        false
      );
    });
  });

  it('dissemination control: disabled for GENERATED reports and opens broadcast modal for APPROVED reports', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('btn-broadcast-rep-001')).toBeInTheDocument();
      expect(screen.getByTestId('btn-broadcast-rep-002')).toBeInTheDocument();
    });

    // rep-002 is GENERATED, broadcast button must be disabled
    const unapprovedBroadcastBtn = screen.getByTestId('btn-broadcast-rep-002');
    expect(unapprovedBroadcastBtn).toBeDisabled();

    // rep-001 is APPROVED, broadcast button is enabled
    const approvedBroadcastBtn = screen.getByTestId('btn-broadcast-rep-001');
    expect(approvedBroadcastBtn).not.toBeDisabled();

    fireEvent.click(approvedBroadcastBtn);

    await waitFor(() => {
      expect(screen.getByTestId('broadcast-modal')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-broadcast-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('confirm-broadcast-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('broadcast-modal')).not.toBeInTheDocument();
    });
  });
});
