import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Package,
  DollarSign,
  TrendingUp,
  Tag,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Phone,
  Scale,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../features/auth/authStore';
import { farmerService } from '../../features/farmer/farmerService';
import { queryKeys } from '../../services/queryKeys';
import { formatETB, formatQuantity, formatDateTime, getStatusI18nKey } from '../../utils/formatters';

// Demo farmer ID for testing — see backend gap: UserProfileResponse lacks farmerId UUID
const DEMO_FARMER_ID = '22222222-2222-2222-2222-222222222222';
const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

const USSD_SHORT_CODE = import.meta.env.VITE_USSD_SHORT_CODE || '*844#';

/**
 * Farmer home dashboard (F-1001).
 * Shows: balance, recent deliveries, today's buying prices, large icons.
 * Role guard is applied at the route level (PRODUCER_FARMER + SYSTEM_ADMIN).
 * Backend authority: FarmerSelfServiceController at /api/v1/farmers/{farmerId}/*.
 */
export default function FarmerDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const farmerId = user?.farmerId || user?.id || (user?.roles?.includes('SYSTEM_ADMIN') ? DEMO_FARMER_ID : undefined);
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const farmerName = user?.fullName || t('farmer.dashboard.title');

  // 1. Fetch farmer balance summary
  const {
    data: balance,
    isLoading: balanceLoading,
    isError: balanceError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: queryKeys.farmer.balance(farmerId || 'me'),
    queryFn: () => farmerService.getBalance(farmerId!),
    enabled: !!farmerId,
  });

  // 2. Fetch farmer's own deliveries
  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    isError: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: queryKeys.farmer.deliveries(farmerId || 'me'),
    queryFn: () => farmerService.getDeliveries(farmerId!),
    enabled: !!farmerId,
  });

  // 3. Fetch today's buying prices (public endpoint, no auth needed)
  const {
    data: buyingPrices = [],
    isLoading: pricesLoading,
    isError: pricesError,
    refetch: refetchPrices,
  } = useQuery({
    queryKey: queryKeys.farmer.buyingPrices(enterpriseId),
    queryFn: () => farmerService.getBuyingPrices(enterpriseId),
  });

  // 4. Fetch farmer's received payments
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: queryKeys.farmer.payments(farmerId || 'me'),
    queryFn: () => farmerService.getPayments(farmerId!),
    enabled: !!farmerId,
  });

  const hasAnyError = balanceError || deliveriesError || pricesError || paymentsError;

  const handleRefreshAll = () => {
    refetchBalance();
    refetchDeliveries();
    refetchPrices();
    refetchPayments();
  };

  return (
    <div className="space-y-6" data-testid="farmer-dashboard">
      {/* Farmer Identity Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {farmerName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('farmer.dashboard.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors touch-target"
              title={t('common.refresh')}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('common.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Pending Verification Notice */}
        {user?.verificationStatus === 'PENDING' && (
          <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block">Profile Pending Cooperative Verification</span>
              <span className="text-amber-800/90 dark:text-amber-300/80">
                Your farmer account ({user.farmerCode || 'Pending Code'}) is awaiting review from the South Omo cooperative desk. You can review live market prices below while pending verification.
              </span>
            </div>
          </div>
        )}

        {/* Global Error Recovery Alert */}
        {hasAnyError && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('farmer.errors.loadFailed')}</span>
            </div>
            <button
              onClick={handleRefreshAll}
              className="underline font-semibold hover:text-amber-950 dark:hover:text-amber-200"
            >
              {t('common.retry')}
            </button>
          </div>
        )}
      </div>

      {/* KEY NUMBERS GRID: Balance, Deliveries, Payments, Prices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="farmer-key-numbers">
        {/* Balance Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('farmer.balance.pendingPayout')}
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            {balanceLoading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p
                className="text-2xl font-bold mt-2 text-emerald-700 dark:text-emerald-400"
                data-testid="pending-payout-amount"
              >
                {formatETB(balance?.totalPendingPayout || 0)}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>{t('farmer.balance.openPayables')}</span>
            <span
              className={`font-semibold ${
                (balance?.openPayablesCount || 0) > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400'
              }`}
              data-testid="open-payables-count"
            >
              {balance?.openPayablesCount ?? 0}
            </span>
          </div>
        </div>

        {/* Total Delivered Value */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('farmer.balance.totalDelivered')}
              </span>
              <Scale className="w-4 h-4 text-blue-600" />
            </div>
            {balanceLoading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p
                className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400"
                data-testid="total-delivered-amount"
              >
                {formatETB(balance?.totalDeliveredValue || 0)}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>{t('farmer.balance.totalSettled')}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatETB(balance?.totalSettled || 0)}
            </span>
          </div>
        </div>

        {/* Recent Deliveries Count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('farmer.deliveries.title')}
              </span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            {deliveriesLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p
                className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400"
                data-testid="deliveries-count"
              >
                {deliveries.length}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>{t('common.today')}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {deliveries.filter((d) => {
                const dt = new Date(d.deliveredAt || '');
                const now = new Date();
                return (
                  dt.getDate() === now.getDate() &&
                  dt.getMonth() === now.getMonth() &&
                  dt.getFullYear() === now.getFullYear()
                );
              }).length}
            </span>
          </div>
        </div>

        {/* Active Buying Prices Count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('farmer.prices.title')}
              </span>
              <Tag className="w-4 h-4 text-emerald-600" />
            </div>
            {pricesLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
            ) : (
              <p
                className="text-2xl font-bold mt-2 text-emerald-700 dark:text-emerald-400"
                data-testid="buying-prices-count"
              >
                {buyingPrices.length}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
            <span>{t('farmer.prices.subtitle')}</span>
          </div>
        </div>
      </div>

      {/* USSD Quick Access Banner */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
              {t('farmer.dashboard.ussdTitle', { code: USSD_SHORT_CODE })}
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              {t('farmer.dashboard.ussdDesc', { code: USSD_SHORT_CODE })}
            </p>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN: Recent Deliveries + Today's Buying Prices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Deliveries Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('farmer.deliveries.title')}
              </h2>
              <p className="text-xs text-slate-500">{t('farmer.deliveries.subtitle')}</p>
            </div>
            <Link
              to="/dashboard/farmer/deliveries"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {deliveriesLoading ? (
            <div className="space-y-2 py-4">
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs" data-testid="deliveries-empty">
              {t('farmer.deliveries.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="recent-deliveries-table">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{t('farmer.deliveries.deliveryNo')}</th>
                    <th className="py-2.5 px-3">{t('farmer.deliveries.commodity')}</th>
                    <th className="py-2.5 px-3">{t('farmer.deliveries.deliveredQty')}</th>
                    <th className="py-2.5 px-3">{t('farmer.deliveries.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deliveries.slice(0, 5).map((delivery) => {
                    const firstItem = delivery.items?.[0];
                    return (
                      <tr key={delivery.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {delivery.deliveryNo || t('common.na')}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {firstItem?.productTypeName || t('common.na')}
                          </div>
                          <div className="text-[11px] text-slate-400">{firstItem?.grade || '—'}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {firstItem
                            ? formatQuantity(firstItem.deliveredQty, firstItem.unit || 'KG')
                            : '—'}
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
                            {t(getStatusI18nKey(delivery.status || 'RECORDED'))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Today's Buying Prices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('farmer.prices.title')}
              </h2>
              <p className="text-xs text-slate-500">{t('farmer.prices.subtitle')}</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          {pricesLoading ? (
            <div className="space-y-2 py-4">
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ) : buyingPrices.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs" data-testid="prices-empty">
              {t('farmer.prices.empty')}
            </div>
          ) : (
            <div className="space-y-2" data-testid="buying-prices-list">
              {buyingPrices.slice(0, 5).map((price) => (
                <div
                  key={price.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                      {price.productTypeName || t('common.na')}
                    </div>
                    <div className="text-[11px] text-slate-400">{price.grade || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatETB(price.pricePerUnit || 0)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {t('farmer.prices.unit')}: {price.unit || 'KG'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('farmer.payments.title')}
            </h2>
          </div>
          <Link
            to="/dashboard/farmer/payables"
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>{t('common.viewAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {paymentsLoading ? (
          <div className="space-y-2 py-4">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs" data-testid="payments-empty">
            {t('farmer.payments.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="recent-payments-table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">{t('farmer.payments.paymentNo')}</th>
                  <th className="py-2.5 px-3">{t('farmer.payments.amount')}</th>
                  <th className="py-2.5 px-3">{t('farmer.payments.method')}</th>
                  <th className="py-2.5 px-3">{t('farmer.payments.status')}</th>
                  <th className="py-2.5 px-3">{t('farmer.payments.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.slice(0, 5).map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {payment.paymentNo || t('common.na')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatETB(payment.amount || 0)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {payment.paymentMethod || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          payment.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : payment.status === 'INITIATED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {t(getStatusI18nKey(payment.status || 'PENDING'))}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {payment.paidAt ? formatDateTime(payment.paidAt, 'dateOnly') : '—'}
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
