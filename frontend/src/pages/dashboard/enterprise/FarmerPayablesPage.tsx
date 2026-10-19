import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  ArrowLeft,
  Building2,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Send,
  Smartphone,
  Banknote,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  X,
  CreditCard,
  Ban,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { generateIdempotencyKey } from '../../../utils/idempotency';
import type {
  FarmerPaymentRequest,
  FarmerPaymentResponse,
} from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

export default function FarmerPayablesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [searchParams, setSearchParams] = useSearchParams();
  const paramFarmerId = searchParams.get('farmerId');

  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(paramFarmerId || '');
  const [activeTab, setActiveTab] = useState<'PAYABLES' | 'PAYMENTS' | 'DELIVERIES'>('PAYABLES');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PARTIAL' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal State (F-807)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'TELEBIRR' | 'CASH'>('TELEBIRR');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [payError, setPayError] = useState<string | null>(null);
  const [lastPaymentResult, setLastPaymentResult] = useState<FarmerPaymentResponse | null>(null);

  // Delivery Cancellation Modal State (F-808)
  const [cancelDeliveryId, setCancelDeliveryId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // 1. Fetch Farmers list
  const { data: farmers = [], isLoading: farmersLoading } = useQuery({
    queryKey: queryKeys.enterprise.farmers(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseFarmers(enterpriseId),
  });

  // Default to first farmer if none selected
  const activeFarmerId: string = selectedFarmerId || (farmers[0]?.id ?? '');
  const activeFarmer = farmers.find((f) => f.id === activeFarmerId) || null;

  // 2. Fetch Farmer Balance Summary (B-408)
  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: queryKeys.supply.balance(activeFarmerId),
    queryFn: () => enterpriseService.getFarmerBalance(activeFarmerId),
    enabled: Boolean(activeFarmerId),
  });

  // 3. Fetch Farmer Payables (B-406)
  const {
    data: payables = [],
    isLoading: payablesLoading,
    isError: payablesError,
    refetch: refetchPayables,
  } = useQuery({
    queryKey: ['enterprise', 'payables', activeFarmerId],
    queryFn: () => enterpriseService.getFarmerPayables(activeFarmerId),
    enabled: Boolean(activeFarmerId),
  });

  // 4. Fetch Enterprise Farmer Payments History (B-405)
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: queryKeys.enterprise.payments(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseFarmerPayments(enterpriseId),
  });

  // 5. Fetch Deliveries (for unpaid cancellation flow F-808)
  const { data: deliveries = [], refetch: refetchDeliveries } = useQuery({
    queryKey: queryKeys.enterprise.deliveries(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseDeliveries(enterpriseId),
  });

  // Filter payables
  const filteredPayables = useMemo(() => {
    return payables.filter((p) => {
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.payableNo?.toLowerCase().includes(q) ||
        p.productName?.toLowerCase().includes(q) ||
        p.farmerName?.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [payables, statusFilter, searchQuery]);

  // Farmer's payment history
  const farmerPayments = useMemo(() => {
    if (!activeFarmerId) return [];
    return payments.filter((pmt) => pmt.farmerId === activeFarmerId);
  }, [payments, activeFarmerId]);

  // Farmer's deliveries
  const farmerDeliveries = useMemo(() => {
    if (!activeFarmerId) return [];
    return deliveries.filter((d) => d.farmerId === activeFarmerId);
  }, [deliveries, activeFarmerId]);

  // Payout Mutation (F-807)
  const payMutation = useMutation({
    mutationFn: (data: FarmerPaymentRequest) => enterpriseService.createFarmerPayment(data),
    onSuccess: (paymentResult) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supply.balance(activeFarmerId) });
      queryClient.invalidateQueries({ queryKey: ['enterprise', 'payables', activeFarmerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.payments(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.metrics(enterpriseId) });
      setLastPaymentResult(paymentResult);
      setIsPayModalOpen(false);
      setPayError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Payment disbursement failed.';
      setPayError(msg);
    },
  });

  // Cancel Delivery Mutation (F-808)
  const cancelDeliveryMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      enterpriseService.cancelDelivery(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.deliveries(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: ['enterprise', 'payables', activeFarmerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.supply.balance(activeFarmerId) });
      setCancelDeliveryId(null);
      setCancelReason('');
      setCancelError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Delivery cancellation failed.';
      setCancelError(msg);
    },
  });

  const handleOpenPayModal = () => {
    setIdempotencyKey(generateIdempotencyKey());
    setPayAmount((balance?.totalPendingPayout || 0).toString());
    setPayMethod('TELEBIRR');
    setPayError(null);
    setIsPayModalOpen(true);
  };

  const handleDisbursePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount);
    const maxBalance = balance?.totalPendingPayout || 0;

    if (isNaN(amountVal) || amountVal <= 0) {
      setPayError('Please enter a valid disbursement amount greater than 0.');
      return;
    }

    if (!activeFarmerId) {
      setPayError('Please select a valid smallholder before disbursing.');
      return;
    }

    if (amountVal > maxBalance) {
      setPayError(
        `Disbursement amount (${amountVal.toFixed(2)} ETB) cannot exceed outstanding balance of ${maxBalance.toFixed(2)} ETB.`
      );
      return;
    }

    payMutation.mutate({
      enterpriseId,
      farmerId: activeFarmerId,
      amount: amountVal,
      paymentMethod: payMethod,
    });
  };

  const handleRefresh = () => {
    refetchBalance();
    refetchPayables();
    refetchPayments();
    refetchDeliveries();
  };

  return (
    <div className="space-y-6" data-testid="farmer-payables-page">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Community Hub</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Farmer Payables & Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Farmer Payables & Balances</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Disbursement entity: <strong className="text-slate-700 dark:text-slate-300">{enterpriseName}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh payables and ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenPayModal}
            disabled={!balance || (balance.totalPendingPayout || 0) <= 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="open-pay-farmer-button"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Disburse Payment</span>
          </button>
        </div>
      </div>

      {/* FARMER SELECTOR STRIP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Select Smallholder:
          </span>
          {farmersLoading ? (
            <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
          ) : (
            <select
              value={activeFarmerId}
              onChange={(e) => {
                setSelectedFarmerId(e.target.value);
                setSearchParams({ farmerId: e.target.value });
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              data-testid="farmer-selector"
            >
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName} ({f.farmerCode}) - {f.village || 'Keske'}
                </option>
              ))}
            </select>
          )}
        </div>

        {activeFarmer && (
          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>Phone: <strong className="text-slate-800 dark:text-slate-200">{activeFarmer.phoneNumber}</strong></span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {activeFarmer.verificationStatus}
            </span>
          </div>
        )}
      </div>

      {/* LAST PAYMENT SUCCESS BANNER */}
      {lastPaymentResult && (
        <div
          className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200"
          data-testid="payment-success-notification"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">
                Payment {lastPaymentResult.paymentNo} Disbursed Successfully!
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Amount: <strong>{lastPaymentResult.amount?.toFixed(2)} ETB</strong> via {lastPaymentResult.paymentMethod}{' '}
                (Reference: <span className="font-mono">{lastPaymentResult.gatewayReference || 'CASH-SETTLED'}</span>)
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastPaymentResult(null)}
            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FARMER BALANCE STATEMENT CARDS (MATCHING API STRICTLY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="farmer-balance-cards">
        {/* Total Delivered Value */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Delivered Value</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          {balanceLoading ? (
            <div className="h-8 w-24 bg-slate-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-xl font-bold mt-2 text-slate-900 dark:text-slate-100" data-testid="total-delivered-value">
              {(balance?.totalDeliveredValue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ETB
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">Cumulative verified crop harvest</p>
        </div>

        {/* Total Settled */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Settled</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          {balanceLoading ? (
            <div className="h-8 w-24 bg-slate-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-xl font-bold mt-2 text-emerald-700 dark:text-emerald-400" data-testid="total-settled">
              {(balance?.totalSettled || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ETB
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">Disbursed via Telebirr or cash</p>
        </div>

        {/* Outstanding Pending Payout */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Pending Payout</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          {balanceLoading ? (
            <div className="h-8 w-24 bg-amber-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-xl font-extrabold mt-2 text-amber-800 dark:text-amber-300" data-testid="pending-payout">
              {(balance?.totalPendingPayout || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ETB
            </p>
          )}
          <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-1">Eligible for immediate disbursement</p>
        </div>

        {/* Open Payables Count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Open Payables</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          {balanceLoading ? (
            <div className="h-8 w-12 bg-slate-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-xl font-bold mt-2 text-blue-600 dark:text-blue-400" data-testid="open-payables-count">
              {balance?.openPayablesCount ?? payables.filter((p) => p.status === 'OPEN').length}
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">Unsettled harvest vouchers</p>
        </div>
      </div>

      {/* SUB-TABS: OPEN PAYABLES / DISBURSEMENT HISTORY / DELIVERIES */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PAYABLES')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'PAYABLES'
                ? 'border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            data-testid="tab-payables"
          >
            <DollarSign className="w-4 h-4" />
            <span>Open Payables ({payables.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'PAYMENTS'
                ? 'border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            data-testid="tab-payments"
          >
            <CreditCard className="w-4 h-4" />
            <span>Disbursement History ({farmerPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DELIVERIES')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'DELIVERIES'
                ? 'border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            data-testid="tab-deliveries"
          >
            <Clock className="w-4 h-4" />
            <span>Deliveries & Corrections ({farmerDeliveries.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PAYABLES LEDGER TABLE */}
      {activeTab === 'PAYABLES' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(['ALL', 'OPEN', 'PARTIAL', 'SETTLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payable #, crop name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                data-testid="payables-search-input"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            {payablesLoading ? (
              <div className="p-6 space-y-3">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ) : payablesError ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <p>Failed to load payables.</p>
                <button
                  onClick={() => refetchPayables()}
                  className="mt-2 px-3 py-1.5 bg-emerald-700 text-white rounded font-semibold text-xs"
                >
                  Retry
                </button>
              </div>
            ) : filteredPayables.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs" data-testid="empty-payables">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">No payables matching criteria</p>
                <p className="text-slate-400 mt-0.5">All certified intake items have been paid or no payables found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" data-testid="payables-table">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Payable #</th>
                      <th className="py-3 px-3">Commodity Item</th>
                      <th className="py-3 px-3">Amount Due</th>
                      <th className="py-3 px-3">Allocated</th>
                      <th className="py-3 px-3">Remaining Balance</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayables.map((payable) => {
                      const isSettled = payable.status === 'SETTLED';
                      const isOpen = payable.status === 'OPEN';
                      return (
                        <tr
                          key={payable.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                          data-testid={`payable-row-${payable.id}`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {payable.payableNo}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {payable.productName || 'Harvest Item'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Farmer: {payable.farmerName} ({payable.farmerCode})
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {(payable.amountDue || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            ETB
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {(payable.amountAllocated || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            ETB
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono">
                              {(payable.remainingAmount || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              ETB
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isSettled
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : isOpen
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {payable.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                            {payable.createdAt ? new Date(payable.createdAt).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DISBURSEMENT HISTORY (F-807) */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {paymentsLoading ? (
            <div className="p-6 space-y-3">
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ) : farmerPayments.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs" data-testid="empty-payments">
              <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">No payment disbursements yet</p>
              <p className="text-slate-400 mt-0.5">
                Execute a payout using Telebirr or cash to disburse funds to this farmer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="payments-table">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Payment #</th>
                    <th className="py-3 px-3">Disbursed Amount</th>
                    <th className="py-3 px-3">Channel / Method</th>
                    <th className="py-3 px-3">Gateway Reference</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {farmerPayments.map((pmt) => (
                    <tr
                      key={pmt.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`payment-row-${pmt.id}`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {pmt.paymentNo}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        {(pmt.amount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ETB
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          {pmt.paymentMethod === 'TELEBIRR' ? (
                            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>{pmt.paymentMethod || 'TELEBIRR'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {pmt.gatewayReference || 'CASH-SETTLED'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pmt.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {pmt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                        {pmt.paidAt ? new Date(pmt.paidAt).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DELIVERIES & CANCELLATIONS (F-808) */}
      {activeTab === 'DELIVERIES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {farmerDeliveries.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              <p>No intake deliveries recorded for this farmer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="farmer-deliveries-table">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Delivery #</th>
                    <th className="py-3 px-3">Intake Items</th>
                    <th className="py-3 px-3">Delivered Value</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {farmerDeliveries.map((del) => {
                    const isUnpaid = del.status === 'RECORDED';
                    const isCancelled = del.status === 'CANCELLED';
                    return (
                      <tr key={del.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {del.deliveryNo}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {del.items?.map((it) => `${it.deliveredQty} ${it.unit} ${it.productTypeName}`).join(', ') ||
                            'Items'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {(del.totalDeliveredValue || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          ETB
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : isUnpaid
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {del.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isUnpaid && (
                            <button
                              onClick={() => {
                                setCancelDeliveryId(del.id || '');
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold text-xs"
                              data-testid={`cancel-delivery-btn-${del.id}`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancel Unpaid</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAY FARMER MODAL (F-807) */}
      {isPayModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          data-testid="pay-farmer-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-700" />
                  <span>Farmer Payout Disbursement</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct ledger settlement via Telebirr or Cash
                </p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notification */}
            {payError && (
              <div
                className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-medium flex items-start gap-2"
                data-testid="pay-modal-error"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{payError}</span>
              </div>
            )}

            <form noValidate onSubmit={handleDisbursePayment} className="p-5 space-y-4">
              {/* Recipient Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Beneficiary Smallholder:</span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {activeFarmer?.fullName} ({activeFarmer?.farmerCode})
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Registered Mobile / Telebirr:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                    {activeFarmer?.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Maximum Eligible Payout:</span>
                  <strong className="text-amber-700 dark:text-amber-400 font-bold" data-testid="modal-max-eligible-payout">
                    {(balance?.totalPendingPayout || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    ETB
                  </strong>
                </div>
              </div>

              {/* Disbursement Channel */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayMethod('TELEBIRR')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      payMethod === 'TELEBIRR'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    data-testid="pay-method-telebirr"
                  >
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-xs">Telebirr Payout</p>
                      <p className="text-[10px] text-slate-400">Instant mobile wallet</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('CASH')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      payMethod === 'CASH'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    data-testid="pay-method-cash"
                  >
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-bold text-xs">Cash via Agent</p>
                      <p className="text-[10px] text-slate-400">Cooperative field desk</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Disbursement Amount (ETB) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmount((balance?.totalPendingPayout || 0).toString())}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-extrabold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  data-testid="payout-amount-input"
                />
              </div>

              {/* Idempotency Notice */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-[11px] text-slate-400 font-mono">
                Idempotency Token: {idempotencyKey.slice(0, 18)}... (Guarantees single payout execution)
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending || !payAmount || parseFloat(payAmount) <= 0}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
                  data-testid="confirm-disburse-button"
                >
                  {payMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payout...</span>
                    </>
                  ) : (
                    <span>Confirm & Disburse Payout</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL UNPAID DELIVERY MODAL (F-808) */}
      {cancelDeliveryId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          data-testid="cancel-delivery-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>Cancel Unpaid Supply Delivery</span>
            </h3>
            <p className="text-xs text-slate-500">
              This action will mark the delivery as CANCELLED. History and logs will be preserved.
            </p>

            {cancelError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cancellation Reason *
              </label>
              <textarea
                required
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Duplicate entry or producer recalled harvest prior to inspection"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                data-testid="cancel-reason-input"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelDeliveryId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 rounded-lg hover:bg-slate-100"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={cancelDeliveryMutation.isPending || !cancelReason.trim()}
                onClick={() =>
                  cancelDeliveryMutation.mutate({
                    id: cancelDeliveryId,
                    reason: cancelReason,
                  })
                }
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                data-testid="confirm-cancel-delivery-btn"
              >
                {cancelDeliveryMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
