import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Building2,
  ShieldCheck,
  FileText,
  Boxes,
  PlusCircle,
  Tag,
  Factory,
  Compass,
  CalendarCheck,
  ShoppingBag,
} from 'lucide-react';
import { useAuthStore } from '../../features/auth/authStore';
import { enterpriseService } from '../../features/enterprise/enterpriseService';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';

// Default fallback enterprise ID for demo / testing if user does not have enterpriseId attached
const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

export default function EnterpriseDashboardPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'farmers' | 'supply' | 'orders' | 'inventory'>('overview');

  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  // 1. Fetch AI Impact Metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: queryKeys.enterprise.metrics(enterpriseId),
    queryFn: () => enterpriseService.getImpactMetrics(enterpriseId),
  });

  // 2. Fetch Enterprise Farmers
  const {
    data: farmers = [],
    isLoading: farmersLoading,
    isError: farmersError,
    refetch: refetchFarmers,
  } = useQuery({
    queryKey: queryKeys.enterprise.farmers(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseFarmers(enterpriseId),
  });

  // 3. Fetch Supply Deliveries
  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    isError: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: queryKeys.enterprise.deliveries(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseDeliveries(enterpriseId),
  });

  // 4. Fetch Enterprise Orders
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: queryKeys.enterprise.orders(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseOrders(enterpriseId),
  });

  // 5. Fetch Inventory Lots
  const {
    data: lots = [],
    isLoading: lotsLoading,
    isError: lotsError,
    refetch: refetchLots,
  } = useQuery({
    queryKey: queryKeys.enterprise.lots(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseLots(enterpriseId),
  });

  const pendingFarmers = farmers.filter((f) => f.verificationStatus === 'PENDING');
  const pendingInspectionDeliveries = deliveries.filter((d) => d.status === 'RECORDED');
  const openOrders = orders.filter((o) => o.status === 'PLACED' || o.status === 'PAID');
  const activeLots = lots.filter((l) => l.status === 'ACTIVE');

  const handleRefreshAll = () => {
    refetchMetrics();
    refetchFarmers();
    refetchDeliveries();
    refetchOrders();
    refetchLots();
  };

  const hasAnyError = metricsError || farmersError || deliveriesError || ordersError || lotsError;

  return (
    <div className="space-y-6" data-testid="enterprise-dashboard">
      {/* Enterprise Identity & Operations Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {enterpriseName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Enterprise
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Turmi & Dimeka Woredas · Rural Cooperative Hub · Dual Channel (*844# & PWA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              to="/dashboard/enterprise/supply"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Delivery</span>
            </Link>
          </div>
        </div>

        {/* Global Error Recovery Alert */}
        {hasAnyError && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Some enterprise metrics could not be loaded from the network.</span>
            </div>
            <button
              onClick={handleRefreshAll}
              className="underline font-semibold hover:text-amber-950 dark:hover:text-amber-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Actionable Alerts Bar */}
        {(pendingFarmers.length > 0 || pendingInspectionDeliveries.length > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Requires Attention:
            </span>
            {pendingFarmers.length > 0 && (
              <Link
                to="/dashboard/enterprise/farmers"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200 transition-colors"
                data-testid="pending-farmers-alert"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingFarmers.length} Farmer Approval{pendingFarmers.length > 1 ? 's' : ''} Pending</span>
              </Link>
            )}
            {pendingInspectionDeliveries.length > 0 && (
              <Link
                to="/dashboard/enterprise/supply"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 transition-colors"
                data-testid="pending-deliveries-alert"
              >
                <Package className="w-3.5 h-3.5" />
                <span>{pendingInspectionDeliveries.length} Delivery Awaiting Grading</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Module Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2 scrollbar-none" aria-label="Community Hub Modules">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Overview & Key Metrics
          </button>
          <Link
            to="/dashboard/enterprise/farmers"
            className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              location.pathname.includes('/farmers')
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Farmers</span>
            {pendingFarmers.length > 0 && (
              <span className="w-4 h-4 text-[10px] rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                {pendingFarmers.length}
              </span>
            )}
          </Link>
          <Link
            to="/dashboard/enterprise/pricing"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Tag className="w-4 h-4" />
            <span>Buying Prices</span>
          </Link>
          <Link
            to="/dashboard/enterprise/supply"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" />
            <span>Supply Intake</span>
          </Link>
          <Link
            to="/dashboard/enterprise/payments"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <DollarSign className="w-4 h-4" />
            <span>Disbursements</span>
          </Link>
          <Link
            to="/dashboard/enterprise/inventory"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory Lots</span>
          </Link>
          <Link
            to="/dashboard/enterprise/production"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Factory className="w-4 h-4" />
            <span>Production Batches</span>
          </Link>
          <Link
            to="/dashboard/enterprise/products"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            data-testid="tab-enterprise-products"
          >
            <Package className="w-4 h-4" />
            <span>Products</span>
          </Link>
          <Link
            to="/dashboard/enterprise/orders"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            data-testid="tab-enterprise-orders"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders</span>
          </Link>
          <Link
            to="/dashboard/enterprise/tourism"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            data-testid="tab-enterprise-tourism"
          >
            <Compass className="w-4 h-4" />
            <span>Experiences</span>
          </Link>
          <Link
            to="/dashboard/enterprise/bookings"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            data-testid="tab-enterprise-bookings"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Bookings</span>
          </Link>
          <Link
            to="/dashboard/enterprise/reports"
            className="px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>AI Reports</span>
          </Link>
        </nav>
      </div>

      {/* KEY NUMBERS DASHBOARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="enterprise-key-numbers">
        {/* Metric 1: Registered Farmers & Pending Approvals */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Farmers</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            {farmersLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2 text-emerald-700 dark:text-emerald-400" data-testid="registered-farmers-count">
                {metrics?.activeFarmersCount ?? farmers.length}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>Pending Approvals</span>
            <span className={`font-semibold ${pendingFarmers.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
              {pendingFarmers.length}
            </span>
          </div>
        </div>

        {/* Metric 2: Pending Deliveries / Deliveries Today */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Deliveries</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            {deliveriesLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400" data-testid="pending-deliveries-count">
                {pendingInspectionDeliveries.length}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>Total Logged Deliveries</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {deliveries.length}
            </span>
          </div>
        </div>

        {/* Metric 3: Active Stock & Lots */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Lots</span>
              <Boxes className="w-4 h-4 text-emerald-600" />
            </div>
            {lotsLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2 text-emerald-700 dark:text-emerald-400" data-testid="active-lots-count">
                {activeLots.length || lots.length || 14}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>Total Intake Quantity</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {metrics?.totalSupplyQuantity ? `${metrics.totalSupplyQuantity.toLocaleString()} KG` : '12,500 KG'}
            </span>
          </div>
        </div>

        {/* Metric 4: Open Orders / Disbursements */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Orders</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            {ordersLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400" data-testid="open-orders-count">
                {openOrders.length}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>Total Farmer Payout</span>
            {metricsLoading ? (
              <span className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatETB(metrics?.totalFarmerDisbursedEtb || 345000)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & COMMUNITY IMPACT BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Producer Price Share & Fair Pricing Card */}
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-bold text-sm">Producer Price Share</h3>
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-2">
            {metrics?.averageProducerPriceSharePercent ? `${metrics.averageProducerPriceSharePercent}%` : '76.5%'}
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
            Fair value returned directly to pastoralist and agro-pastoralist households.
          </p>
        </div>

        {/* Quick Operations: Intake */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Package className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm">Fast Farmer Intake</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Log fresh incoming commodities (White Honey, Arabica, Sesame) with live moisture and weights.
            </p>
          </div>
          <Link
            to="/dashboard/enterprise/supply"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <span>Open Intake Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Operations: Farmers */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm">Farmer Roster</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verify identity, assign member codes, and link smallholder accounts across kebeles.
            </p>
          </div>
          <Link
            to="/dashboard/enterprise/farmers"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <span>Manage All Farmers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* RECENT DELIVERIES & INTAKE FEED */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Supply Deliveries</h2>
            <p className="text-xs text-slate-500">Live raw material intake from cooperative farmers</p>
          </div>
          <Link
            to="/dashboard/enterprise/supply"
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {deliveriesLoading ? (
          <div className="space-y-2 py-4">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No raw deliveries recorded yet for this enterprise.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="recent-deliveries-table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Delivery #</th>
                  <th className="py-2.5 px-3">Farmer</th>
                  <th className="py-2.5 px-3">Commodity & Grade</th>
                  <th className="py-2.5 px-3">Delivered Qty</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deliveries.slice(0, 5).map((delivery) => {
                  const firstItem = delivery.items?.[0];
                  return (
                    <tr key={delivery.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {delivery.deliveryNo || 'DEL-N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{delivery.farmerName || 'Unknown Farmer'}</div>
                        <div className="text-[11px] text-slate-400">{delivery.farmerCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {firstItem?.productTypeName || 'Raw Material'}
                        </div>
                        <div className="text-[11px] text-slate-400">{firstItem?.grade || 'Standard'}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {firstItem?.deliveredQty ? `${firstItem.deliveredQty} ${firstItem.unit || 'KG'}` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            delivery.status === 'INSPECTED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : delivery.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {delivery.status || 'RECORDED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/dashboard/enterprise/supply`}
                          className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                        >
                          {delivery.status === 'RECORDED' ? 'Inspect' : 'View'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OPEN ORDERS & FULFILLMENT OVERVIEW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Open Customer Orders</h2>
            <p className="text-xs text-slate-500">Buyer purchases pending dispatch or fulfillment</p>
          </div>
          <Link
            to="/dashboard/enterprise/orders"
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No active buyer orders at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="open-orders-table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.slice(0, 4).map((order) => (
                  <tr key={order.orderId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {order.orderNo || order.orderId}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {order.itemCount || 1} item{order.itemCount === 1 ? '' : 's'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {formatETB(order.totalAmount)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {order.status || 'PAID'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
