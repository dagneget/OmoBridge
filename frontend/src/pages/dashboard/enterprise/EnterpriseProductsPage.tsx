import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  DollarSign,
  TrendingUp,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Info,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type {
  ProductResponse,
  ProductCreateFromOutputRequest,
  ProductPriceBreakdownResponse,
} from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

const PRODUCT_CATEGORIES = [
  'Honey & Hive Products',
  'Oilseeds & Grains',
  'Spices & Coffee',
  'Artisan Crafts & Textiles',
  'Medicinal Herbs',
];

export default function EnterpriseProductsPage() {
  const [searchParams] = useSearchParams();
  const queryOutputId = searchParams.get('outputId');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  // Filters & UI State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'UNPUBLISHED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(Boolean(queryOutputId));
  const [selectedBreakdownProduct, setSelectedBreakdownProduct] = useState<ProductResponse | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<ProductResponse | null>(null);
  const [stockDelta, setStockDelta] = useState('10');
  const [stockReason, setStockReason] = useState('Production replenishment intake');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Form State for Product Creation from Batch Output
  const [selectedOutputId, setSelectedOutputId] = useState(queryOutputId || '');
  const [formSku, setFormSku] = useState(`OMO-HNY-${Math.floor(100 + Math.random() * 900)}`);
  const [formName, setFormName] = useState('South Omo Wild White Honey (500g Jar)');
  const [formCategory, setFormCategory] = useState('Honey & Hive Products');
  const [formDescription, setFormDescription] = useState(
    'Pure raw forest honey cold-filtered and bottled under certified community standards.'
  );
  const [formStory, setFormStory] = useState(
    'Harvested from wild hives in the Mago river basin by local beekeeping families.'
  );
  const [formPackSize, setFormPackSize] = useState('0.5');
  const [formInitialStock, setFormInitialStock] = useState('50');
  const [formTransportCost, setFormTransportCost] = useState('15');
  const [formMarginRate, setFormMarginRate] = useState('0.15');
  const [formPublishImmediately, setFormPublishImmediately] = useState(true);

  // 1. Fetch Enterprise Products
  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: queryKeys.enterprise.products(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseProducts(enterpriseId),
  });

  // 2. Fetch Batches (to list available outputs for publishing)
  const { data: batches = [] } = useQuery({
    queryKey: queryKeys.enterprise.batches(enterpriseId),
    queryFn: () => enterpriseService.getProductionBatches(enterpriseId),
  });

  // Extract all outputs from completed batches
  const availableOutputs = useMemo(() => {
    const list: Array<{ id: string; name: string; batchCode: string; grade: string; quantity: number; unit: string }> = [];
    batches.forEach((b) => {
      (b.outputs || []).forEach((out) => {
        list.push({
          id: out.id || `out-${b.id}`,
          name: out.productTypeName || 'Processed Material',
          batchCode: b.batchCode,
          grade: out.grade || 'Standard',
          quantity: Number(out.quantity || 0),
          unit: out.unit || 'KG',
        });
      });
    });
    return list;
  }, [batches]);

  // Live Price Calculation Preview
  const pricePreview = useMemo(() => {
    const packSize = parseFloat(formPackSize) || 1;
    const purchaseCost = Math.round(280 * packSize * 100) / 100;
    const processingCost = Math.round(25 * packSize * 100) / 100;
    const packagingCost = Math.round(20 * packSize * 100) / 100;
    const laborCost = Math.round(15 * packSize * 100) / 100;
    const transportCost = parseFloat(formTransportCost) || 0;
    const directCost = purchaseCost + processingCost + packagingCost + laborCost + transportCost;

    const marginRate = parseFloat(formMarginRate) || 0.15;
    const enterpriseMargin = Math.round(directCost * marginRate * 100) / 100;
    const subtotal = directCost + enterpriseMargin;

    const communityFund = Math.round(subtotal * 0.03 * 100) / 100;
    const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.15 * 100) / 100;
    const totalPrice = Math.round((subtotal + communityFund + platformFee + taxAmount) * 100) / 100;

    const producerSharePercent = totalPrice > 0 ? Math.round((purchaseCost / totalPrice) * 100) : 0;

    return {
      purchaseCost,
      processingCost,
      packagingCost,
      laborCost,
      transportCost,
      directCost,
      enterpriseMargin,
      subtotal,
      communityFund,
      platformFee,
      taxAmount,
      totalPrice,
      producerSharePercent,
    };
  }, [formPackSize, formTransportCost, formMarginRate]);

  // 3. Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: (req: ProductCreateFromOutputRequest) =>
      enterpriseService.createProductFromOutput(enterpriseId, req),
    onSuccess: (newProd) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.products(enterpriseId) });
      setCreateModalOpen(false);
      setFeedbackSuccess(`Product "${newProd.name}" created and configured with transparent pricing!`);
      setTimeout(() => setFeedbackSuccess(null), 5000);
      refetchProducts();
    },
  });

  // 4. Publish / Unpublish Mutation
  const publishMutation = useMutation({
    mutationFn: ({ productId, publish }: { productId: string; publish: boolean }) =>
      enterpriseService.publishProduct(enterpriseId, productId, publish),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.products(enterpriseId) });
      refetchProducts();
    },
  });

  // 5. Stock Adjustment Mutation
  const adjustStockMutation = useMutation({
    mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason: string }) =>
      enterpriseService.adjustProductStock(enterpriseId, productId, { quantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.products(enterpriseId) });
      setStockModalProduct(null);
      setFeedbackSuccess('Product inventory stock successfully updated with full audit trail.');
      setTimeout(() => setFeedbackSuccess(null), 4000);
      refetchProducts();
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku.trim() || !formName.trim()) return;

    createProductMutation.mutate({
      productionOutputId: selectedOutputId || availableOutputs[0]?.id || 'out-001',
      sku: formSku.trim(),
      name: formName.trim(),
      category: formCategory,
      description: formDescription,
      story: formStory,
      packSize: parseFloat(formPackSize) || 1,
      initialStock: parseFloat(formInitialStock) || 0,
      transportCost: parseFloat(formTransportCost) || 0,
      marginRate: parseFloat(formMarginRate) || 0.15,
      publishImmediately: formPublishImmediately,
    });
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PUBLISHED' && p.published) ||
        (statusFilter === 'UNPUBLISHED' && !p.published);

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [products, statusFilter, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="enterprise-products-page">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/dashboard/enterprise" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-200 font-semibold">Product Catalog</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Enterprise Product Catalog & Fair-Trade Pricing
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Transparent Cost Model (B-402)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {enterpriseName} · Connect batch outputs to customer storefront with transparent farmgate-to-retail price breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => refetchProducts()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              title="Refresh product catalog"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="create-product-btn"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Product from Batch</span>
            </button>
          </div>
        </div>

        {feedbackSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2" data-testid="product-feedback-banner">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackSuccess}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="products-kpi-grid">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Products</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="kpi-total-products">
            {products.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Catalog items</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Published on Storefront</span>
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400" data-testid="kpi-published-products">
            {products.filter((p) => p.published).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Live for online buyers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Physical Stock</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="kpi-total-stock">
            {products.reduce((acc, p) => acc + (Number(p.stockOnHand) || 0), 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Units on shelf</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Avg Producer Price Share</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="kpi-producer-share">
            68.4%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Directly to farmers & beekeepers</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            data-testid="filter-status-ALL"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setStatusFilter('PUBLISHED')}
            data-testid="filter-status-PUBLISHED"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'PUBLISHED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setStatusFilter('UNPUBLISHED')}
            data-testid="filter-status-UNPUBLISHED"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'UNPUBLISHED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Drafts
          </button>
        </div>

        <div className="relative flex-1 md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            data-testid="search-products-input"
            placeholder="Search by SKU, name, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Products Table */}
      {productsLoading ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading enterprise products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500" data-testid="products-empty-state">
          No enterprise products match the current filters.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" data-testid="products-table">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock on Hand</th>
                  <th className="py-3 px-4">Retail Price (ETB)</th>
                  <th className="py-3 px-4">Traceability</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition" data-testid={`product-row-${p.id}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{p.category}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white" data-testid={`stock-${p.id}`}>
                        {p.stockOnHand} {p.unit || 'units'}
                      </div>
                      <div className="text-[10px] text-slate-400">Available: {p.availableStock}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white" data-testid={`price-${p.id}`}>
                        {formatETB(p.unitPrice)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBreakdownProduct(p)}
                        data-testid={`view-breakdown-${p.id}`}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold mt-0.5"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Fair Price Breakdown</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {p.traceToken ? (
                        <Link
                          to={`/trace/${p.traceToken}`}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`trace-link-${p.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <span>{p.traceToken}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unlinked</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        data-testid={`product-status-${p.id}`}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.published
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setStockModalProduct(p)}
                          data-testid={`adjust-stock-btn-${p.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                        >
                          Adjust Stock
                        </button>
                        <button
                          type="button"
                          data-testid={`toggle-publish-btn-${p.id}`}
                          onClick={() => publishMutation.mutate({ productId: p.id, publish: !p.published })}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition flex items-center gap-1 ${
                            p.published
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {p.published ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Unpublish</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Publish</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Product Modal with Automated Transparent Pricing (F-907) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" data-testid="create-product-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span>Create Retail Product from Batch Output (F-907)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated transparent pricing calculation based on farmer intake and cooperative processing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Output Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Production Batch Output Lot <span className="text-rose-500">*</span>
                </label>
                <select
                  data-testid="output-lot-select"
                  value={selectedOutputId}
                  onChange={(e) => setSelectedOutputId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                >
                  <option value="">-- Choose Completed Output --</option>
                  {availableOutputs.map((out) => (
                    <option key={out.id} value={out.id}>
                      {out.batchCode} · {out.name} ({out.quantity} {out.unit} - {out.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Retail SKU Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="product-sku-input"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Product Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="product-name-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Category & Pack Size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pack Size (e.g. 0.5 KG)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    data-testid="pack-size-input"
                    value={formPackSize}
                    onChange={(e) => setFormPackSize(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Stock Units</label>
                  <input
                    type="number"
                    data-testid="initial-stock-input"
                    value={formInitialStock}
                    onChange={(e) => setFormInitialStock(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Transparent Pricing Breakdown Preview Box */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-3" data-testid="pricing-preview-card">
                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/60 pb-2">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Fair-Trade Price Breakdown (B-402 Preview)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    Total: {formatETB(pricePreview.totalPrice)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Farmgate Purchase:</span>
                    <div className="font-bold text-slate-900 dark:text-white">{formatETB(pricePreview.purchaseCost)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Processing & Pack:</span>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {formatETB(pricePreview.processingCost + pricePreview.packagingCost)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Coop Margin (15%):</span>
                    <div className="font-bold text-slate-900 dark:text-white">{formatETB(pricePreview.enterpriseMargin)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Community Fund (3%):</span>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">
                      {formatETB(pricePreview.communityFund)}
                    </div>
                  </div>
                </div>

                {/* Progress bar showing fair share */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-emerald-900 dark:text-emerald-300 font-semibold">
                    <span>Direct Producer & Community Share</span>
                    <span>{pricePreview.producerSharePercent}% of retail price</span>
                  </div>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pricePreview.producerSharePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publish-immediately"
                  data-testid="publish-immediately-checkbox"
                  checked={formPublishImmediately}
                  onChange={(e) => setFormPublishImmediately(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="publish-immediately" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Publish immediately to public online storefront (/products)
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-create-product-btn"
                  disabled={createProductMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{createProductMutation.isPending ? 'Publishing...' : 'Create & Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fair Price Breakdown Detail Modal */}
      {selectedBreakdownProduct && selectedBreakdownProduct.priceBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" data-testid="breakdown-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Fair-Trade Price Breakdown</h3>
                <p className="text-xs text-slate-500">{selectedBreakdownProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBreakdownProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Farmgate Smallholder Payment:</span>
                <span className="font-bold text-slate-900 dark:text-white" data-testid="breakdown-purchase-val">
                  {formatETB(selectedBreakdownProduct.priceBreakdown.purchaseCost || 0)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Processing & Milling:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatETB(selectedBreakdownProduct.priceBreakdown.processingCost || 0)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Packaging Materials (Food Grade):</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatETB(selectedBreakdownProduct.priceBreakdown.packagingCost || 0)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Cooperative Labor:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatETB(selectedBreakdownProduct.priceBreakdown.laborCost || 0)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Transport & Cold Chain:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatETB(selectedBreakdownProduct.priceBreakdown.transportCost || 0)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Cooperative Margin:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatETB(selectedBreakdownProduct.priceBreakdown.enterpriseMargin || 0)}
                </span>
              </div>
              <div className="py-2 flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>South Omo Community Fund (3%):</span>
                <span>{formatETB(selectedBreakdownProduct.priceBreakdown.communityFund || 0)}</span>
              </div>
              <div className="py-2 flex justify-between text-slate-500">
                <span>Value Added Tax (15%):</span>
                <span>{formatETB(selectedBreakdownProduct.priceBreakdown.taxAmount || 0)}</span>
              </div>
              <div className="py-2 flex justify-between text-slate-500">
                <span>Platform Operational Fee (5%):</span>
                <span>{formatETB(selectedBreakdownProduct.priceBreakdown.platformFee || 0)}</span>
              </div>
              <div className="pt-3 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>Total Retail Price:</span>
                <span className="text-emerald-600 dark:text-emerald-400" data-testid="breakdown-total-val">
                  {formatETB(selectedBreakdownProduct.priceBreakdown.totalPrice || selectedBreakdownProduct.unitPrice)}
                </span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedBreakdownProduct(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" data-testid="stock-adjust-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Adjust Physical Stock</h3>
            <p className="text-xs text-slate-500">{stockModalProduct.name}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Adjustment Delta (Positive or Negative)
                </label>
                <input
                  type="number"
                  data-testid="stock-delta-input"
                  value={stockDelta}
                  onChange={(e) => setStockDelta(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reason for Audit Log</label>
                <input
                  type="text"
                  data-testid="stock-reason-input"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-stock-adjust-btn"
                onClick={() =>
                  adjustStockMutation.mutate({
                    productId: stockModalProduct.id,
                    quantity: parseFloat(stockDelta) || 0,
                    reason: stockReason,
                  })
                }
                disabled={adjustStockMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {adjustStockMutation.isPending ? 'Updating...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
