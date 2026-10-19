import { useQueries } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { TelebirrPaymentModal } from '../payments';
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
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100';
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
        <TelebirrPaymentModal
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
      <Link className={control} to="/account/orders">
        {t('myOrders')}
      </Link>
      <button type="button" className={control} onClick={onNewCheckout}>
        {t('newCheckout')}
      </button>
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
      className="space-y-3 break-words rounded-lg border border-slate-300 p-4"
      aria-labelledby={id}
    >
      <h4 id={id} className="text-lg font-semibold">
        {order.enterpriseName ?? t('unknown')}
      </h4>
      <p>{t('order', { reference: order.orderNo ?? t('unknown') })}</p>
      {order.orderId && (
        <Link
          className={control}
          to={`/account/orders/${encodeURIComponent(order.orderId)}`}
        >
          {t('viewOrder')}
        </Link>
      )}
      <dl className="space-y-2">
        <div>
          <dt className="font-semibold">{t('total')}</dt>
          <dd>
            {current
              ? amount(current.totalAmount, current.currency)
              : amount(order.totalAmount, order.currency)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">{t('status')}</dt>
          <dd>{status ? t(status) : t('unknown')}</dd>
        </div>
      </dl>
      {error && <p role="alert">{t(forbidden ? 'unavailable' : 'error')}</p>}
      {(status === 'PLACED' || expired) && (
        <ReservationCountdown expired={expired} />
      )}
      <button
        type="button"
        className={control}
        disabled={!payable}
        onClick={onPay}
        aria-describedby={!payable ? `${id}-payment` : undefined}
      >
        {t('pay', { reference: order.orderNo ?? t('unknown') })}
      </button>
      {!payable && (
        <p id={`${id}-payment`} className="text-sm">
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
