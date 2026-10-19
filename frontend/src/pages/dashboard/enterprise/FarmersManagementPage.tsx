import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  UserPlus,
  ShieldCheck,
  Building2,
  DollarSign,
  Package,
  X,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type { FarmerResponse, FarmerBalanceSummaryResponse } from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

export default function FarmersManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerResponse | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [farmerIdToLink, setFarmerIdToLink] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Fetch Farmers for this Enterprise Only (Scoped isolation)
  const {
    data: farmers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.enterprise.farmers(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseFarmers(enterpriseId),
  });

  // 2. Fetch Selected Farmer's Balance Summary
  const {
    data: farmerBalance,
    isLoading: balanceLoading,
  } = useQuery<FarmerBalanceSummaryResponse | null>({
    queryKey: ['farmer-balance', selectedFarmer?.id],
    queryFn: () => (selectedFarmer ? enterpriseService.getFarmerBalance(selectedFarmer.id!) : null),
    enabled: !!selectedFarmer?.id,
  });

  // Approve Farmer Mutation
  const approveMutation = useMutation({
    mutationFn: (farmerId: string) => enterpriseService.approveFarmer(enterpriseId, farmerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.farmers(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.metrics(enterpriseId) });
      setActionSuccess(`Farmer ${data.fullName || data.farmerCode || ''} approved successfully.`);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to approve farmer.');
      setActionSuccess(null);
    },
  });

  // Reject Farmer Mutation
  const rejectMutation = useMutation({
    mutationFn: (farmerId: string) => enterpriseService.rejectFarmer(enterpriseId, farmerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.farmers(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.metrics(enterpriseId) });
      setActionSuccess(`Farmer ${data.fullName || data.farmerCode || ''} rejected/suspended.`);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to reject farmer.');
      setActionSuccess(null);
    },
  });

  // Link Farmer Mutation
  const linkMutation = useMutation({
    mutationFn: (farmerId: string) => enterpriseService.linkFarmer(enterpriseId, farmerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.farmers(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.metrics(enterpriseId) });
      setIsLinkModalOpen(false);
      setFarmerIdToLink('');
      setActionSuccess(`Farmer ${data.fullName || data.farmerCode || ''} linked successfully.`);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to link farmer.');
      setActionSuccess(null);
    },
  });

  // Filtered List
  const filteredFarmers = useMemo(() => {
    return farmers.filter((f) => {
      // Enterprise safety: confirm affiliation
      if (f.enterpriseId && f.enterpriseId !== enterpriseId) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && f.verificationStatus !== statusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = f.fullName?.toLowerCase().includes(query);
        const matchesCode = f.farmerCode?.toLowerCase().includes(query);
        const matchesPhone = f.phoneNumber?.includes(query);
        const matchesVillage = f.village?.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesPhone || matchesVillage;
      }

      return true;
    });
  }, [farmers, enterpriseId, statusFilter, searchQuery]);

  const pendingCount = farmers.filter((f) => f.verificationStatus === 'PENDING').length;
  const verifiedCount = farmers.filter((f) => f.verificationStatus === 'VERIFIED').length;
  const rejectedCount = farmers.filter((f) => f.verificationStatus === 'REJECTED' || f.verificationStatus === 'SUSPENDED').length;

  return (
    <div className="space-y-6" data-testid="farmers-management-page">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Enterprise Hub</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Farmers Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Affiliated Farmers</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Scoped strictly to <strong className="text-slate-700 dark:text-slate-300">{enterpriseName}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
            data-testid="link-farmer-button"
          >
            <UserPlus className="w-4 h-4" />
            <span>Link Existing Farmer</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banners */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Header Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Affiliated</span>
          <p className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100">{farmers.length}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Pending Approvals</span>
          <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400" data-testid="pending-count-badge">
            {pendingCount}
          </p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Verified Active</span>
          <p className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{verifiedCount}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Suspended / Rejected</span>
          <p className="text-xl font-bold mt-1 text-slate-500">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            All ({farmers.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('VERIFIED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              statusFilter === 'VERIFIED'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified ({verifiedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'REJECTED'
                ? 'bg-slate-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            data-testid="farmer-search-input"
          />
        </div>
      </div>

      {/* FARMERS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Unable to load farmers roster.
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"
            >
              Retry
            </button>
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No affiliated farmers found matching your filter.
            </p>
            <p className="text-xs text-slate-500">
              Link smallholders to this cooperative or invite them to register via USSD (*844#).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="farmers-table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Farmer Details</th>
                  <th className="py-3 px-3">Member Code</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFarmers.map((farmer) => {
                  const isPending = farmer.verificationStatus === 'PENDING';
                  const isVerified = farmer.verificationStatus === 'VERIFIED';

                  return (
                    <tr
                      key={farmer.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`farmer-row-${farmer.id}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {farmer.fullName || 'Unnamed Farmer'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {farmer.phoneNumber || 'No phone'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-medium text-emerald-800 dark:text-emerald-400">
                        {farmer.farmerCode || 'FRM-PENDING'}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-slate-800 dark:text-slate-200">{farmer.village || 'Omo Valley'}</div>
                        <div className="text-[11px] text-slate-400">{farmer.kebele || 'Turmi Woreda'}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isVerified ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : isPending ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{farmer.verificationStatus || 'PENDING'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => farmer.id && approveMutation.mutate(farmer.id)}
                                disabled={approveMutation.isPending}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 transition-colors"
                                title="Approve this farmer for the enterprise"
                                data-testid={`approve-farmer-${farmer.id}`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => farmer.id && rejectMutation.mutate(farmer.id)}
                                disabled={rejectMutation.isPending}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 transition-colors"
                                title="Reject this farmer registration"
                                data-testid={`reject-farmer-${farmer.id}`}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedFarmer(farmer)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            title="View balance & deliveries"
                            data-testid={`view-farmer-${farmer.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FARMER DETAIL & FINANCIAL BALANCE MODAL */}
      {selectedFarmer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          data-testid="farmer-detail-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedFarmer.fullName || 'Farmer Profile'}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Member ID: {selectedFarmer.farmerCode || 'Pending Assignment'}
                </p>
              </div>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Personal Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Phone Number:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                    {selectedFarmer.phoneNumber || 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Village & Kebele:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedFarmer.village || 'Keske'}, {selectedFarmer.kebele || 'Turmi'}
                  </p>
                </div>
              </div>

              {/* Financial Balances */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Harvest Deliveries & Balances</span>
                </h4>

                {balanceLoading ? (
                  <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : farmerBalance ? (
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Total Delivered</span>
                      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                        {formatETB(farmerBalance.totalDeliveredValue)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/40">
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold uppercase">Disbursed / Settled</span>
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mt-1">
                        {formatETB(farmerBalance.totalSettled)}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-100 dark:border-amber-900/40">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase">Pending Payout</span>
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mt-1">
                        {formatETB(farmerBalance.totalPendingPayout)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    No balance summary recorded yet for this producer.
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="pt-2 flex items-center gap-2">
                <Link
                  to="/dashboard/enterprise/supply"
                  className="flex-1 text-center py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Record Crop Delivery</span>
                </Link>
                <Link
                  to="/dashboard/enterprise/payments"
                  className="flex-1 text-center py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Execute Payout</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINK EXISTING FARMER MODAL */}
      {isLinkModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          data-testid="link-farmer-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Link Farmer to Enterprise
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Affiliate an existing smallholder registered in South Omo
                </p>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (farmerIdToLink.trim()) {
                  linkMutation.mutate(farmerIdToLink.trim());
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Farmer ID or UUID
                </label>
                <input
                  type="text"
                  required
                  value={farmerIdToLink}
                  onChange={(e) => setFarmerIdToLink(e.target.value)}
                  placeholder="e.g. 22222222-2222-2222-2222-222222222222"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  data-testid="link-farmer-input"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the unique Farmer identifier issued during registration.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkMutation.isPending || !farmerIdToLink.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                  data-testid="confirm-link-button"
                >
                  {linkMutation.isPending ? 'Linking...' : 'Link Farmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
