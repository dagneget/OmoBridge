import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Factory,
  Boxes,
  Layers,
  Trash2,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Info,
  Scale,
  ShieldCheck,
  FileText,
  Search,
  History,
  QrCode,
  Tag,
  Building2,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type {
  ProductionBatchCreateRequest,
  ProductionInputRequest,
  ProductionOutputRequest,
  ProductionLossRequest,
  BatchStatus,
} from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

interface InputLotItem {
  lotId: string;
  lotCode: string;
  productTypeName: string;
  grade: string;
  balanceQty: number;
  unit: string;
  quantity: string;
}

interface OutputProductItem {
  productTypeId: string;
  productTypeName: string;
  quantity: string;
  unit: string;
  grade: string;
  createInventoryLot: boolean;
  targetLocationId?: string;
}

interface LossItem {
  quantity: string;
  unit: string;
  reason: string;
}

export default function ProductionBatchWizardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [activeTab, setActiveTab] = useState<'wizard' | 'batches'>('wizard');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Active Lots for Inputs
  const {
    data: availableLots = [],
    isLoading: lotsLoading,
    isError: lotsError,
    refetch: refetchLots,
  } = useQuery({
    queryKey: queryKeys.enterprise.lots(enterpriseId, 'ACTIVE'),
    queryFn: () => enterpriseService.getEnterpriseLots(enterpriseId, 'ACTIVE'),
  });

  // 2. Fetch Product Types for Outputs
  const {
    data: productTypes = [],
    isLoading: productTypesLoading,
  } = useQuery({
    queryKey: queryKeys.enterprise.productTypes(),
    queryFn: () => enterpriseService.getProductTypes(),
  });

  // 3. Fetch Storage Locations for Storing Outputs
  const {
    data: locations = [],
    isLoading: locationsLoading,
  } = useQuery({
    queryKey: queryKeys.enterprise.locations(enterpriseId),
    queryFn: () => enterpriseService.getLocations(enterpriseId),
  });

  // 4. Fetch Existing Production Batches
  const {
    data: batches = [],
    isLoading: batchesLoading,
    isError: batchesError,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: queryKeys.enterprise.batches(enterpriseId),
    queryFn: () => enterpriseService.getProductionBatches(enterpriseId),
  });

  // Form State
  const [inputLots, setInputLots] = useState<InputLotItem[]>([]);
  const [selectedLotToAdd, setSelectedLotToAdd] = useState<string>('');
  const [outputs, setOutputs] = useState<OutputProductItem[]>([]);
  const [losses, setLosses] = useState<LossItem[]>([]);

  // Costs State
  const [laborCost, setLaborCost] = useState<string>('0');
  const [processingCost, setProcessingCost] = useState<string>('0');
  const [packagingCost, setPackagingCost] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  // Trace & Origin State
  const [originVillage, setOriginVillage] = useState<string>('Keske & Dimeka Villages, South Omo');
  const [originLabel, setOriginLabel] = useState<string>(enterpriseName);
  const [publicStory, setPublicStory] = useState<string>(
    'Wild-harvested raw harvest processed and refined under cooperative fair-trade standards.'
  );
  const [showFarmerNames, setShowFarmerNames] = useState<boolean>(true);
  const [completeImmediately, setCompleteImmediately] = useState<boolean>(true);

  // Status & Notification Feedback
  const [serverError, setServerError] = useState<string | null>(null);
  const [successBatch, setSuccessBatch] = useState<{ batchCode: string; traceToken?: string } | null>(null);

  // Calculations
  const baseUnit = inputLots.length > 0 ? inputLots[0].unit : 'KG';

  const totalInputs = useMemo(() => {
    return inputLots.reduce((acc, item) => {
      const q = parseFloat(item.quantity);
      return acc + (isNaN(q) ? 0 : q);
    }, 0);
  }, [inputLots]);

  const totalOutputs = useMemo(() => {
    return outputs.reduce((acc, item) => {
      const q = parseFloat(item.quantity);
      return acc + (isNaN(q) ? 0 : q);
    }, 0);
  }, [outputs]);

  const totalLosses = useMemo(() => {
    return losses.reduce((acc, item) => {
      const q = parseFloat(item.quantity);
      return acc + (isNaN(q) ? 0 : q);
    }, 0);
  }, [losses]);

  // Conservation of mass net discrepancy: Inputs - (Outputs + Losses)
  const massDiscrepancy = useMemo(() => {
    const raw = totalInputs - (totalOutputs + totalLosses);
    return Math.round(raw * 1000) / 1000;
  }, [totalInputs, totalOutputs, totalLosses]);

  const isMassBalanced = useMemo(() => {
    return totalInputs > 0 && Math.abs(massDiscrepancy) < 0.0001;
  }, [totalInputs, massDiscrepancy]);

  const totalCosts = useMemo(() => {
    const l = parseFloat(laborCost) || 0;
    const p = parseFloat(processingCost) || 0;
    const pkg = parseFloat(packagingCost) || 0;
    return l + p + pkg;
  }, [laborCost, processingCost, packagingCost]);

  // Validation: Check if any lot exceeds balance
  const hasOverdrawnInput = useMemo(() => {
    return inputLots.some((item) => {
      const q = parseFloat(item.quantity);
      return !isNaN(q) && (q <= 0 || q > item.balanceQty);
    });
  }, [inputLots]);

  const isFormValid = useMemo(() => {
    if (inputLots.length === 0 || outputs.length === 0) return false;
    if (hasOverdrawnInput) return false;
    if (!isMassBalanced) return false;
    // Check output quantities
    const invalidOutputs = outputs.some((o) => {
      const q = parseFloat(o.quantity);
      return isNaN(q) || q <= 0 || !o.productTypeId;
    });
    if (invalidOutputs) return false;
    // Check loss quantities
    const invalidLosses = losses.some((l) => {
      const q = parseFloat(l.quantity);
      return isNaN(q) || q < 0;
    });
    if (invalidLosses) return false;

    return true;
  }, [inputLots, outputs, losses, hasOverdrawnInput, isMassBalanced]);

  // Handlers for Input Lots
  const handleAddInputLot = () => {
    if (!selectedLotToAdd) return;
    const lot = availableLots.find((l) => l.id === selectedLotToAdd);
    if (!lot) return;

    if (inputLots.some((i) => i.lotId === lot.id)) {
      return; // Already added
    }

    setInputLots((prev) => [
      ...prev,
      {
        lotId: lot.id,
        lotCode: lot.lotCode,
        productTypeName: lot.productTypeName,
        grade: lot.grade,
        balanceQty: lot.balanceQty,
        unit: lot.unit,
        quantity: String(lot.balanceQty), // Default to full remaining balance
      },
    ]);
    setSelectedLotToAdd('');
  };

  const handleUpdateInputQty = (lotId: string, qty: string) => {
    setInputLots((prev) =>
      prev.map((item) => (item.lotId === lotId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveInputLot = (lotId: string) => {
    setInputLots((prev) => prev.filter((item) => item.lotId !== lotId));
  };

  // Handlers for Outputs
  const handleAddOutput = () => {
    const defaultProductType = productTypes[0];
    const defaultLocation = locations[0];
    setOutputs((prev) => [
      ...prev,
      {
        productTypeId: defaultProductType?.id || '',
        productTypeName: defaultProductType?.name || '',
        quantity: '',
        unit: baseUnit,
        grade: 'Grade A',
        createInventoryLot: true,
        targetLocationId: defaultLocation?.id || '',
      },
    ]);
  };

  const handleUpdateOutput = (index: number, updates: Partial<OutputProductItem>) => {
    setOutputs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveOutput = (index: number) => {
    setOutputs((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers for Losses
  const handleAddLoss = () => {
    setLosses((prev) => [
      ...prev,
      {
        quantity: '',
        unit: baseUnit,
        reason: 'Moisture evaporation & drying loss',
      },
    ]);
  };

  const handleUpdateLoss = (index: number, updates: Partial<LossItem>) => {
    setLosses((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveLoss = (index: number) => {
    setLosses((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-allocate mass discrepancy to loss entry
  const handleAutoAllocateLoss = () => {
    if (massDiscrepancy <= 0) return;
    const diffStr = massDiscrepancy.toFixed(2);
    setLosses((prev) => [
      ...prev,
      {
        quantity: diffStr,
        unit: baseUnit,
        reason: 'Milling residue, husking & sorting scrap',
      },
    ]);
  };

  // Mutation: Create Production Batch
  const createBatchMutation = useMutation({
    mutationFn: (req: ProductionBatchCreateRequest) =>
      enterpriseService.createProductionBatch(enterpriseId, req),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.batches(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.lots(enterpriseId) });
      setSuccessBatch({
        batchCode: data.batchCode,
        traceToken: data.traceToken,
      });
      setServerError(null);
      // Reset form
      setInputLots([]);
      setOutputs([]);
      setLosses([]);
      setLaborCost('0');
      setProcessingCost('0');
      setPackagingCost('0');
      setNotes('');
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to record production batch. Please check inputs and try again.';
      setServerError(msg);
    },
  });

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Front guard: Check conservation of mass
    if (!isMassBalanced) {
      setServerError(
        `Mass balance violation: Total inputs (${totalInputs} ${baseUnit}) do not equal outputs (${totalOutputs} ${baseUnit}) + losses (${totalLosses} ${baseUnit}). Discrepancy is ${massDiscrepancy} ${baseUnit}.`
      );
      return;
    }

    if (inputLots.length === 0) {
      setServerError('Please select at least one active raw material lot to consume.');
      return;
    }

    if (outputs.length === 0) {
      setServerError('Please specify at least one target output product.');
      return;
    }

    const payload: ProductionBatchCreateRequest = {
      enterpriseId,
      laborCost: parseFloat(laborCost) || 0,
      processingCost: parseFloat(processingCost) || 0,
      packagingCost: parseFloat(packagingCost) || 0,
      notes: notes.trim() || undefined,
      inputs: inputLots.map(
        (i): ProductionInputRequest => ({
          lotId: i.lotId,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit,
        })
      ),
      outputs: outputs.map(
        (o): ProductionOutputRequest => ({
          productTypeId: o.productTypeId,
          quantity: parseFloat(o.quantity) || 0,
          unit: o.unit,
          grade: o.grade,
          createInventoryLot: o.createInventoryLot,
          targetLocationId: o.createInventoryLot ? o.targetLocationId : undefined,
        })
      ),
      losses:
        losses.length > 0
          ? losses.map(
              (l): ProductionLossRequest => ({
                quantity: parseFloat(l.quantity) || 0,
                unit: l.unit,
                reason: l.reason,
              })
            )
          : undefined,
      completeImmediately,
      originVillage: originVillage.trim() || undefined,
      originLabel: originLabel.trim() || undefined,
      publicStory: publicStory.trim() || undefined,
      showFarmerNames,
    };

    createBatchMutation.mutate(payload);
  };

  // Filtered Batches for Table
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        b.batchCode.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q)) ||
        (b.traceToken && b.traceToken.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [batches, statusFilter, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
            <Factory className="w-4 h-4" />
            <span>Processing & Traceability Subsystem</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Production Batch Wizard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Convert inspected inventory lots into finished retail commodities with automated
            conservation-of-mass validation, loss tracking, and end-to-end QR trace verification.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'wizard'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            data-testid="tab-wizard"
          >
            <Factory className="w-4 h-4" />
            <span>New Batch Wizard</span>
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'batches'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            data-testid="tab-batches-history"
          >
            <History className="w-4 h-4" />
            <span>Batches History ({batches.length})</span>
          </button>
        </div>
      </div>

      {/* Navigation Breadcrumbs & Shortcuts */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/dashboard/enterprise" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <Link to="/dashboard/enterprise/inventory" className="hover:underline">
          Inventory Storage
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-200 font-semibold">Production Batches</span>
      </div>

      {/* SUCCESS CONFIRMATION MODAL / BANNER */}
      {successBatch && (
        <div
          className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          data-testid="success-batch-banner"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                Production Batch Successfully Created!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                Batch Code:{' '}
                <span className="font-mono font-bold">{successBatch.batchCode}</span>
                {successBatch.traceToken && (
                  <span className="ml-3">
                    Public Trace Token:{' '}
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      {successBatch.traceToken}
                    </span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {successBatch.traceToken && (
              <Link
                to={`/trace/${successBatch.traceToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Verify Public Trace</span>
              </Link>
            )}
            <button
              onClick={() => {
                setSuccessBatch(null);
                setActiveTab('batches');
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-900 hover:bg-emerald-200 transition"
            >
              View in Batches List
            </button>
            <button
              onClick={() => setSuccessBatch(null)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SERVER ERROR ALERT BANNER */}
      {serverError && (
        <div
          className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start gap-3"
          data-testid="server-error-banner"
        >
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Processing Batch Error
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 whitespace-pre-wrap">
              {serverError}
            </p>
          </div>
          <button
            onClick={() => setServerError(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-950 dark:hover:text-rose-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===================== WIZARD MODE ===================== */}
      {activeTab === 'wizard' && (
        <form onSubmit={handleSubmitBatch} className="space-y-8">
          {/* STEP 1: INPUT LOTS SELECTION */}
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
            data-testid="section-input-lots"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Step 1 of 5
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-600" />
                  <span>Select Raw Input Lots from Inventory</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose inspected storage lots to consume. Consumed quantities will be deducted from
                  inventory records.
                </p>
              </div>

              {/* Total Inputs Metric */}
              <div
                className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-right"
                data-testid="total-inputs-metric"
              >
                <div className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">
                  Total Input Volume
                </div>
                <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                  {totalInputs.toFixed(2)} <span className="text-xs font-normal">{baseUnit}</span>
                </div>
              </div>
            </div>

            {/* Input Lot Picker Bar */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <select
                value={selectedLotToAdd}
                onChange={(e) => setSelectedLotToAdd(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                data-testid="select-input-lot-dropdown"
              >
                <option value="">-- Choose active inventory lot to consume --</option>
                {availableLots
                  .filter((l) => !inputLots.some((i) => i.lotId === l.id))
                  .map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lotCode} · {lot.productTypeName} ({lot.grade}) · Avail: {lot.balanceQty}{' '}
                      {lot.unit} · {lot.locationName || 'Warehouse'}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddInputLot}
                disabled={!selectedLotToAdd}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                data-testid="add-input-lot-btn"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Lot</span>
              </button>
            </div>

            {/* Chosen Input Lots Table */}
            {inputLots.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                No input lots selected yet. Select a lot above to start building the batch.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Lot Code</th>
                      <th className="py-2.5 px-3">Commodity & Grade</th>
                      <th className="py-2.5 px-3">Available Balance</th>
                      <th className="py-2.5 px-3">Consumed Quantity</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inputLots.map((item) => {
                      const qtyNum = parseFloat(item.quantity) || 0;
                      const isOverdrawn = qtyNum > item.balanceQty;
                      return (
                        <tr key={item.lotId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {item.lotCode}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.productTypeName}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                            {item.balanceQty} {item.unit}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 max-w-[180px]">
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                max={item.balanceQty}
                                value={item.quantity}
                                onChange={(e) => handleUpdateInputQty(item.lotId, e.target.value)}
                                className={`w-full px-2.5 py-1 text-xs border rounded-lg bg-white dark:bg-slate-800 font-mono ${
                                  isOverdrawn
                                    ? 'border-rose-500 text-rose-600 focus:ring-rose-500'
                                    : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
                                }`}
                                data-testid={`input-lot-quantity-${item.lotId}`}
                              />
                              <span className="text-[11px] text-slate-500 font-semibold uppercase">
                                {item.unit}
                              </span>
                            </div>
                            {isOverdrawn && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                                Exceeds balance of {item.balanceQty} {item.unit}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveInputLot(item.lotId)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              data-testid={`remove-input-lot-${item.lotId}`}
                              title="Remove lot from inputs"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* STEP 2: OUTPUT PRODUCTS */}
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
            data-testid="section-outputs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Step 2 of 5
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <span>Specify Output Products</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target items produced by this batch. New inventory lots will be created for stored items.
                </p>
              </div>

              {/* Total Outputs Metric */}
              <div
                className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl text-right"
                data-testid="total-outputs-metric"
              >
                <div className="text-[10px] uppercase font-semibold text-blue-800 dark:text-blue-300">
                  Total Output Volume
                </div>
                <div className="text-lg font-extrabold text-blue-700 dark:text-blue-300">
                  {totalOutputs.toFixed(2)} <span className="text-xs font-normal">{baseUnit}</span>
                </div>
              </div>
            </div>

            {outputs.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
                No outputs added. Click below to add an output product.
              </div>
            ) : (
              <div className="space-y-3">
                {outputs.map((out, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    data-testid={`output-row-${idx}`}
                  >
                    {/* Product Type */}
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Product Type
                      </label>
                      <select
                        value={out.productTypeId}
                        onChange={(e) => {
                          const pt = productTypes.find((p) => p.id === e.target.value);
                          handleUpdateOutput(idx, {
                            productTypeId: e.target.value,
                            productTypeName: pt?.name || '',
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        data-testid={`output-product-type-${idx}`}
                      >
                        <option value="">-- Select Product --</option>
                        {productTypes.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.name} ({pt.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Quantity ({out.unit})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="0.00"
                        value={out.quantity}
                        onChange={(e) => handleUpdateOutput(idx, { quantity: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                        data-testid={`output-quantity-${idx}`}
                      />
                    </div>

                    {/* Grade */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Output Grade
                      </label>
                      <select
                        value={out.grade}
                        onChange={(e) => handleUpdateOutput(idx, { grade: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        data-testid={`output-grade-${idx}`}
                      >
                        <option value="Grade A">Grade A</option>
                        <option value="Grade B">Grade B</option>
                        <option value="Grade 1">Grade 1</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Export Grade">Export Grade</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </div>

                    {/* Create Lot & Storage Location */}
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Destination Location
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={out.targetLocationId}
                          onChange={(e) =>
                            handleUpdateOutput(idx, { targetLocationId: e.target.value })
                          }
                          disabled={!out.createInventoryLot}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 disabled:opacity-50"
                          data-testid={`output-location-${idx}`}
                        >
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Remove Action */}
                    <div className="md:col-span-1 text-right pt-4 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveOutput(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        data-testid={`remove-output-${idx}`}
                        title="Remove output"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddOutput}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              data-testid="add-output-btn"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add Output Product</span>
            </button>
          </div>

          {/* STEP 3: PRODUCTION LOSSES & SCRAP */}
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
            data-testid="section-losses"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Step 3 of 5
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-600" />
                  <span>Production Losses, Residue & Shrinkage</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Account for moisture loss, husking waste, sorting rejects, or processing scrap.
                </p>
              </div>

              {/* Total Losses Metric */}
              <div
                className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl text-right"
                data-testid="total-losses-metric"
              >
                <div className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300">
                  Total Losses Volume
                </div>
                <div className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
                  {totalLosses.toFixed(2)} <span className="text-xs font-normal">{baseUnit}</span>
                </div>
              </div>
            </div>

            {losses.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
                No processing losses recorded. If processing produces scrap or shrinkage, click below.
              </div>
            ) : (
              <div className="space-y-3">
                {losses.map((loss, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    data-testid={`loss-row-${idx}`}
                  >
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Loss Quantity ({loss.unit})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={loss.quantity}
                        onChange={(e) => handleUpdateLoss(idx, { quantity: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                        data-testid={`loss-quantity-${idx}`}
                      />
                    </div>

                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Reason & Scrap Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Moisture evaporation, defect sorting, wax capping residue..."
                        value={loss.reason}
                        onChange={(e) => handleUpdateLoss(idx, { reason: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                        data-testid={`loss-reason-${idx}`}
                      />
                    </div>

                    <div className="md:col-span-1 text-right pt-4 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveLoss(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        data-testid={`remove-loss-${idx}`}
                        title="Remove loss entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddLoss}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                data-testid="add-loss-btn"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Add Loss / Residue Entry</span>
              </button>

              {massDiscrepancy > 0 && (
                <button
                  type="button"
                  onClick={handleAutoAllocateLoss}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 transition"
                  data-testid="auto-allocate-loss-btn"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-allocate discrepancy ({massDiscrepancy} {baseUnit}) as loss</span>
                </button>
              )}
            </div>
          </div>

          {/* STEP 4: CONSERVATION OF MASS AUDIT CARD (MANDATORY REQUIREMENT) */}
          <div
            className={`border-2 rounded-2xl p-5 transition-all ${
              isMassBalanced
                ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-700'
                : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700'
            }`}
            data-testid="mass-balance-container"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Scale
                    className={`w-5 h-5 ${
                      isMassBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Conservation of Mass Audit
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Backend rule B-602 strictly requires total input materials to equal total output products
                  plus recorded processing losses.
                </p>
              </div>

              {/* Mass Balance Equation Tiles */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Input</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {totalInputs.toFixed(2)} {baseUnit}
                  </div>
                </div>

                <span className="text-slate-400 font-bold">=</span>

                <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Outputs</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    {totalOutputs.toFixed(2)} {baseUnit}
                  </div>
                </div>

                <span className="text-slate-400 font-bold">+</span>

                <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Losses</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">
                    {totalLosses.toFixed(2)} {baseUnit}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              {isMassBalanced ? (
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold" data-testid="mass-balance-balanced">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Mass conservation balanced: {totalInputs.toFixed(2)} {baseUnit} in = {(totalOutputs + totalLosses).toFixed(2)} {baseUnit} accounted for.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold" data-testid="mass-balance-imbalance">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Mass balance discrepancy: Inputs ({totalInputs.toFixed(2)} {baseUnit}) ≠ Outputs + Losses (
                    {(totalOutputs + totalLosses).toFixed(2)} {baseUnit}). Variance:{' '}
                    <span className="underline font-bold">
                      {massDiscrepancy > 0 ? `+${massDiscrepancy}` : massDiscrepancy} {baseUnit}
                    </span>
                    .
                  </span>
                </div>
              )}

              <span className="text-[11px] text-slate-500">
                Tolerance: ±0.001 {baseUnit}
              </span>
            </div>
          </div>

          {/* STEP 5: COSTS & CONVERSION NOTES */}
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
            data-testid="section-costs-notes"
          >
            <div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Step 4 of 5
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Processing Costs & Conversion Notes</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record processing and packaging overhead to calculate accurate unit production costs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Labor Cost (ETB)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">ETB</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full pl-12 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono"
                    data-testid="input-labor-cost"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Machinery & Processing Cost (ETB)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">ETB</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={processingCost}
                    onChange={(e) => setProcessingCost(e.target.value)}
                    className="w-full pl-12 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono"
                    data-testid="input-processing-cost"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Packaging Cost (ETB)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">ETB</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(e.target.value)}
                    className="w-full pl-12 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono"
                    data-testid="input-packaging-cost"
                  />
                </div>
              </div>
            </div>

            {/* Total Cost Display */}
            <div
              className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-xs"
              data-testid="total-cost-card"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Total Operational Processing Cost:
              </span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                {formatETB(totalCosts)}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Conversion & Milling Notes
              </label>
              <textarea
                rows={2}
                placeholder="Describe milling equipment used, batch ambient humidity, operator notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                data-testid="input-notes"
              />
            </div>
          </div>

          {/* STEP 6: ORIGIN & TRACEABILITY SETTINGS */}
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
            data-testid="section-trace-settings"
          >
            <div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Step 5 of 5
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>Public Traceability & Farmer Consent Settings</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These details will be rendered on the consumer QR traceability page at{' '}
                <span className="font-mono text-emerald-600">/trace/[token]</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Origin Village / Kebeles
                </label>
                <input
                  type="text"
                  value={originVillage}
                  onChange={(e) => setOriginVillage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  data-testid="input-origin-village"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Cooperative Brand Label
                </label>
                <input
                  type="text"
                  value={originLabel}
                  onChange={(e) => setOriginLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  data-testid="input-origin-label"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Public Story & Cooperative Mission
              </label>
              <textarea
                rows={2}
                value={publicStory}
                onChange={(e) => setPublicStory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                data-testid="input-public-story"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFarmerNames}
                  onChange={(e) => setShowFarmerNames(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                  data-testid="toggle-show-farmers"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Show consenting smallholder farmer names on the public QR page
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completeImmediately}
                  onChange={(e) => setCompleteImmediately(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                  data-testid="toggle-complete-immediately"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Complete batch immediately (locks inputs & activates output lots)
                </span>
              </label>
            </div>
          </div>

          {/* SUBMISSION BAR */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {!isMassBalanced && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Submission is blocked: conservation of mass has a {massDiscrepancy} {baseUnit} variance.
                </span>
              )}
              {hasOverdrawnInput && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Submission is blocked: consumed quantity exceeds available lot balance.
                </span>
              )}
              {isFormValid && (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Ready to record batch. All inputs, outputs, and mass conservation rules validated.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setInputLots([]);
                  setOutputs([]);
                  setLosses([]);
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                Reset Wizard
              </button>

              <button
                type="submit"
                disabled={!isFormValid || createBatchMutation.isPending}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                data-testid="submit-batch-btn"
              >
                {createBatchMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Factory className="w-4 h-4" />
                    <span>Create Production Batch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ===================== BATCHES HISTORY MODE ===================== */}
      {activeTab === 'batches' && (
        <div className="space-y-4" data-testid="section-batches-history">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {(['ALL', 'COMPLETED', 'DRAFT', 'CANCELLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  data-testid={`filter-status-${st}`}
                >
                  {st === 'ALL' ? 'All Batches' : st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search batch code, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  data-testid="search-batches-input"
                />
              </div>

              <button
                onClick={() => refetchBatches()}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Refresh batches"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Batches Table */}
          {batchesLoading ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading production batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div
              className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500"
              data-testid="batches-empty-state"
            >
              No production batches found matching the selected criteria.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse" data-testid="batches-table">
                  <thead>
                    <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Batch Code</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Inputs Consumed</th>
                      <th className="py-3 px-4">Outputs Produced</th>
                      <th className="py-3 px-4">Recorded Losses</th>
                      <th className="py-3 px-4">Processing Cost</th>
                      <th className="py-3 px-4">Trace Token</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBatches.map((batch) => {
                      const totalBatchCost =
                        (batch.laborCost || 0) +
                        (batch.processingCost || 0) +
                        (batch.packagingCost || 0);
                      return (
                        <tr
                          key={batch.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                          data-testid={`batch-row-${batch.id}`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            <Link
                              to={`/dashboard/enterprise/production/${batch.id}`}
                              className="text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                              data-testid={`batch-link-${batch.id}`}
                            >
                              <span>{batch.batchCode}</span>
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                batch.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : batch.status === 'DRAFT'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                              data-testid={`batch-status-${batch.id}`}
                            >
                              {batch.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {batch.inputs.map((inItem) => (
                              <div key={inItem.id} className="text-[11px]">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {inItem.quantity} {inItem.unit}
                                </span>{' '}
                                <span className="text-slate-400 font-mono text-[10px]">
                                  ({inItem.lotCode})
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className="py-3.5 px-4">
                            {batch.outputs.map((outItem) => (
                              <div key={outItem.id} className="text-[11px]">
                                <span className="font-semibold text-blue-700 dark:text-blue-300">
                                  {outItem.quantity} {outItem.unit}
                                </span>{' '}
                                <span className="text-slate-600 dark:text-slate-400">
                                  {outItem.productTypeName}
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className="py-3.5 px-4">
                            {batch.losses.length > 0 ? (
                              batch.losses.map((lossItem) => (
                                <div key={lossItem.id} className="text-[11px] text-amber-700 dark:text-amber-300">
                                  {lossItem.quantity} {lossItem.unit}
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatETB(totalBatchCost)}
                          </td>
                          <td className="py-3.5 px-4">
                            {batch.traceToken ? (
                              <Link
                                to={`/trace/${batch.traceToken}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-emerald-600 hover:underline"
                                title="Open public QR trace view"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>{batch.traceToken.substring(0, 10)}...</span>
                              </Link>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
