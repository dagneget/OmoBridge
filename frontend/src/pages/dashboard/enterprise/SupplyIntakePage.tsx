import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  Plus,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Building2,
  Search,
  CheckCircle,
  Clock,
  Printer,
  X,
  FileCheck,
  Scale,
  PlusCircle,
  ClipboardCheck,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import type {
  SupplyDeliveryResponse,
  SupplyDeliveryCreateRequest,
  SupplyDeliveryItemCreateRequest,
} from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

interface NewDeliveryItem {
  id: string;
  productTypeId: string;
  grade: string;
  deliveredQty: string;
}

function matchesDateRange(
  deliveredAtStr: string | undefined,
  dateRangeFilter: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
): boolean {
  if (dateRangeFilter === 'ALL' || !deliveredAtStr) return true;
  const delDate = new Date(deliveredAtStr);
  const now = new Date();
  const diffMs = now.getTime() - delDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (dateRangeFilter === 'TODAY') {
    return diffDays <= 1 && delDate.toDateString() === now.toDateString();
  }
  if (dateRangeFilter === 'WEEK') {
    return diffDays <= 7;
  }
  if (dateRangeFilter === 'MONTH') {
    return diffDays <= 30;
  }
  return true;
}

export default function SupplyIntakePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RECORDED' | 'INSPECTED' | 'CANCELLED'>('ALL');
  const [commodityFilter, setCommodityFilter] = useState<string>('ALL');
  const [farmerFilter, setFarmerFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<SupplyDeliveryResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state for Record Delivery
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [items, setItems] = useState<NewDeliveryItem[]>([
    { id: '1', productTypeId: '', grade: 'Grade A', deliveredQty: '' },
  ]);

  // 1. Fetch Deliveries for Enterprise
  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    isError: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: queryKeys.enterprise.deliveries(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseDeliveries(enterpriseId),
  });

  // 2. Fetch Affiliated Farmers for Selection
  const { data: farmers = [], isLoading: farmersLoading } = useQuery({
    queryKey: queryKeys.enterprise.farmers(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseFarmers(enterpriseId),
  });

  // 3. Fetch Product Types
  const { data: productTypes = [] } = useQuery({
    queryKey: queryKeys.enterprise.productTypes(),
    queryFn: () => enterpriseService.getProductTypes(),
  });

  // Record Delivery Mutation
  const recordMutation = useMutation({
    mutationFn: (data: SupplyDeliveryCreateRequest) => enterpriseService.recordDelivery(data),
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.deliveries(enterpriseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.metrics(enterpriseId) });
      setActiveReceipt(receipt);
      setIsRecordModalOpen(false);
      resetForm();
      setFormError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to record intake delivery.';
      setFormError(msg);
    },
  });

  const resetForm = () => {
    setSelectedFarmerId('');
    setDeliveryNotes('');
    setItems([{ id: '1', productTypeId: '', grade: 'Grade A', deliveredQty: '' }]);
    setFormError(null);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { id: String(Date.now()), productTypeId: productTypes[0]?.id || '', grade: 'Grade A', deliveredQty: '' },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItemRow = (index: number, field: keyof NewDeliveryItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedFarmerId) {
      setFormError('Please select a registered farmer.');
      return;
    }

    const validItems: SupplyDeliveryItemCreateRequest[] = [];
    for (const item of items) {
      if (!item.productTypeId) {
        setFormError('Please select a commodity type for all rows.');
        return;
      }
      const qty = parseFloat(item.deliveredQty);
      if (isNaN(qty) || qty <= 0) {
        setFormError('Delivered quantity must be greater than zero.');
        return;
      }
      validItems.push({
        productTypeId: item.productTypeId,
        grade: item.grade,
        deliveredQty: qty,
      });
    }

    const payload: SupplyDeliveryCreateRequest = {
      enterpriseId,
      farmerId: selectedFarmerId,
      deliveredAt: new Date().toISOString(),
      notes: deliveryNotes.trim() || undefined,
      items: validItems,
    };

    recordMutation.mutate(payload);
  };

  // Filtered Deliveries Log with Multi-facet search (F-809)
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

      // 2. Farmer Filter
      if (farmerFilter !== 'ALL' && d.farmerId !== farmerFilter) return false;

      // 3. Commodity Filter
      if (
        commodityFilter !== 'ALL' &&
        !d.items?.some((it) => it.productTypeId === commodityFilter)
      ) {
        return false;
      }

      // 4. Date Filter
      if (!matchesDateRange(d.deliveredAt, dateRangeFilter)) {
        return false;
      }

      // 5. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchNo = d.deliveryNo?.toLowerCase().includes(q);
      const matchFarmer = d.farmerName?.toLowerCase().includes(q);
      const matchCode = d.farmerCode?.toLowerCase().includes(q);
      const matchNotes = d.notes?.toLowerCase().includes(q);
      return matchNo || matchFarmer || matchCode || matchNotes;
    });
  }, [deliveries, statusFilter, farmerFilter, commodityFilter, dateRangeFilter, searchQuery]);

  const totalFilteredWeight = useMemo(() => {
    return filteredDeliveries.reduce((acc, d) => {
      const itemsSum = d.items?.reduce((s, it) => s + (it.deliveredQty || 0), 0) || 0;
      return acc + itemsSum;
    }, 0);
  }, [filteredDeliveries]);

  const awaitingInspectionCount = useMemo(() => {
    return filteredDeliveries.filter((d) => d.status === 'RECORDED').length;
  }, [filteredDeliveries]);

  const inspectedCount = useMemo(() => {
    return filteredDeliveries.filter((d) => d.status === 'INSPECTED').length;
  }, [filteredDeliveries]);

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    commodityFilter !== 'ALL' ||
    farmerFilter !== 'ALL' ||
    dateRangeFilter !== 'ALL' ||
    Boolean(searchQuery.trim());

  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setCommodityFilter('ALL');
    setFarmerFilter('ALL');
    setDateRangeFilter('ALL');
    setSearchQuery('');
  };

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  return (
    <div className="space-y-6" data-testid="supply-intake-page">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Community Hub</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Supply Intake</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Raw Harvest Intake Registry & History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Receiving facility: <strong className="text-slate-700 dark:text-slate-300">{enterpriseName}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchDeliveries()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh intake log"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsRecordModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
            data-testid="open-record-delivery-button"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record New Delivery</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS TILES (F-809) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print" data-testid="supply-stats-summary">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Deliveries</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono" data-testid="stats-total-deliveries">
            {filteredDeliveries.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Matched records</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Weight (KG)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono" data-testid="stats-total-weight">
            {totalFilteredWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Scale weight recorded</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Awaiting Inspection</div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono" data-testid="stats-awaiting-count">
            {awaitingInspectionCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Requires grading</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inspected & Graded</div>
          <div className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300 font-mono" data-testid="stats-inspected-count">
            {inspectedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Payables generated</div>
        </div>
      </div>

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3 no-print">
        {/* Row 1: Status tabs and search input */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              All Intake ({deliveries.length})
            </button>
            <button
              onClick={() => setStatusFilter('RECORDED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === 'RECORDED'
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Awaiting Inspection ({deliveries.filter((d) => d.status === 'RECORDED').length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('INSPECTED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === 'INSPECTED'
                  ? 'bg-emerald-700 text-white'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Inspected ({deliveries.filter((d) => d.status === 'INSPECTED').length})</span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search delivery #, farmer name, code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              data-testid="deliveries-search-input"
            />
          </div>
        </div>

        {/* Row 2: Secondary Facet Filters (Commodity, Farmer, Date Window) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Filters:</span>
          </div>

          {/* Commodity Dropdown */}
          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-600"
            data-testid="filter-commodity"
            aria-label="Filter by commodity"
          >
            <option value="ALL">All Commodities</option>
            {productTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>

          {/* Farmer Dropdown */}
          <select
            value={farmerFilter}
            onChange={(e) => setFarmerFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-600"
            data-testid="filter-farmer"
            aria-label="Filter by farmer"
          >
            <option value="ALL">All Farmers</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fullName} ({f.farmerCode})
              </option>
            ))}
          </select>

          {/* Date Window */}
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-600"
            data-testid="filter-date-range"
            aria-label="Filter by date range"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Delivered Today</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-auto"
              data-testid="reset-filters-btn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* DELIVERIES LOG TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {deliveriesLoading ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ) : deliveriesError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Unable to load supply deliveries.
            </p>
            <button
              onClick={() => refetchDeliveries()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white"
            >
              Retry
            </button>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Scale className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No crop intake deliveries recorded matching your filters.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsRecordModalOpen(true);
              }}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white"
            >
              Record First Farmer Delivery
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="deliveries-table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Delivery #</th>
                  <th className="py-3 px-3">Farmer Supplier</th>
                  <th className="py-3 px-3">Delivered Items</th>
                  <th className="py-3 px-3">Intake Timestamp</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeliveries.map((delivery) => {
                  const isRecorded = delivery.status === 'RECORDED';
                  const isInspected = delivery.status === 'INSPECTED';

                  return (
                    <tr
                      key={delivery.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`delivery-row-${delivery.id}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {delivery.deliveryNo || 'DEL-N/A'}
                        </div>
                        {delivery.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{delivery.notes}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {delivery.farmerName || 'Registered Smallholder'}
                        </div>
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-mono">
                          {delivery.farmerCode}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {delivery.items && delivery.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {delivery.items.map((item, idx) => (
                              <div key={item.id || idx} className="text-slate-700 dark:text-slate-300">
                                <strong>{item.deliveredQty} {item.unit || 'KG'}</strong>{' '}
                                <span className="text-slate-400">({item.productTypeName || 'Crop'} - {item.grade})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">No items</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleString() : 'Today'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isInspected
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isRecorded
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isInspected ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{delivery.status || 'RECORDED'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isRecorded && (
                            <Link
                              to={`/dashboard/enterprise/inspection?deliveryId=${delivery.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg font-medium text-xs border border-amber-200 dark:border-amber-800"
                              title="Inspect quality and grade"
                              data-testid={`inspect-delivery-${delivery.id}`}
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </Link>
                          )}
                          <button
                            onClick={() => setActiveReceipt(delivery)}
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-emerald-700 font-medium text-xs"
                            title="View receipt"
                            data-testid={`view-receipt-${delivery.id}`}
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                          <button
                            onClick={() => setActiveReceipt(delivery)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            title="Print intake receipt slip"
                            data-testid={`print-slip-btn-${delivery.id}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Slip</span>
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

      {/* RECORD DELIVERY MODAL (QUICK ENTRY WITH LARGE INPUTS) */}
      {isRecordModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          data-testid="record-delivery-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-700" />
                  <span>Record Incoming Harvest Delivery</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fast warehouse crop intake with official server receipt generation
                </p>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notification */}
            {formError && (
              <div
                className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-medium"
                data-testid="delivery-form-error"
              >
                {formError}
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Step 1: Pick Farmer with Large Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Select Registered Farmer Supplier *
                </label>
                {farmersLoading ? (
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <select
                    required
                    value={selectedFarmerId}
                    onChange={(e) => {
                      setSelectedFarmerId(e.target.value);
                      const f = farmers.find((farm) => farm.id === e.target.value);
                      if (f && f.verificationStatus === 'REJECTED') {
                        setFormError('Farmer account is not active. Please re-activate this supplier before recording intake.');
                      } else {
                        setFormError(null);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    data-testid="farmer-select"
                  >
                    <option value="">— Choose farmer by name or member code —</option>
                    {farmers.map((farmer) => (
                      <option key={farmer.id} value={farmer.id}>
                        {farmer.fullName} ({farmer.farmerCode || 'Pending Code'}) - {farmer.village || 'Keske'} [
                        {farmer.verificationStatus}]
                      </option>
                    ))}
                  </select>
                )}

                {selectedFarmer && (
                  <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedFarmer.fullName}
                      </span>{' '}
                      <span className="text-slate-400">({selectedFarmer.phoneNumber})</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedFarmer.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedFarmer.verificationStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: Add Intake Items with Large Quick-Entry Inputs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Commodity Items & Measured Weight *
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    data-testid="add-item-row-button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5"
                      data-testid={`item-row-${index}`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        {/* Commodity Type Select */}
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Commodity Type
                          </label>
                          <select
                            required
                            value={item.productTypeId}
                            onChange={(e) => updateItemRow(index, 'productTypeId', e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            data-testid={`item-type-select-${index}`}
                          >
                            <option value="">Select commodity...</option>
                            {productTypes.map((pt) => (
                              <option key={pt.id} value={pt.id}>
                                {pt.name} ({pt.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Grade Input */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Grade</label>
                          <input
                            type="text"
                            required
                            value={item.grade}
                            onChange={(e) => updateItemRow(index, 'grade', e.target.value)}
                            placeholder="Grade A"
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            data-testid={`item-grade-input-${index}`}
                          />
                        </div>

                        {/* Large Delivered Quantity Input */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Delivered Qty (KG) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={item.deliveredQty}
                            onChange={(e) => updateItemRow(index, 'deliveredQty', e.target.value)}
                            placeholder="50.0"
                            className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            data-testid={`item-qty-input-${index}`}
                          />
                        </div>

                        {/* Remove Row Button */}
                        <div className="sm:col-span-1 flex items-center justify-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intake Notes / Batch Reference (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Morning delivery via Keske collection center container #2"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  data-testid="delivery-notes-input"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordMutation.isPending || !selectedFarmerId}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
                  data-testid="submit-delivery-button"
                >
                  {recordMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recording Intake...</span>
                    </>
                  ) : (
                    <span>Generate Official Receipt</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL RECEIPT VIEW & PRINT MODAL (F-809) */}
      {activeReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto printable-slip-wrapper"
          role="dialog"
          aria-modal="true"
          data-testid="delivery-receipt-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 printable-slip">
            {/* Header with Print & Close (Hidden on print) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 no-print">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Official Harvest Intake Receipt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                  data-testid="print-receipt-button"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  aria-label="Close receipt modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Printable Slip Content */}
            <div className="p-6 sm:p-8 space-y-5 text-slate-900 bg-white">
              {/* Header Letterhead */}
              <div className="text-center pb-4 border-b-2 border-slate-900">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Building2 className="w-5 h-5 text-emerald-800" />
                  <h3 className="font-extrabold text-lg text-slate-900 uppercase tracking-wider">
                    {activeReceipt.enterpriseName || enterpriseName}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Agricultural Processing & Certified Community Aggregation Facility
                </p>
                <p className="text-[11px] text-slate-500">
                  South Omo Zone, SNNPR · Federal Democratic Republic of Ethiopia
                </p>

                {/* Official Receipt Barcode and Number */}
                <div className="mt-3 pt-3 border-t border-dashed border-slate-300 flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                    Official Intake Receipt Certificate
                  </span>
                  <div
                    className="inline-block px-4 py-1 mt-1 rounded bg-slate-100 text-base font-extrabold font-mono text-slate-900 tracking-wider"
                    data-testid="receipt-number"
                  >
                    {activeReceipt.deliveryNo || 'DEL-CONFIRMED'}
                  </div>
                  <div className="font-mono text-[9px] text-slate-400 tracking-[0.25em] mt-1 select-none">
                    ||| | |||| || | |||| ||| ||||| || | ||
                  </div>
                </div>
              </div>

              {/* Delivery Details & Farmer Supplier Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs py-1">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Supplier Smallholder
                  </span>
                  <p className="font-bold text-sm text-slate-900">
                    {activeReceipt.farmerName || 'Registered Smallholder'}
                  </p>
                  <p className="font-mono text-xs text-emerald-800 font-bold">
                    Farmer Code: {activeReceipt.farmerCode || 'FRM-N/A'}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Intake Record
                  </span>
                  <p className="font-semibold text-slate-800">
                    {activeReceipt.deliveredAt
                      ? new Date(activeReceipt.deliveredAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Today'}
                  </p>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        activeReceipt.status === 'INSPECTED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : activeReceipt.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      Status: {activeReceipt.status || 'RECORDED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Commodity & Grade</th>
                      <th className="py-2 px-3 text-right">Delivered Qty</th>
                      {activeReceipt.status === 'INSPECTED' && (
                        <>
                          <th className="py-2 px-3 text-right">Accepted Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Payable (ETB)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeReceipt.items?.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {item.productTypeName || 'Raw Material'}
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200">
                            {item.grade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {item.deliveredQty} {item.unit || 'KG'}
                        </td>
                        {activeReceipt.status === 'INSPECTED' && (
                          <>
                            <td className="py-2 px-3 text-right font-bold text-emerald-800">
                              {item.acceptedQty} {item.unit || 'KG'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {item.unitPriceSnapshot?.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold font-mono">
                              {(item.lineTotal || (item.acceptedQty || 0) * (item.unitPriceSnapshot || 0)).toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-slate-700 uppercase tracking-wider text-[11px]">
                        Total Delivered Weight
                      </td>
                      <td className="py-2 px-3 text-right text-sm font-extrabold text-slate-900">
                        {activeReceipt.items?.reduce((s, it) => s + (it.deliveredQty || 0), 0) || 0} KG
                      </td>
                      {activeReceipt.status === 'INSPECTED' && (
                        <>
                          <td className="py-2 px-3 text-right text-sm font-extrabold text-emerald-800">
                            {activeReceipt.items?.reduce((s, it) => s + (it.acceptedQty || 0), 0) || 0} KG
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500 text-[11px]">Grand Total</td>
                          <td className="py-2 px-3 text-right text-sm font-extrabold text-emerald-900 font-mono">
                            {(
                              activeReceipt.totalDeliveredValue ||
                              activeReceipt.items?.reduce(
                                (s, it) => s + (it.lineTotal || (it.acceptedQty || 0) * (it.unitPriceSnapshot || 0)),
                                0
                              ) ||
                              0
                            ).toFixed(2)}{' '}
                            ETB
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {activeReceipt.notes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-600">Intake / Lot Notes: </span>
                  <span className="text-slate-800">{activeReceipt.notes}</span>
                </div>
              )}

              {/* Official Signatures Section for Physical Verification */}
              <div className="pt-4 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-6">
                  <div className="border-b border-slate-400 pb-1 h-8" />
                  <div className="text-center">
                    <p className="font-bold text-slate-900">Intake Officer / Scale Clerk</p>
                    <p className="text-[10px] text-slate-500">Authorized Signature & Official Stamp</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-slate-400 pb-1 h-8" />
                  <div className="text-center">
                    <p className="font-bold text-slate-900">Farmer Supplier / Deliverer</p>
                    <p className="text-[10px] text-slate-500">Signature / Right Thumbprint</p>
                  </div>
                </div>
              </div>

              {/* Traceability and Audit Footer */}
              <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
                <p>
                  Certified via Kinka Fair Trade & Traceability Platform · Preserves origin integrity for South Omo farmers.
                </p>
                <p className="mt-0.5 font-mono">
                  Receipt Token: {activeReceipt.id} · Verification: ACTIVE
                </p>
              </div>

              {/* Done/Close Button (Hidden on print) */}
              <div className="pt-2 no-print">
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
