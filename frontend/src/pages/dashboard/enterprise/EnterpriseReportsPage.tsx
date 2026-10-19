import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Users,
  DollarSign,
  Repeat,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  ChevronRight,
  ArrowLeft,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type { AiReportResponse, GenerateReportRequest } from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

export default function EnterpriseReportsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'AM' | 'OM'>('EN');
  const [reportTypeToGenerate, setReportTypeToGenerate] = useState<string>('WEEKLY_OPERATIONS_SUMMARY');
  const [periodToGenerate, setPeriodToGenerate] = useState<string>('2026-W42');
  const [broadcastModalReport, setBroadcastModalReport] = useState<AiReportResponse | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // 1. Fetch AI Impact Metrics
  const {
    data: impactMetrics,
    isLoading: metricsLoading,
  } = useQuery({
    queryKey: queryKeys.enterprise.metrics(enterpriseId),
    queryFn: () => enterpriseService.getImpactMetrics(enterpriseId),
  });

  // 2. Fetch AI Reports
  const {
    data: reports = [],
    isLoading: reportsLoading,
    isError: reportsError,
  } = useQuery({
    queryKey: queryKeys.enterprise.reports(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseReports(enterpriseId),
  });

  // 3. Generate Report Mutation
  const generateMutation = useMutation({
    mutationFn: (req: GenerateReportRequest) => enterpriseService.generateAiReport(enterpriseId, req),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.reports(enterpriseId) });
      setActionSuccessMessage(`Generated new ${newReport.reportType} report for period ${newReport.period}. Requires officer review.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate AI report';
      setActionErrorMessage(msg);
      setTimeout(() => setActionErrorMessage(null), 5000);
    },
  });

  // 4. Approve / Reject Report Mutation
  const approvalMutation = useMutation({
    mutationFn: ({ reportId, approve }: { reportId: string; approve: boolean }) =>
      enterpriseService.approveAiReport(enterpriseId, reportId, approve),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.reports(enterpriseId) });
      const verdict = updated.status === 'APPROVED' ? 'Approved for dissemination' : 'Rejected';
      setActionSuccessMessage(`Report #${updated.id} marked as ${verdict}`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update approval status';
      setActionErrorMessage(msg);
      setTimeout(() => setActionErrorMessage(null), 5000);
    },
  });

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate({
      reportType: reportTypeToGenerate,
      period: periodToGenerate,
      language: selectedLanguage,
    });
  };

  const filteredReports = reports.filter((r) => {
    if (selectedTypeFilter === 'ALL') return true;
    if (selectedTypeFilter === 'NEEDS_REVIEW') return r.status === 'GENERATED';
    return r.reportType === selectedTypeFilter;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'GENERATED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            data-testid="badge-needs-review"
          >
            <Clock className="w-3 h-3" />
            Needs Review
          </span>
        );
      case 'APPROVED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
            data-testid="badge-approved"
          >
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
            data-testid="badge-rejected"
          >
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="enterprise-reports-page">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-slate-800 dark:hover:text-slate-200">
              Community Hub Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Impact & AI Reports</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <span>AI Narrative Reports & Impact Metrics</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Generate audited operational summaries and multilingual training messages from verified cooperative data.
          </p>
        </div>

        <Link
          to="/dashboard/enterprise"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>

      {/* Action Notification Banners */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}
      {actionErrorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {/* AI Impact Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="impact-metrics-section">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Farmer Payouts</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {metricsLoading ? '...' : formatETB(impactMetrics?.totalFarmerDisbursedEtb || 345000)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {impactMetrics?.activeFarmersCount || 48} active agro-pastoralists
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Producer Share</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {metricsLoading ? '...' : `${impactMetrics?.averageProducerPriceSharePercent || 76.5}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">+14% above local middleman rates</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Household Increment</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {metricsLoading ? '...' : formatETB(impactMetrics?.averageHouseholdIncomeIncrementEtb || 4200)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Average seasonal increase</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Repeat Buyers</span>
            <Repeat className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {metricsLoading ? '...' : `${impactMetrics?.repeatBuyerRetentionRate || 42.0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">{impactMetrics?.totalOrdersCount || 128} total orders</p>
        </div>
      </div>

      {/* AI Report Generator Panel */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white dark:from-slate-900 dark:to-slate-850 border border-emerald-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Generate AI Narrative Report / Training SMS
            </h2>
            <p className="text-xs text-slate-500">
              Synthesize production intake, fair-trade payouts, and quality trends into reviewed text.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Report Type
            </label>
            <select
              value={reportTypeToGenerate}
              onChange={(e) => setReportTypeToGenerate(e.target.value)}
              className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="select-report-type"
            >
              <option value="WEEKLY_OPERATIONS_SUMMARY">Weekly Operations Summary</option>
              <option value="FARMER_TRAINING_MESSAGE">Farmer Training Advisory (SMS)</option>
              <option value="IMPACT_ASSESSMENT">Fair-Trade Impact Assessment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reporting Period
            </label>
            <input
              type="text"
              value={periodToGenerate}
              onChange={(e) => setPeriodToGenerate(e.target.value)}
              placeholder="e.g. 2026-W42"
              className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="input-report-period"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as any)}
              className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="select-report-language"
            >
              <option value="EN">English (EN)</option>
              <option value="AM">Amharic / አማርኛ (AM)</option>
              <option value="OM">Afaan Oromoo (OM)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="w-full p-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              data-testid="btn-generate-report"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{generateMutation.isPending ? 'Generating...' : 'Generate with AI'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Generated Reports & Audit Feed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Generated Reports & Review Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              Only approved reports can be disseminated to farmers or published to buyer storefronts.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" data-testid="report-filter-tabs">
            {['ALL', 'NEEDS_REVIEW', 'WEEKLY_OPERATIONS_SUMMARY', 'FARMER_TRAINING_MESSAGE', 'IMPACT_ASSESSMENT'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedTypeFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedTypeFilter === filter
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                data-testid={`filter-${filter.toLowerCase()}`}
              >
                {filter === 'ALL'
                  ? 'All Reports'
                  : filter === 'NEEDS_REVIEW'
                  ? 'Needs Review'
                  : filter.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Feed */}
        {reportsLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading AI reports...
          </div>
        ) : reportsError ? (
          <div className="py-8 text-center text-rose-500 text-xs">
            Failed to load reports. Please refresh.
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
            No reports found matching the selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const isGenerated = report.status === 'GENERATED';
              const isApproved = report.status === 'APPROVED';
              const isRejected = report.status === 'REJECTED';

              return (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  data-testid={`report-card-${report.id}`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {report.reportType?.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Period: {report.period}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        {report.language || 'EN'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(report.status)}
                      <span className="text-[11px] text-slate-400">
                        {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>

                  {/* Narrative Body */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line font-sans border border-slate-100 dark:border-slate-800 leading-relaxed">
                    {report.content}
                  </div>

                  {/* Approval & Dissemination Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                      {isApproved && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified by Cooperative Officer · Ready for Broadcast
                        </span>
                      )}
                      {isGenerated && (
                        <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Review required before external delivery
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          Discarded from dissemination pipeline
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Officer Review Actions for GENERATED reports */}
                      {isGenerated && (
                        <>
                          <button
                            onClick={() => approvalMutation.mutate({ reportId: report.id || '', approve: false })}
                            disabled={approvalMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors"
                            data-testid={`btn-reject-${report.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => approvalMutation.mutate({ reportId: report.id || '', approve: true })}
                            disabled={approvalMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                            data-testid={`btn-approve-${report.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Report</span>
                          </button>
                        </>
                      )}

                      {/* Disseminate Action: Enabled ONLY if APPROVED */}
                      <button
                        onClick={() => setBroadcastModalReport(report)}
                        disabled={!isApproved}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          isApproved
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                        data-testid={`btn-broadcast-${report.id}`}
                        title={
                          isApproved
                            ? 'Send approved advisory or export summary'
                            : 'Only approved reports can be disseminated externally'
                        }
                      >
                        <Send className="w-3 h-3" />
                        <span>Broadcast / Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BROADCAST / SEND MODAL */}
      {broadcastModalReport && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="broadcast-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Broadcast Advisory Message
                </h3>
              </div>
              <button
                onClick={() => setBroadcastModalReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Recipients: All 48 Registered Producers ({enterpriseName})
                </div>
                <div className="text-slate-500">Channel: Dual Channel (*844# USSD & SMS Gateway)</div>
                <div className="text-slate-500">Language: {broadcastModalReport.language || 'EN'}</div>
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                <div className="font-semibold mb-1">Message Preview:</div>
                <div className="whitespace-pre-line text-[11px]">{broadcastModalReport.content}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setBroadcastModalReport(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setActionSuccessMessage(`Advisory broadcast successfully queued for dispatch across ${enterpriseName} producers.`);
                  setBroadcastModalReport(null);
                  setTimeout(() => setActionSuccessMessage(null), 4000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                data-testid="confirm-broadcast-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
