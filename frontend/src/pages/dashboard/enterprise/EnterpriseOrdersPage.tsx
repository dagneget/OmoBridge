import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  AlertCircle,
  XCircle,
  Printer,
  Eye,
  ChevronRight,
  X,
  MapPin,
  Phone,
  User,
  DollarSign,
  QrCode,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type { OrderSummaryResponse } from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

type OrderStatusFilter = 'ALL' | 'PLACED' | 'PAID' | 'PACKED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export default function EnterpriseOrdersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [packingSlipOrderId, setPackingSlipOrderId] = useState<string | null>(null);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // 1. Fetch Orders List
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
  } = useQuery({
    queryKey: queryKeys.enterprise.orders(enterpriseId),
    queryFn: () => enterpriseService.getEnterpriseOrders(enterpriseId),
  });

  // 2. Fetch Active Order Detail (when selected in drawer or packing slip)
  const activeDetailId = selectedOrderId || packingSlipOrderId;
  const {
    data: activeOrderDetail,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: activeDetailId ? queryKeys.enterprise.order(enterpriseId, activeDetailId) : ['enterprise-order-detail-none'],
    queryFn: () => activeDetailId ? enterpriseService.getEnterpriseOrderDetail(enterpriseId, activeDetailId) : Promise.reject(),
    enabled: !!activeDetailId,
  });

  // 3. Status Transition Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus, reason }: { orderId: string; newStatus: string; reason?: string }) =>
      enterpriseService.updateOrderStatus(enterpriseId, orderId, newStatus, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.orders(enterpriseId) });
      if (updated?.orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.order(enterpriseId, updated.orderId) });
      }
      setActionSuccessMessage(`Order #${updated?.orderNo || 'updated'} transitioned to ${updated?.status}`);
      setActionErrorMessage(null);
      setCancelModalOrderId(null);
      setCancelReason('');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update order status';
      setActionErrorMessage(msg);
      setTimeout(() => setActionErrorMessage(null), 5000);
    },
  });

  // KPI Calculations
  const totalOrders = orders.length;
  const pendingFulfillmentOrders = orders.filter((o) => o.status === 'PAID' || o.status === 'PACKED');
  const inTransitOrders = orders.filter((o) => o.status === 'IN_TRANSIT');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');
  const totalRevenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      (o.orderNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.orderId || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PLACED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock className="w-3 h-3" />
            Placed (Awaiting Payment)
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <CheckCircle2 className="w-3 h-3" />
            Paid (Needs Packing)
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            <PackageCheck className="w-3 h-3" />
            Packed (Ready Dispatch)
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
            <Truck className="w-3 h-3" />
            In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const handleNextTransition = (order: OrderSummaryResponse) => {
    if (!order.orderId) return;
    if (order.status === 'PLACED') {
      updateStatusMutation.mutate({ orderId: order.orderId, newStatus: 'PAID', reason: 'Confirmed payment receipt' });
    } else if (order.status === 'PAID') {
      updateStatusMutation.mutate({ orderId: order.orderId, newStatus: 'PACKED', reason: 'Order packed in cooperative fulfillment hub' });
    } else if (order.status === 'PACKED') {
      updateStatusMutation.mutate({ orderId: order.orderId, newStatus: 'IN_TRANSIT', reason: 'Handed over to delivery driver / courier' });
    } else if (order.status === 'IN_TRANSIT') {
      updateStatusMutation.mutate({ orderId: order.orderId, newStatus: 'DELIVERED', reason: 'Confirmed buyer delivery at destination' });
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelModalOrderId) return;
    updateStatusMutation.mutate({
      orderId: cancelModalOrderId,
      newStatus: 'CANCELLED',
      reason: cancelReason || 'Cancelled by enterprise manager',
    });
  };

  return (
    <div className="space-y-6" data-testid="enterprise-orders-page">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/enterprise" className="hover:text-slate-800 dark:hover:text-slate-200">
              Community Hub Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Orders & Fulfillment</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <span>Orders & Delivery Dispatch</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage buyer purchases, transition fulfillment stages, and generate printable packing slips.
          </p>
        </div>

        <Link
          to="/dashboard/enterprise"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>

      {/* Action Notification Banners */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}
      {actionErrorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalOrders}</div>
          <p className="text-xs text-slate-500 mt-1">All incoming purchases</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Awaiting Dispatch</span>
            <PackageCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingFulfillmentOrders.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Paid or packed ready</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">In Transit</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {inTransitOrders.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">On delivery route</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Order Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatETB(totalRevenue)}
          </div>
          <p className="text-xs text-slate-500 mt-1">{deliveredOrders.length} orders delivered</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" data-testid="order-status-tabs">
            {(['ALL', 'PLACED', 'PAID', 'PACKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as OrderStatusFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                data-testid={`tab-${tab.toLowerCase()}`}
              >
                {tab === 'ALL' ? 'All Orders' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="search-orders-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {ordersLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
              Loading enterprise orders...
            </div>
          ) : ordersError ? (
            <div className="py-8 text-center text-rose-500 text-xs">
              Failed to load orders. Please refresh.
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No orders found matching the filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs" data-testid="orders-table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Order #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Total (ETB)</th>
                  <th className="py-3 px-3 text-right">Actions & State Lifecycle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((order) => {
                  const isPlaced = order.status === 'PLACED';
                  const isPaid = order.status === 'PAID';
                  const isPacked = order.status === 'PACKED';
                  const isInTransit = order.status === 'IN_TRANSIT';
                  const isDelivered = order.status === 'DELIVERED';
                  const isCancelled = order.status === 'CANCELLED';

                  return (
                    <tr
                      key={order.orderId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`order-row-${order.orderId}`}
                    >
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {order.orderNo || order.orderId}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {order.itemCount || 1} item{(order.itemCount || 1) > 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {formatETB(order.totalAmount || 0)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* View Detail Button */}
                          <button
                            onClick={() => setSelectedOrderId(order.orderId || null)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                            data-testid={`btn-view-${order.orderId}`}
                            title="View order details and audit history"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>

                          {/* Packing Slip Button */}
                          <button
                            onClick={() => setPackingSlipOrderId(order.orderId || null)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                            data-testid={`btn-packing-slip-${order.orderId}`}
                            title="Generate and print packing slip"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Slip</span>
                          </button>

                          {/* Strict Next Transition Button */}
                          {isPlaced && (
                            <button
                              onClick={() => handleNextTransition(order)}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                              data-testid={`btn-transition-${order.orderId}`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Mark Paid</span>
                            </button>
                          )}

                          {isPaid && (
                            <button
                              onClick={() => handleNextTransition(order)}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm transition-colors"
                              data-testid={`btn-transition-${order.orderId}`}
                            >
                              <PackageCheck className="w-3 h-3" />
                              <span>Mark Packed</span>
                            </button>
                          )}

                          {isPacked && (
                            <button
                              onClick={() => handleNextTransition(order)}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
                              data-testid={`btn-transition-${order.orderId}`}
                            >
                              <Truck className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}

                          {isInTransit && (
                            <button
                              onClick={() => handleNextTransition(order)}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors"
                              data-testid={`btn-transition-${order.orderId}`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirm Delivered</span>
                            </button>
                          )}

                          {/* Cancel Order Option for non-terminal orders */}
                          {!isDelivered && !isCancelled && (
                            <button
                              onClick={() => setCancelModalOrderId(order.orderId || null)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                              data-testid={`btn-cancel-${order.orderId}`}
                              title="Cancel order"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ORDER DETAILS MODAL / DRAWER */}
      {selectedOrderId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          data-testid="order-detail-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>Order {activeOrderDetail?.orderNo || selectedOrderId}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed buyer line items, delivery coordinates, and status trail
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading order details...
              </div>
            ) : activeOrderDetail ? (
              <div className="space-y-6">
                {/* Status & Buyer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Customer Details</div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{activeOrderDetail.buyerName || 'Elena Rostova'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeOrderDetail.buyerPhone || activeOrderDetail.deliveryPhone || '+251911998877'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{activeOrderDetail.deliveryAddress || 'Turmi Lodge Reception'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fulfillment Status</div>
                    <div>{getStatusBadge(activeOrderDetail.status)}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Ordered: {new Date(activeOrderDetail.createdAt || Date.now()).toLocaleString()}
                    </div>
                    {activeOrderDetail.notes && (
                      <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800">
                        Note: {activeOrderDetail.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Purchased Items</h4>
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(activeOrderDetail.items || []).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {item.productName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{item.productSku || '—'}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                            {formatETB(item.unitPrice || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-900 dark:text-slate-100">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                            {formatETB(item.lineTotal || (item.unitPrice || 0) * (item.quantity || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/60 font-semibold border-t border-slate-200 dark:border-slate-800">
                      <tr>
                        <td colSpan={4} className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                          Subtotal:
                        </td>
                        <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                          {formatETB(activeOrderDetail.subtotal || 0)}
                        </td>
                      </tr>
                      {!!activeOrderDetail.deliveryFee && (
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                            Delivery Fee:
                          </td>
                          <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                            {formatETB(activeOrderDetail.deliveryFee)}
                          </td>
                        </tr>
                      )}
                      <tr className="text-sm">
                        <td colSpan={4} className="py-2 px-3 text-right text-slate-900 dark:text-slate-100 font-bold">
                          Grand Total:
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatETB(activeOrderDetail.totalAmount || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Audit & Status History */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Fulfillment Audit Trail
                  </h4>
                  {(activeOrderDetail.statusHistories || []).length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">No historical status transitions logged yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {activeOrderDetail.statusHistories?.map((hist, idx) => (
                        <div
                          key={hist.id || idx}
                          className="flex items-start gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs border border-slate-100 dark:border-slate-800"
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {hist.fromStatus ? `${hist.fromStatus} → ` : ''}
                                {hist.toStatus}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {hist.createdAt ? new Date(hist.createdAt).toLocaleString() : ''}
                              </span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                              {hist.reason || 'Status updated'} · By {hist.changedBy || 'Community Hub Officer'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedOrderId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE PACKING SLIP MODAL */}
      {packingSlipOrderId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          data-testid="packing-slip-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Official Packing Slip
                </h3>
              </div>
              <button
                onClick={() => setPackingSlipOrderId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div
              className="p-6 bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-xl space-y-6 font-sans print:border-none print:p-0"
              data-testid="printable-slip-content"
            >
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="text-sm font-bold tracking-tight uppercase text-emerald-800">
                    OmoBridge Fair-Trade Network
                  </div>
                  <div className="text-xs font-semibold text-slate-700">{enterpriseName}</div>
                  <div className="text-[11px] text-slate-500">Turmi / Jinka Cooperative Hub, South Omo, Ethiopia</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">PACKING SLIP</div>
                  <div className="text-sm font-mono font-bold text-slate-900">
                    {activeOrderDetail?.orderNo || packingSlipOrderId}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(activeOrderDetail?.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Ship To Destination */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <div className="font-bold text-slate-600 uppercase text-[10px]">Ship To / Customer:</div>
                  <div className="font-semibold text-slate-900 mt-1">{activeOrderDetail?.buyerName || 'Elena Rostova'}</div>
                  <div className="text-slate-600 mt-0.5">{activeOrderDetail?.deliveryAddress || 'Turmi Lodge Front Desk'}</div>
                  <div className="text-slate-600 mt-0.5">Phone: {activeOrderDetail?.buyerPhone || '+251911998877'}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-600 uppercase text-[10px]">Dispatch Status:</div>
                  <div className="mt-1 font-semibold text-emerald-700">{activeOrderDetail?.status || 'PAID'}</div>
                  {activeOrderDetail?.notes && (
                    <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                      <strong>Special Handling:</strong> {activeOrderDetail.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Verification Checklist */}
              <div>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3 w-8 text-center">✓</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(activeOrderDetail?.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-3 text-center">
                          <input type="checkbox" className="rounded text-emerald-600 focus:ring-0" defaultChecked />
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">{item.productName}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{item.productSku || 'OMO-SKU'}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cooperative Trace Seal & QR Placeholder */}
              <div className="flex items-center justify-between border-t pt-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center p-1 text-center">
                    <QrCode className="w-8 h-8 text-slate-800" />
                    <span className="text-[8px] font-mono">TRACE-QR</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">Verified Origin Guarantee</div>
                    <div className="text-[10px] text-slate-500">Scan QR to verify cooperative batch trace & elders consent</div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-500">
                  <div>Packed By: Abebe Bikila (Lead Fulfiller)</div>
                  <div>Turmi Cooperative Hub · Dual Channel</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Ready for cooperative shipment sealing</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPackingSlipOrderId(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                  data-testid="btn-print-slip"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {cancelModalOrderId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="cancel-order-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cancel Order</h3>
                <p className="text-xs text-slate-500">Order #{cancelModalOrderId}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Cancelling this order is an irreversible action. Reserved product inventory will be audited and the buyer notified.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cancellation Reason:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Buyer requested refund, damaged stock, address unreachable..."
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={3}
                data-testid="cancel-reason-input"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setCancelModalOrderId(null);
                  setCancelReason('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={updateStatusMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
                data-testid="confirm-cancel-button"
              >
                {updateStatusMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
