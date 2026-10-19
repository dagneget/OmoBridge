import { useQueries } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { ChapaPaymentModal } from '../payments';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import type {
  CheckoutResponse,
  OrderDetailResponse,
  OrderSummaryResponse,
} from '../../types/api';
import { orderConfirmationService } from './orderConfirmationService';
import { ReservationCountdown } from './ReservationCountdown';
import { useCheckoutResultText } from './useCheckoutResultText';
const control =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-150 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60 transition-colors cursor-pointer';

const controlPrimary =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-5 py-2.5 text-sm shadow-md shadow-emerald-700/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 transition-all cursor-pointer';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reservationExpired = (order?: OrderDetailResponse) =>
  order?.status === 'CANCELLED' &&
  order.statusHistories?.some(
    (event) =>
      event.toStatus === 'CANCELLED' &&
      event.reason === 'Order cancelled due to expired stock reservations',
  ) === true;
interface Props {
  result: CheckoutResponse;
  onNewCheckout: () => void;
}
export function CheckoutResult({ result, onNewCheckout }: Props) {
  const t = useCheckoutResultText();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const { isOnline } = useNetworkStatus();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const [selection, setSelection] = useState<{
    orderId: string;
    buyerId: string;
    token: string | null;
    groupId: string;
  } | null>(null);
  const orders = result.orders ?? [];
  const queries = useQueries({
    queries: orders.map((order) => ({
      queryKey: [
        'checkout-confirmation',
        user?.id,
        result.checkoutGroupId,
        order.orderId,
      ],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        if (
          !isOnline ||
          !isAuthenticated ||
          isLoading ||
          !user?.id ||
          !uuid.test(order.orderId ?? '') ||
          !uuid.test(result.checkoutGroupId ?? '')
        )
          throw new Error('Order verification unavailable');
        const detail = await orderConfirmationService.get(
          order.orderId!,
          signal,
        );
        if (
          detail.checkoutGroupId !== result.checkoutGroupId ||
          detail.enterpriseId !== order.enterpriseId ||
          detail.buyerId !== user?.id
        )
          throw new Error('Mismatched order confirmation');
        return detail;
      },
      enabled:
        isOnline &&
        isAuthenticated &&
        !isLoading &&
        !!user?.id &&
        uuid.test(order.orderId ?? '') &&
        uuid.test(result.checkoutGroupId ?? ''),
      retry: false,
      gcTime: 0,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    })),
  });
  const refreshing = queries.some((query) => query.isFetching);
  const confirmedOrders = queries.filter(
    (query) =>
      query.isSuccess && !query.isError && query.data?.buyerId === user?.id,
  );
  const paidCount = confirmedOrders.filter((query) =>
    ['PAID', 'PACKED', 'IN_TRANSIT', 'DELIVERED'].includes(
      query.data?.status || '',
    ),
  ).length;
  const completeStatus =
    orders.length > 0 &&
    confirmedOrders.length === orders.length &&
    !refreshing &&
    isOnline &&
    isAuthenticated &&
    !isLoading;
  const selectedIndex = orders.findIndex(
    (order) => order.orderId === selection?.orderId,
  );
  const selectedQuery = selectedIndex >= 0 ? queries[selectedIndex] : undefined;
  const selectedOrder = selectedQuery?.data;
  const selectionActive =
    !!selection &&
    selection.buyerId === user?.id &&
    selection.token === token &&
    selection.groupId === result.checkoutGroupId &&
    isOnline &&
    isAuthenticated &&
    !isLoading &&
    !selectedQuery?.isError &&
    !!selectedOrder &&
    selectedOrder.buyerId === user?.id &&
    selectedOrder.status !== 'CANCELLED' &&
    typeof selectedOrder.totalAmount === 'number' &&
    Number.isFinite(selectedOrder.totalAmount) &&
    selectedOrder.totalAmount > 0 &&
    !!selectedOrder.currency?.trim();
  if (selection && !selectionActive) setSelection(null);

  const amount = (value?: number, currency?: string) =>
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    currency?.trim()
      ? `${value.toFixed(2)} ${currency}`
      : t('unknown');
  return (
    <div className="space-y-4" aria-label={t('summary')}>
      <h2 className="text-xl font-semibold" tabIndex={-1} ref={headingRef}>
        {t(orders.length ? 'created' : 'summary')}
      </h2>
      <p>{t('reference', { reference: result.groupNo ?? t('unknown') })}</p>
      <p>
        {t('groupTotal', {
          total: amount(result.totalAmount, result.currency),
        })}
      </p>
      {!isOnline && <p role="status">{t('offline')}</p>}
      {refreshing && <p role="status">{t('refreshing')}</p>}
      {!orders.length ? (
        <p>{t('empty')}</p>
      ) : (
        <>
          <button
            type="button"
            className={control}
            disabled={!isOnline || refreshing || !isAuthenticated || isLoading}
            onClick={() => {
              queries.forEach((query) => {
                void query.refetch();
              });
            }}
          >
            {t('refresh')}
          </button>
          <div
            role="status"
            className="space-y-2"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>
              {t('paymentProgress', { paid: paidCount, total: orders.length })}
            </p>
            <p>
              {t(
                !completeStatus
                  ? 'paymentProgressUnknown'
                  : paidCount === orders.length
                    ? 'groupPaid'
                    : paidCount > 0
                      ? 'groupPartPaid'
                      : 'groupUnpaid',
              )}
            </p>
          </div>
          <h3 className="font-semibold">{t('summary')}</h3>
          <div className="space-y-4">
            {orders.map((order, index) => {
              const query = queries[index];
              const forbidden = [401, 403, 404].includes(
                normalizeApiError(query.error).status,
              );
              const current = query.data;
              const verified =
                !!current &&
                !query.isError &&
                !query.isFetching &&
                isOnline &&
                isAuthenticated &&
                !isLoading;
              const expired = reservationExpired(current);
              const payable =
                verified &&
                current?.status === 'PLACED' &&
                !expired &&
                typeof current.totalAmount === 'number' &&
                Number.isFinite(current.totalAmount) &&
                current.totalAmount > 0 &&
                !!current.currency?.trim();
              return (
                <SellerOrder
                  key={order.orderId ?? index}
                  order={order}
                  current={current}
                  amount={amount}
                  error={
                    query.isError ||
                    !uuid.test(order.orderId ?? '') ||
                    !uuid.test(result.checkoutGroupId ?? '')
                  }
                  forbidden={forbidden}
                  verified={verified}
                  expired={expired}
                  payable={payable}
                  onPay={() => {
                    if (
                      payable &&
                      current?.orderId &&
                      user?.id &&
                      result.checkoutGroupId
                    ) {
                      setSelection({
                        orderId: current.orderId,
                        buyerId: user.id,
                        token,
                        groupId: result.checkoutGroupId,
                      });
                    }
                  }}
                />
              );
            })}
          </div>
        </>
      )}
      {selectionActive && selectedOrder && (
        <ChapaPaymentModal
          isOpen
          onClose={() => setSelection(null)}
          orderId={selectedOrder.orderId}
          amount={selectedOrder.totalAmount!}
          currency={selectedOrder.currency}
          referenceCode={selectedOrder.orderNo}
          onPaymentSuccess={() => {
            // Re-read only the selected order. A callback never marks this group or another seller paid.
            void selectedQuery?.refetch();
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link className={control} to="/account/orders">
          {t('myOrders')}
        </Link>
        <button type="button" className={controlPrimary} onClick={onNewCheckout}>
          {t('newCheckout')}
        </button>
      </div>
    </div>
  );
}
function SellerOrder({
  order,
  current,
  amount,
  error,
  forbidden,
  verified,
  expired,
  payable,
  onPay,
}: {
  order: OrderSummaryResponse;
  current?: OrderDetailResponse;
  amount: (value?: number, currency?: string) => string;
  error: boolean;
  forbidden: boolean;
  verified: boolean;
  expired: boolean;
  payable: boolean;
  onPay: () => void;
}) {
  const t = useCheckoutResultText();
  const id = useId();
  const status = current?.status ?? order.status;
  return (
    <article
      className="space-y-4 break-words rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm"
      aria-labelledby={id}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 id={id} className="text-lg font-bold text-slate-900 dark:text-white">
            {order.enterpriseName ?? t('unknown')}
          </h4>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
            {t('order', { reference: order.orderNo ?? t('unknown') })}
          </p>
        </div>
        {order.orderId && (
          <Link
            className={control}
            to={`/account/orders/${encodeURIComponent(order.orderId)}`}
          >
            {t('viewOrder')}
          </Link>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 py-2">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('total')}</dt>
          <dd className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            {current
              ? amount(current.totalAmount, current.currency)
              : amount(order.totalAmount, order.currency)}
          </dd>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('status')}</dt>
          <dd className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
            {status ? t(status) : t('unknown')}
          </dd>
        </div>
      </dl>

      {error && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{t(forbidden ? 'unavailable' : 'error')}</p>}
      {(status === 'PLACED' || expired) && (
        <ReservationCountdown expired={expired} />
      )}
      <div className="pt-2">
        <button
          type="button"
          className={payable ? controlPrimary : control}
          disabled={!payable}
          onClick={onPay}
          aria-describedby={!payable ? `${id}-payment` : undefined}
        >
          {t('pay', { reference: order.orderNo ?? t('unknown') })}
        </button>
      </div>
      {!payable && (
        <p id={`${id}-payment`} className="text-xs text-slate-500 dark:text-slate-400">
          {t(
            verified && status !== 'PLACED'
              ? 'notPayable'
              : 'paymentUnavailable',
          )}
        </p>
      )}
    </article>
  );
}

export default CheckoutResult;
