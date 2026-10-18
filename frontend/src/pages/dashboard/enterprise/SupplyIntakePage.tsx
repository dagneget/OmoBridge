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

export default function SupplyIntakePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RECORDED' | 'INSPECTED' | 'CANCELLED'>('ALL');
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

  // Filtered Deliveries Log
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchNo = d.deliveryNo?.toLowerCase().includes(q);
      const matchFarmer = d.farmerName?.toLowerCase().includes(q);
      const matchCode = d.farmerCode?.toLowerCase().includes(q);
      return matchNo || matchFarmer || matchCode;
    });
  }, [deliveries, statusFilter, searchQuery]);

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  return (
    <div className="space-y-6" data-testid="supply-intake-page">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Enterprise Hub</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Supply Intake</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Raw Harvest Intake Registry</span>
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

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
                          <button
                            onClick={() => setActiveReceipt(delivery)}
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-emerald-700 font-medium text-xs"
                            title="View receipt"
                            data-testid={`view-receipt-${delivery.id}`}
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Receipt</span>
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

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
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

      {/* OFFICIAL RECEIPT VIEW MODAL */}
      {activeReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          data-testid="delivery-receipt-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header with Print & Close */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Intake Delivery Recorded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  data-testid="print-receipt-button"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Printable Slip */}
            <div className="p-6 space-y-4 print:p-0">
              <div className="text-center pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  {activeReceipt.enterpriseName || enterpriseName}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  Official Harvest Intake Receipt · South Omo Zone
                </p>
                <div
                  className="inline-block mt-2 px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-sm font-extrabold font-mono text-slate-900 dark:text-slate-100"
                  data-testid="receipt-number"
                >
                  {activeReceipt.deliveryNo || 'DEL-CONFIRMED'}
                </div>
              </div>

              {/* Farmer and Receiving Details */}
              <div className="grid grid-cols-2 gap-2 text-xs py-1">
                <div>
                  <span className="text-slate-400">Supplier:</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {activeReceipt.farmerName || 'Farmer Supplier'}
                  </p>
                  <p className="font-mono text-[11px] text-emerald-800 dark:text-emerald-400">
                    {activeReceipt.farmerCode}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Intake Date:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                    {activeReceipt.deliveredAt ? new Date(activeReceipt.deliveredAt).toLocaleString() : 'Now'}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                    {activeReceipt.status || 'RECORDED'}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Commodity</th>
                      <th className="py-2 px-3">Grade</th>
                      <th className="py-2 px-3 text-right">Delivered Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeReceipt.items?.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {item.productTypeName || 'Raw Material'}
                        </td>
                        <td className="py-2.5 px-3">{item.grade}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800 dark:text-emerald-400">
                          {item.deliveredQty} {item.unit || 'KG'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Note / Notice */}
              <p className="text-[11px] text-slate-400 text-center italic">
                Raw weight recorded. Inspection grading and official payable calculation will be finalized upon quality inspection.
              </p>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
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
