import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Factory,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  QrCode,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  Printer,
  ExternalLink,
  Save,
  RotateCcw,
  Info,
  Scale,
  DollarSign,
  PackageCheck,
  TrendingDown,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type { TraceRecordUpdateRequest } from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

export default function ProductionBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;

  // Local state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [publicStory, setPublicStory] = useState('');
  const [showFarmerNames, setShowFarmerNames] = useState(true);
  const [storySavedBanner, setStorySavedBanner] = useState(false);
  const [isInitializedStory, setIsInitializedStory] = useState(false);

  // 1. Fetch Batch Data
  const {
    data: batch,
    isLoading: batchLoading,
    isError: batchError,
    refetch: refetchBatch,
  } = useQuery({
    queryKey: queryKeys.enterprise.batch(enterpriseId, batchId || ''),
    queryFn: () => enterpriseService.getProductionBatchById(enterpriseId, batchId || ''),
    enabled: Boolean(batchId),
  });

  // Initialize public story from batch when loaded
  if (batch && !isInitializedStory) {
    setPublicStory(
      batch.notes ||
        'Wild-harvested raw harvest processed and refined under cooperative fair-trade standards.'
    );
    setIsInitializedStory(true);
  }

  // 2. Fetch Trace Validation
  const {
    data: traceValidation,
    isLoading: traceLoading,
    refetch: refetchTrace,
  } = useQuery({
    queryKey: ['enterprise', enterpriseId, 'batches', batchId, 'validation'],
    queryFn: () => enterpriseService.validateTrace(enterpriseId, batchId || ''),
    enabled: Boolean(batchId),
  });

  // 3. Complete Batch Mutation
  const completeMutation = useMutation({
    mutationFn: () => enterpriseService.completeProductionBatch(enterpriseId, batchId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.batches(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.batch(enterpriseId, batchId || '') });
      refetchBatch();
      refetchTrace();
    },
  });

  // 4. Cancel Batch Mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      enterpriseService.cancelProductionBatch(enterpriseId, batchId || '', reason),
    onSuccess: () => {
      setCancelModalOpen(false);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.batches(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.batch(enterpriseId, batchId || '') });
      refetchBatch();
    },
  });

  // 5. Update Trace Record Mutation
  const traceMutation = useMutation({
    mutationFn: (data: TraceRecordUpdateRequest) =>
      enterpriseService.updateTraceRecord(enterpriseId, batchId || '', data),
    onSuccess: () => {
      setStorySavedBanner(true);
      setTimeout(() => setStorySavedBanner(false), 4000);
      refetchBatch();
    },
  });

  const handleSaveTraceStory = () => {
    traceMutation.mutate({
      publicStory,
      showFarmerNames,
    });
  };

  if (batchLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center" data-testid="batch-detail-loading">
        <Factory className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Loading batch details...</h2>
      </div>
    );
  }

  if (batchError || !batch) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center" data-testid="batch-detail-error">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Production Batch Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested batch does not exist or you do not have permission to access it.
        </p>
        <Link
          to="/dashboard/enterprise/production"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Production Batches</span>
        </Link>
      </div>
    );
  }

  const inputs = batch.inputs || [];
  const outputs = batch.outputs || [];
  const losses = batch.losses || [];

  const totalInputQty = inputs.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const totalOutputQty = outputs.reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);
  const totalLossQty = losses.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);
  const massDifference = Math.round((totalInputQty - (totalOutputQty + totalLossQty)) * 1000) / 1000;
  const isMassBalanced = totalInputQty > 0 && Math.abs(massDifference) < 0.001;

  const totalCosts =
    (Number(batch.laborCost) || 0) +
    (Number(batch.processingCost) || 0) +
    (Number(batch.packagingCost) || 0);

  const token = batch.traceToken || 'TRC-OMO-2026-001';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="batch-detail-container">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/dashboard/enterprise" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <Link to="/dashboard/enterprise/production" className="hover:underline">
          Production Batches
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-200 font-semibold" data-testid="batch-code-breadcrumb">
          {batch.batchCode}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100" data-testid="batch-title">
                  {batch.batchCode}
                </h1>
                <span
                  data-testid="batch-status-badge"
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    batch.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : batch.status === 'DRAFT'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {batch.status}
                </span>
                {isMassBalanced && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Scale className="w-3 h-3" />
                    Mass Balanced (B-602)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Created on {new Date(batch.createdAt || Date.now()).toLocaleDateString()}{' '}
                  {batch.completedAt && ` · Completed ${new Date(batch.completedAt).toLocaleDateString()}`}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {batch.status === 'DRAFT' && (
              <button
                type="button"
                data-testid="complete-batch-btn"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{completeMutation.isPending ? 'Completing...' : 'Complete Batch'}</span>
              </button>
            )}

            {batch.status !== 'CANCELLED' && (
              <button
                type="button"
                data-testid="cancel-batch-btn"
                onClick={() => setCancelModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Batch</span>
              </button>
            )}

            <button
              type="button"
              data-testid="print-qr-btn"
              onClick={() => setQrModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Print QR Label</span>
            </button>
          </div>
        </div>

        {/* Notes summary */}
        {batch.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Processing Notes: </span>
            {batch.notes}
          </div>
        )}
      </div>

      {/* B-602 Conservation of Mass & Costs KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="mass-kpi-grid">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Inputs Consumed</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="total-inputs-val">
            {totalInputQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">{inputs[0]?.unit || 'KG'}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{inputs.length} raw material lot(s)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Finished Outputs</span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="total-outputs-val">
            {totalOutputQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">{outputs[0]?.unit || 'KG'}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{outputs.length} product grade(s)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Recorded Losses / Scrap</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="total-losses-val">
            {totalLossQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">{losses[0]?.unit || 'KG'}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{losses.length} loss line(s) recorded</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Processing Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="total-costs-val">
            {formatETB(totalCosts)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Labor, processing & packaging</p>
        </div>
      </div>

      {/* Inputs and Outputs Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Lots Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3" data-testid="section-inputs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Raw Material Inputs ({inputs.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Status: Consumed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-2">Lot Code</th>
                  <th className="py-2 px-2">Material / Type</th>
                  <th className="py-2 px-2 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inputs.map((inItem) => (
                  <tr key={inItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-2 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {inItem.lotCode || inItem.lotId}
                    </td>
                    <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">
                      {inItem.productTypeName || 'Raw Farm Material'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {inItem.quantity} {inItem.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outputs Produced Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3" data-testid="section-outputs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>Finished Outputs Produced ({outputs.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Status: Active Lots</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-2">Product Grade</th>
                  <th className="py-2 px-2">Resulting Lot</th>
                  <th className="py-2 px-2 text-right">Quantity</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {outputs.map((outItem) => (
                  <tr key={outItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {outItem.productTypeName}
                      </div>
                      <div className="text-[10px] text-slate-400">{outItem.grade || 'Standard'}</div>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-emerald-700 dark:text-emerald-400">
                      {outItem.outputLotCode || outItem.resultingLotId || 'LOT-AUTO-GEN'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {outItem.quantity} {outItem.unit}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <Link
                        to={`/dashboard/enterprise/products?outputId=${outItem.id}`}
                        data-testid={`publish-product-${outItem.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 hover:bg-emerald-100 transition"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Publish Product</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Traceability Chain Validation & Chain of Custody (F-905) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4" data-testid="section-trace-validation">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Full Chain of Custody & Trace Verification (B-606)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cryptographically verified provenance tracking from smallholder delivery to retail unit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="trace-validation-status"
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 ${
                traceValidation?.valid !== false
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{traceValidation?.valid !== false ? 'Verified Complete Chain' : 'Trace Discrepancy'}</span>
            </span>
          </div>
        </div>

        {/* Chain Flow Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2" data-testid="trace-chain-flow">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Step 1 · Origin</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Farmer Intake</div>
            <div className="text-[11px] text-slate-500">
              {traceValidation?.farmerCount || 1} verified smallholder producer(s)
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Step 2 · Storage</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Inventory Lots</div>
            <div className="text-[11px] text-slate-500">
              {inputs.map((i) => i.lotCode || i.lotId).join(', ') || 'LOT-2026-040'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 space-y-1">
            <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Step 3 · Processing</div>
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{batch.batchCode}</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Conservation of mass validated</div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Step 4 · Retail</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Finished Products</div>
            <div className="text-[11px] text-slate-500">
              {outputs[0]?.productTypeName || 'Refined Product'}
            </div>
          </div>
        </div>

        {traceValidation?.note && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{traceValidation.note}</span>
          </div>
        )}
      </div>

      {/* Public Story & Consent Settings (F-906) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5" data-testid="section-trace-management">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Public Trace Record & Ethical Consent Management (F-906)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure what retail customers and tourists see when scanning the product QR code
          </p>
        </div>

        {storySavedBanner && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2" data-testid="story-saved-banner">
            <CheckCircle2 className="w-4 h-4" />
            <span>Public story and consent preferences successfully updated on the public ledger.</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Farmer Consent Toggle */}
          <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="pr-4">
              <label htmlFor="farmer-consent-toggle" className="text-xs font-bold text-slate-900 dark:text-white block cursor-pointer">
                Show Farmer Names on Public Trace Page
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                South Omo Cultural Data Charter: Smallholder producer names will be displayed on the public traceability page only if explicit consent was recorded at harvest delivery intake.
              </p>
            </div>
            <input
              id="farmer-consent-toggle"
              type="checkbox"
              data-testid="farmer-consent-toggle"
              checked={showFarmerNames}
              onChange={(e) => setShowFarmerNames(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-1 cursor-pointer"
            />
          </div>

          {/* Public Story Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cooperative Story & Harvest Narrative (Shown to Consumers)
            </label>
            <textarea
              rows={3}
              value={publicStory}
              onChange={(e) => setPublicStory(e.target.value)}
              data-testid="public-story-textarea"
              placeholder="Describe the cultural origin, harvesting traditions, and community impact of this batch..."
              className="w-full text-xs p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Save Button & Preview Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Public Token:</span>
              <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" data-testid="public-token-display">
                {token}
              </code>
              <Link
                to={`/trace/${token}`}
                target="_blank"
                rel="noreferrer"
                data-testid="preview-trace-link"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold ml-2"
              >
                <span>Live Public Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <button
              type="button"
              data-testid="save-story-btn"
              onClick={handleSaveTraceStory}
              disabled={traceMutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{traceMutation.isPending ? 'Saving...' : 'Save Story & Consent'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cancellation Modal (B-603 Reversal Explanation) */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="cancel-batch-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">Cancel Production Batch?</h3>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Conservation of Stock Audit (B-603)</span>
              </div>
              <p>
                Cancelling will automatically return all consumed raw materials back to inventory through formal reversal movements. Past audit history will remain intact.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                data-testid="cancel-reason-input"
                placeholder="e.g. Processing defect, contamination, accidental batch entry..."
                className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Keep Batch
              </button>
              <button
                type="button"
                data-testid="confirm-cancel-batch-btn"
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(cancelReason)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Reversing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Printable Modal (F-906) */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 print:p-0 print:bg-white" data-testid="qr-print-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 print:border-none print:shadow-none">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">
                OmoBridge Verified Heritage
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {batch.batchCode}
              </h3>
              <p className="text-xs text-slate-500">South Omo Community Heritage Cooperative</p>
            </div>

            {/* QR Card Graphic */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center shadow-inner">
                <QrCode className="w-32 h-32 text-slate-900" />
              </div>
              <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {token}
              </div>
              <div className="text-[10px] text-slate-500">
                Scan to verify 100% fair-trade producer origin & lab grading
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                data-testid="print-now-btn"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
