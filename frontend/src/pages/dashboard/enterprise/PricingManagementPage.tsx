import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Tag,
  PlusCircle,
  RefreshCw,
  ArrowLeft,
  Building2,
  DollarSign,
  Package,
  CheckCircle,
  X,
  AlertCircle,
  Calendar,
  Smartphone,
  Layers,
  Search,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type { BuyingPriceRequest, ProductTypeRequest } from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

export default function PricingManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [activeTab, setActiveTab] = useState<'prices' | 'types'>('prices');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for New Buying Price
  const [priceForm, setPriceForm] = useState({
    productTypeId: '',
    grade: 'Grade A',
    pricePerUnit: '',
  });

  // Form State for New Product Type
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    category: 'HONEY',
    unit: 'KG',
    description: '',
  });

  // 1. Fetch Active Buying Prices for this Enterprise
  const {
    data: buyingPrices = [],
    isLoading: pricesLoading,
    isError: pricesError,
    refetch: refetchPrices,
  } = useQuery({
    queryKey: queryKeys.enterprise.pricing(enterpriseId),
    queryFn: () => enterpriseService.getBuyingPrices(enterpriseId),
  });

  // 2. Fetch Raw Product Types
  const {
    data: productTypes = [],
    isLoading: typesLoading,
    isError: typesError,
    refetch: refetchTypes,
  } = useQuery({
    queryKey: queryKeys.enterprise.productTypes(),
    queryFn: () => enterpriseService.getProductTypes(),
  });

  // Mutation: Create / Update Buying Price
  const createPriceMutation = useMutation({
    mutationFn: (data: BuyingPriceRequest) => enterpriseService.createBuyingPrice(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.pricing(enterpriseId) });
      setIsPriceModalOpen(false);
      setPriceForm({ productTypeId: '', grade: 'Grade A', pricePerUnit: '' });
      setNotification({
        type: 'success',
        message: `Buying rate of ${formatETB(saved.pricePerUnit)} published for ${saved.productTypeName || 'Commodity'} (${saved.grade}).`,
      });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to publish buying rate.',
      });
    },
  });

  // Mutation: Create Product Type
  const createTypeMutation = useMutation({
    mutationFn: (data: ProductTypeRequest) => enterpriseService.createProductType(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.productTypes() });
      setIsTypeModalOpen(false);
      setTypeForm({ code: '', name: '', category: 'HONEY', unit: 'KG', description: '' });
      setNotification({
        type: 'success',
        message: `New commodity type "${saved.name}" added to catalog.`,
      });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to create product type.',
      });
    },
  });

  // Filtered Buying Prices
  const filteredPrices = useMemo(() => {
    return buyingPrices.filter((bp) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = bp.productTypeName?.toLowerCase().includes(q);
      const matchGrade = bp.grade?.toLowerCase().includes(q);
      const matchCode = bp.productTypeCode?.toLowerCase().includes(q);
      return matchName || matchGrade || matchCode;
    });
  }, [buyingPrices, searchQuery]);

  // Filtered Product Types
  const filteredTypes = useMemo(() => {
    return productTypes.filter((pt) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = pt.name?.toLowerCase().includes(q);
      const matchCode = pt.code?.toLowerCase().includes(q);
      const matchCategory = pt.category?.toLowerCase().includes(q);
      return matchName || matchCode || matchCategory;
    });
  }, [productTypes, searchQuery]);

  const handleRefresh = () => {
    refetchPrices();
    refetchTypes();
  };

  return (
    <div className="space-y-6" data-testid="pricing-management-page">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Enterprise Hub</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Commodity Pricing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Buying Prices & Product Types</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Published by <strong className="text-slate-700 dark:text-slate-300">{enterpriseName}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Refresh rates"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsTypeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            data-testid="add-commodity-type-button"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Commodity Type</span>
          </button>
          <button
            onClick={() => setIsPriceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
            data-testid="publish-buying-price-button"
          >
            <DollarSign className="w-4 h-4" />
            <span>Publish Buying Price</span>
          </button>
        </div>
      </div>

      {/* USSD Broadcast Banner */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
        <Smartphone className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Live USSD Broadcast (*844#):</strong> Buying prices published here are synced in real-time to rural farmers dialling into the USSD channel. When farmers arrive at the intake warehouse, these approved rates automatically compute delivered line totals and payable balances.
        </div>
      </div>

      {/* Notifications Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}
          data-testid="notification-banner"
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section Tabs and Search Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'prices'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            data-testid="tab-buying-prices"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Active Buying Rates ({buyingPrices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'types'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            data-testid="tab-product-types"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Commodity Types ({productTypes.length})</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'prices' ? 'Filter prices by commodity or grade...' : 'Filter types...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            data-testid="pricing-search-input"
          />
        </div>
      </div>

      {/* TAB 1: BUYING PRICES TABLE */}
      {activeTab === 'prices' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {pricesLoading ? (
            <div className="p-6 space-y-3">
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ) : pricesError ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Unable to load enterprise buying prices.
              </p>
              <button
                onClick={() => refetchPrices()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white"
              >
                Retry
              </button>
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Tag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No active buying prices published yet.
              </p>
              <button
                onClick={() => setIsPriceModalOpen(true)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white"
              >
                Publish First Buying Price
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="buying-prices-table">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Commodity</th>
                    <th className="py-3 px-3">Quality Grade</th>
                    <th className="py-3 px-3">Buying Price (ETB)</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Effective Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPrices.map((bp) => (
                    <tr
                      key={bp.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`buying-price-row-${bp.id}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {bp.productTypeName || 'Agricultural Raw Material'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{bp.productTypeCode}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {bp.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        {formatETB(bp.pricePerUnit)}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                        per {bp.unit || 'KG'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {bp.effectiveFrom ? new Date(bp.effectiveFrom).toLocaleDateString() : 'Current'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle className="w-3 h-3" />
                          <span>Active / Published</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setPriceForm({
                              productTypeId: bp.productTypeId || '',
                              grade: bp.grade || 'Grade A',
                              pricePerUnit: bp.pricePerUnit?.toString() || '',
                            });
                            setIsPriceModalOpen(true);
                          }}
                          className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                        >
                          Update Rate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCT TYPES CATALOG TABLE */}
      {activeTab === 'types' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {typesLoading ? (
            <div className="p-6 space-y-3">
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ) : typesError ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Unable to load product types.
              </p>
              <button
                onClick={() => refetchTypes()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white"
              >
                Retry
              </button>
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No commodity types found.
              </p>
              <button
                onClick={() => setIsTypeModalOpen(true)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white"
              >
                Add First Commodity Type
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="product-types-table">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Commodity Name</th>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Standard Unit</th>
                    <th className="py-3 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTypes.map((pt) => (
                    <tr
                      key={pt.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`product-type-row-${pt.id}`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {pt.name}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-emerald-800 dark:text-emerald-400 font-medium">
                        {pt.code}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                          {pt.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {pt.unit}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {pt.description || 'Raw agricultural material for cooperative intake.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PUBLISH BUYING PRICE MODAL */}
      {isPriceModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          data-testid="publish-price-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Publish Enterprise Buying Price
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set buying rate for raw smallholder crop intake
                </p>
              </div>
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (priceForm.productTypeId && priceForm.pricePerUnit) {
                  createPriceMutation.mutate({
                    enterpriseId,
                    productTypeId: priceForm.productTypeId,
                    grade: priceForm.grade,
                    pricePerUnit: parseFloat(priceForm.pricePerUnit),
                  });
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commodity Product Type *
                </label>
                <select
                  required
                  value={priceForm.productTypeId}
                  onChange={(e) => setPriceForm({ ...priceForm, productTypeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  data-testid="price-product-type-select"
                >
                  <option value="">Select a commodity...</option>
                  {productTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.code}) - {pt.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quality Grade *
                </label>
                <input
                  type="text"
                  required
                  value={priceForm.grade}
                  onChange={(e) => setPriceForm({ ...priceForm, grade: e.target.value })}
                  placeholder="e.g. Grade A, Grade B, Grade 1"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  data-testid="price-grade-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Buying Price Per Unit (ETB) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceForm.pricePerUnit}
                    onChange={(e) => setPriceForm({ ...priceForm, pricePerUnit: e.target.value })}
                    placeholder="e.g. 350.00"
                    className="w-full pl-3 pr-12 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    data-testid="price-amount-input"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    ETB
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Rate directly broadcast over *844# USSD to all registered farmers.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPriceMutation.isPending || !priceForm.productTypeId || !priceForm.pricePerUnit}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                  data-testid="submit-price-button"
                >
                  {createPriceMutation.isPending ? 'Publishing...' : 'Publish Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT TYPE MODAL */}
      {isTypeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          data-testid="add-type-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Add Raw Commodity Type
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define a new agricultural commodity for intake & processing
                </p>
              </div>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (typeForm.code && typeForm.name && typeForm.unit) {
                  createTypeMutation.mutate(typeForm);
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commodity Code *
                </label>
                <input
                  type="text"
                  required
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SESAME-WHITE"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  data-testid="type-code-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commodity Name *
                </label>
                <input
                  type="text"
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="e.g. Organic White Humera Sesame"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  data-testid="type-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={typeForm.category}
                    onChange={(e) => setTypeForm({ ...typeForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    data-testid="type-category-select"
                  >
                    <option value="HONEY">Honey</option>
                    <option value="COFFEE">Coffee</option>
                    <option value="GRAIN">Grain</option>
                    <option value="OILSEED">Oilseed</option>
                    <option value="DAIRY">Dairy</option>
                    <option value="SPICE">Spice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Standard Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={typeForm.unit}
                    onChange={(e) => setTypeForm({ ...typeForm, unit: e.target.value.toUpperCase() })}
                    placeholder="e.g. KG, LITER"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    data-testid="type-unit-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Optional notes regarding harvesting and quality specs..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  data-testid="type-desc-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTypeMutation.isPending || !typeForm.code || !typeForm.name}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                  data-testid="submit-type-button"
                >
                  {createTypeMutation.isPending ? 'Saving...' : 'Save Commodity Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
