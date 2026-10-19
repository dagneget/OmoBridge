import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Package,
  Boxes,
  DollarSign,
  ClipboardCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import type {
  SupplyDeliveryResponse,
  SupplyDeliveryInspectionRequest,
} from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

interface ItemInspectionState {
  deliveryItemId: string;
  deliveredQty: number;
  acceptedQty: string;
  rejectedQty: string;
  rejectionReason: string;
  unit: string;
  productTypeName: string;
  grade: string;
  unitPriceSnapshot: number;
}

export default function InspectionPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [searchParams, setSearchParams] = useSearchParams();
  const paramDeliveryId = searchParams.get('deliveryId');

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>(paramDeliveryId || '');
  const [inspectionItems, setInspectionItems] = useState<Record<string, ItemInspectionState>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    delivery: SupplyDeliveryResponse;
    generatedPayableEtb: number;
    acceptedLotsCount: number;
  } | null>(null);

  // 1. Fetch Deliveries
  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    isError: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: queryKeys.enterprise.deliveries(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseDeliveries(enterpriseId),
  });

  // Filter deliveries awaiting inspection
  const pendingDeliveries = useMemo(() => {
    return deliveries.filter((d) => d.status === 'RECORDED');
  }, [deliveries]);

  // Sync selected delivery with query param or first pending delivery
  useEffect(() => {
    if (paramDeliveryId) {
      setSelectedDeliveryId(paramDeliveryId);
    } else if (pendingDeliveries.length > 0 && !selectedDeliveryId) {
      setSelectedDeliveryId(pendingDeliveries[0].id || '');
    }
  }, [paramDeliveryId, pendingDeliveries, selectedDeliveryId]);

  const activeDelivery = useMemo(() => {
    return deliveries.find((d) => d.id === selectedDeliveryId) || null;
  }, [deliveries, selectedDeliveryId]);

  // Initialize inspection form state whenever activeDelivery changes
  useEffect(() => {
    if (activeDelivery && activeDelivery.items) {
      const initial: Record<string, ItemInspectionState> = {};
      activeDelivery.items.forEach((item) => {
        const id = item.id || '';
        const delivered = item.deliveredQty || 0;
        initial[id] = {
          deliveryItemId: id,
          deliveredQty: delivered,
          acceptedQty: delivered.toString(), // default to full acceptance
          rejectedQty: '0',
          rejectionReason: '',
          unit: item.unit || 'KG',
          productTypeName: item.productTypeName || 'Raw Harvest Commodity',
          grade: item.grade || 'Grade A',
          unitPriceSnapshot: item.unitPriceSnapshot || 0,
        };
      });
      setInspectionItems(initial);
      setFormError(null);
      setSuccessResult(null);
    }
  }, [activeDelivery]);

  // Check sum validation for all items
  const validationSummary = useMemo(() => {
    const itemStates = Object.values(inspectionItems);
    if (itemStates.length === 0) {
      return {
        isValid: false,
        errors: ['No inspection items available'],
        totalProjectedPayable: 0,
        totalAcceptedQty: 0,
      };
    }

    const errors: string[] = [];
    let totalProjectedPayable = 0;
    let totalAcceptedQty = 0;

    itemStates.forEach((item) => {
      const accepted = parseFloat(item.acceptedQty);
      const rejected = parseFloat(item.rejectedQty);
      const delivered = item.deliveredQty;

      if (isNaN(accepted) || accepted < 0) {
        errors.push(`Accepted quantity for ${item.productTypeName} must be 0 or greater.`);
      }
      if (isNaN(rejected) || rejected < 0) {
        errors.push(`Rejected quantity for ${item.productTypeName} must be 0 or greater.`);
      }

      if (!isNaN(accepted) && !isNaN(rejected)) {
        const sum = Math.round((accepted + rejected) * 100) / 100;
        const target = Math.round(delivered * 100) / 100;

        if (sum !== target) {
          const diff = Math.round((target - sum) * 100) / 100;
          errors.push(
            `Sum mismatch on ${item.productTypeName}: Accepted (${accepted} ${item.unit}) + Rejected (${rejected} ${item.unit}) = ${sum} ${item.unit}. Must equal delivered ${target} ${item.unit} (difference of ${diff > 0 ? `+${diff}` : diff} ${item.unit}).`
          );
        }

        if (rejected > 0 && !item.rejectionReason.trim()) {
          errors.push(`Please provide a rejection reason for ${item.productTypeName}.`);
        }

        if (accepted > 0) {
          totalProjectedPayable += accepted * item.unitPriceSnapshot;
          totalAcceptedQty += accepted;
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      totalProjectedPayable,
      totalAcceptedQty,
    };
  }, [inspectionItems]);

  // Inspection Mutation
  const inspectMutation = useMutation({
    mutationFn: async (payload: SupplyDeliveryInspectionRequest) => {
      if (!selectedDeliveryId) throw new Error('No delivery selected');
      return enterpriseService.inspectDelivery(selectedDeliveryId, payload);
    },
    onSuccess: (updatedDelivery) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.deliveries(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.lots(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.metrics(enterpriseId) });
      setSuccessResult({
        delivery: updatedDelivery,
        generatedPayableEtb: validationSummary.totalProjectedPayable,
        acceptedLotsCount: Object.values(inspectionItems).filter((i) => parseFloat(i.acceptedQty) > 0).length,
      });
      setFormError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Inspection submission failed.';
      setFormError(msg);
    },
  });

  const handleUpdateItem = (id: string, field: keyof ItemInspectionState, value: string) => {
    setInspectionItems((prev) => {
      const current = prev[id];
      if (!current) return prev;

      const updated = { ...current, [field]: value };

      // When acceptedQty is updated, auto-calculate rejectedQty to match deliveredQty
      if (field === 'acceptedQty') {
        const val = parseFloat(value);
        if (!isNaN(val) && val >= 0 && val <= current.deliveredQty) {
          const rem = Math.round((current.deliveredQty - val) * 100) / 100;
          updated.rejectedQty = rem.toString();
        }
      }

      return { ...prev, [id]: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationSummary.isValid) {
      setFormError('Please resolve all item quantity sum mismatches before submitting.');
      return;
    }

    const payload: SupplyDeliveryInspectionRequest = {
      items: Object.values(inspectionItems).map((i) => ({
        deliveryItemId: i.deliveryItemId,
        acceptedQty: parseFloat(i.acceptedQty),
        rejectedQty: parseFloat(i.rejectedQty),
        rejectionReason: parseFloat(i.rejectedQty) > 0 ? i.rejectionReason : undefined,
      })),
    };

    inspectMutation.mutate(payload);
  };

  return (
    <div className="space-y-6" data-testid="quality-inspection-page">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Community Hub</span>
            </Link>
            <span>/</span>
            <Link to="/dashboard/enterprise/supply" className="hover:text-emerald-700 font-medium">
              Supply Intake
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Quality Inspection</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Harvest Quality Inspection & Grading</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Inspection Station: <strong className="text-slate-700 dark:text-slate-300">{enterpriseName}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchDeliveries()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh intake list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Pending Deliveries Sidebar + Inspection Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pending Deliveries Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Intake Queue ({pendingDeliveries.length})
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Awaiting Inspection</span>
            </div>

            {deliveriesLoading ? (
              <div className="space-y-2">
                <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
            ) : deliveriesError ? (
              <div className="text-center py-6 text-xs text-slate-500">
                <p>Failed to load intake queue.</p>
                <button
                  onClick={() => refetchDeliveries()}
                  className="mt-2 px-3 py-1 bg-emerald-700 text-white rounded text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : pendingDeliveries.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 space-y-2" data-testid="empty-inspection-queue">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">All intake deliveries inspected!</p>
                <p className="text-[11px] text-slate-400">
                  No incoming deliveries currently pending quality inspection.
                </p>
                <Link
                  to="/dashboard/enterprise/supply"
                  className="inline-block mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Record New Delivery →
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1" data-testid="pending-deliveries-list">
                {pendingDeliveries.map((delivery) => {
                  const isSelected = delivery.id === selectedDeliveryId;
                  return (
                    <button
                      key={delivery.id}
                      onClick={() => {
                        setSelectedDeliveryId(delivery.id || '');
                        setSearchParams({ deliveryId: delivery.id || '' });
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-600 ring-1 ring-emerald-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900'
                      }`}
                      data-testid={`select-delivery-${delivery.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {delivery.deliveryNo}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          RECORDED
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                        {delivery.farmerName}
                      </p>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                        <span>{delivery.farmerCode}</span>
                        <span>{delivery.items?.length || 0} commodity item(s)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inspection Form or Selected Details */}
        <div className="lg:col-span-8 space-y-4">
          {activeDelivery ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              {/* Delivery Metadata Card */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        {activeDelivery.deliveryNo}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          activeDelivery.status === 'INSPECTED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                        data-testid="active-delivery-status"
                      >
                        {activeDelivery.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Supplier: <strong className="text-slate-900 dark:text-slate-100">{activeDelivery.farmerName}</strong>{' '}
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">({activeDelivery.farmerCode})</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-xs text-slate-500">
                    <div>Intake Time: {activeDelivery.deliveredAt ? new Date(activeDelivery.deliveredAt).toLocaleString() : 'Today'}</div>
                    {activeDelivery.notes && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{activeDelivery.notes}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Success Result Banner */}
              {successResult && (
                <div
                  className="m-5 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3"
                  data-testid="inspection-success-banner"
                >
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Inspection Successfully Completed & Sealed!</span>
                  </div>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200">
                    Quality inspection verified for delivery <strong>{successResult.delivery.deliveryNo}</strong>.
                    Inventory lots and farmer payables have been created by the system.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span>Generated Farmer Payable</span>
                      </div>
                      <p className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300 mt-0.5" data-testid="generated-payable-amount">
                        {successResult.generatedPayableEtb.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ETB
                      </p>
                      <p className="text-[11px] text-slate-400">Credited to {activeDelivery.farmerName}&apos;s balance</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Boxes className="w-4 h-4 text-emerald-600" />
                        <span>Initialized Inventory Lots</span>
                      </div>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                        {successResult.acceptedLotsCount} Active Lot(s)
                      </p>
                      <p className="text-[11px] text-slate-400">Transferred into raw materials inventory</p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2 text-xs">
                    <Link
                      to="/dashboard/enterprise/farmers"
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg inline-flex items-center gap-1"
                    >
                      <span>View Farmer Balance & Payables</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/dashboard/enterprise/supply"
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg"
                    >
                      Back to Intake Registry
                    </Link>
                  </div>
                </div>
              )}

              {/* Already Inspected Notice */}
              {activeDelivery.status === 'INSPECTED' && !successResult && (
                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      This delivery has already been inspected and certified
                    </h4>
                    <p className="text-xs text-slate-500">
                      The accepted quantities are stored in active inventory lots and payable balances.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {formError && (
                <div
                  className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-medium flex items-start gap-2"
                  data-testid="inspection-form-error"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Inspection Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Commodity Grading & Acceptance</span>
                    <span className="text-slate-400 font-normal">
                      Rule: Accepted + Rejected = Delivered
                    </span>
                  </h3>

                  {Object.values(inspectionItems).map((item, index) => {
                    const accepted = parseFloat(item.acceptedQty) || 0;
                    const rejected = parseFloat(item.rejectedQty) || 0;
                    const sum = Math.round((accepted + rejected) * 100) / 100;
                    const target = Math.round(item.deliveredQty * 100) / 100;
                    const isMismatch = sum !== target;
                    const isReadOnly = activeDelivery.status === 'INSPECTED';

                    return (
                      <div
                        key={item.deliveryItemId}
                        className={`p-4 rounded-xl border transition-colors space-y-3 ${
                          isMismatch
                            ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                        }`}
                        data-testid={`inspection-item-row-${index}`}
                      >
                        {/* Commodity Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {item.productTypeName}
                            </span>
                            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.grade}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Delivered: <strong className="text-emerald-700 dark:text-emerald-400">{item.deliveredQty} {item.unit}</strong>{' '}
                            <span className="text-slate-400">(@ {item.unitPriceSnapshot.toFixed(2)} ETB/{item.unit})</span>
                          </div>
                        </div>

                        {/* Input Fields for Accepted & Rejected */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Accepted Quantity */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Accepted Quantity ({item.unit}) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={isReadOnly || inspectMutation.isPending}
                              value={item.acceptedQty}
                              onChange={(e) => handleUpdateItem(item.deliveryItemId, 'acceptedQty', e.target.value)}
                              className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
                              data-testid={`accepted-qty-input-${index}`}
                            />
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                              Yields: {(accepted * item.unitPriceSnapshot).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              ETB payable
                            </p>
                          </div>

                          {/* Rejected Quantity */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Rejected Quantity ({item.unit}) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={isReadOnly || inspectMutation.isPending}
                              value={item.rejectedQty}
                              onChange={(e) => handleUpdateItem(item.deliveryItemId, 'rejectedQty', e.target.value)}
                              className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60"
                              data-testid={`rejected-qty-input-${index}`}
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              Excluded from lot creation and payment
                            </p>
                          </div>
                        </div>

                        {/* Rejection Reason (Mandatory if rejectedQty > 0) */}
                        {rejected > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Rejection Justification Reason *
                            </label>
                            <div className="space-y-1.5">
                              <select
                                disabled={isReadOnly || inspectMutation.isPending}
                                value={item.rejectionReason}
                                onChange={(e) => handleUpdateItem(item.deliveryItemId, 'rejectionReason', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-60"
                                data-testid={`rejection-reason-select-${index}`}
                              >
                                <option value="">Select standard rejection reason...</option>
                                <option value="Moisture content exceeded acceptable limit (>20%)">
                                  Moisture content exceeded acceptable limit (&gt;20%)
                                </option>
                                <option value="Impurities and foreign particulates present">
                                  Impurities and foreign particulates present
                                </option>
                                <option value="Unripe or defective beans/grains detected">
                                  Unripe or defective beans/grains detected
                                </option>
                                <option value="Fermentation or mold odor present">
                                  Fermentation or mold odor present
                                </option>
                                <option value="Damaged during transport / container leakage">
                                  Damaged during transport / container leakage
                                </option>
                                <option value="Sub-standard grade sizing">
                                  Sub-standard grade sizing
                                </option>
                              </select>
                              <input
                                type="text"
                                placeholder="Or enter specific lab test or visual inspection reason..."
                                disabled={isReadOnly || inspectMutation.isPending}
                                value={item.rejectionReason}
                                onChange={(e) => handleUpdateItem(item.deliveryItemId, 'rejectionReason', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-60"
                                data-testid={`rejection-reason-input-${index}`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Live Sum Validation Status */}
                        <div className="pt-1 flex items-center justify-between text-xs">
                          {isMismatch ? (
                            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold" data-testid={`sum-mismatch-warning-${index}`}>
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>
                                Sum mismatch: {sum} {item.unit} entered. Must equal delivered {target} {item.unit}!
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                              <CheckCircle className="w-4 h-4 shrink-0" />
                              <span>Quantity balanced: {accepted} accepted + {rejected} rejected = {target} {item.unit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Projected Outcomes Box */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Projected Inspection Postings
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Total Approved Intake:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {validationSummary.totalAcceptedQty} KG
                      </strong>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Calculated Farmer Payable:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {(validationSummary.totalProjectedPayable || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ETB
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to="/dashboard/enterprise/supply"
                    className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={
                      activeDelivery.status === 'INSPECTED' ||
                      !validationSummary.isValid ||
                      inspectMutation.isPending
                    }
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    data-testid="submit-inspection-button"
                  >
                    {inspectMutation.isPending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Inspection...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Certify Quality & Post Payable</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-500">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No delivery selected</p>
              <p className="text-xs text-slate-400 mt-1">
                Choose a pending intake delivery from the queue to start quality inspection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
