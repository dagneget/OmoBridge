import RefundDetails from '../payments/RefundDetails';
import { useOrderScope } from './sessionScope';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { PriceBreakdown } from '../../components/pricing';
import type { OrderDetailResponse } from '../../types/api';
import { orderService, validOrderId } from './orderService';
import {
  orderAmount,
  orderControl,
  orderScreen,
  useOrdersText,
} from './useOrdersText';

export function OrderDetail({ id }: { id?: string }) {
  const scope = useOrderScope();
  const { text: t, date } = useOrdersText();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [id]);
  const query = useQuery({
    queryKey: ['buyer-orders', user?.id, scope, 'detail', id],
    queryFn: async ({ signal }) => {
      const order = await orderService.detail(id!, user!.id!, signal);
      if (
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      return order;
    },
    enabled:
      validOrderId(id) &&
      isOnline &&
      isAuthenticated &&
      !isLoading &&
      !!user?.id,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const inaccessible =
    (query.data !== undefined && query.data.buyerId !== user?.id) ||
    !validOrderId(id) ||
    [401, 403, 404].includes(normalizeApiError(query.error).status);
  const order = query.data;
  const visible =
    !inaccessible &&
    (!query.isError || !isOnline) &&
    order?.buyerId === user?.id
      ? order
      : undefined;
  return (
    <section className={orderScreen} aria-labelledby="order-title">
      <h1
        id="order-title"
        className="text-2xl font-bold break-words"
        tabIndex={-1}
        ref={heading}
      >
        {visible
          ? t('order', { reference: visible.orderNo ?? t('unknown') })
          : t('detailTitle')}
      </h1>
      <Link className={orderControl} to="/account/orders">
        {t('back')}
      </Link>
      {inaccessible ? (
        <p role="alert">{t('unavailable')}</p>
      ) : (
        <>
          {!isOnline && (
            <p role="status">{t(visible ? 'offline' : 'offlineEmpty')}</p>
          )}
          {query.isFetching && <p role="status">{t('loadingDetail')}</p>}
          {query.isError && isOnline && <p role="alert">{t('detailError')}</p>}
          <button
            type="button"
            className={orderControl}
            disabled={!isOnline || query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            {t('refreshDetail')}
          </button>
          {visible && (
            <>
              <dl className="space-y-2">
                <div>
                  <dt className="font-semibold">{t('seller')}</dt>
                  <dd>{visible.enterpriseName ?? t('unknown')}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('status')}</dt>
                  <dd>{visible.status ? t(visible.status) : t('unknown')}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('date')}</dt>
                  <dd>{date(visible.createdAt)}</dd>
                </div>
              </dl>
              <section className="space-y-3" aria-labelledby="order-items">
                <h2 id="order-items" className="text-xl font-semibold">
                  {t('items')}
                </h2>
                {!visible.items?.length ? (
                  <p>{t('noItems')}</p>
                ) : (
                  <ul className="space-y-3">
                    {visible.items.map((item, index) => (
                      <li
                        className="space-y-2 break-words rounded-lg border border-slate-300 p-4"
                        key={item.id ?? index}
                      >
                        <h3 className="font-semibold">
                          {item.productName ?? t('unknown')}
                        </h3>
                        <dl className="space-y-2">
                          <div>
                            <dt>{t('sku')}</dt>
                            <dd>{item.productSku ?? t('unknown')}</dd>
                          </div>
                          <div>
                            <dt>{t('unitPrice')}</dt>
                            <dd>
                              {orderAmount(item.unitPrice, visible.currency) ??
                                t('unknown')}
                            </dd>
                          </div>
                          <div>
                            <dt>{t('quantity')}</dt>
                            <dd>
                              {typeof item.quantity === 'number' &&
                              Number.isFinite(item.quantity)
                                ? new Intl.NumberFormat(undefined, {
                                    maximumFractionDigits: 3,
                                  }).format(item.quantity)
                                : t('unknown')}
                            </dd>
                          </div>
                          <div>
                            <dt>{t('lineTotal')}</dt>
                            <dd>
                              {orderAmount(item.lineTotal, visible.currency) ??
                                t('unknown')}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <PriceBreakdown
                kind="order"
                data={visible}
                isOffline={!isOnline}
                title={t('priceBreakdown')}
              />
              <section className="space-y-3" aria-labelledby="order-history">
                <h2 id="order-history" className="text-xl font-semibold">
                  {t('history')}
                </h2>
                {!visible.statusHistories?.length ? (
                  <p>{t('noHistory')}</p>
                ) : (
                  <ol className="space-y-3">
                    {[...visible.statusHistories]
                      .sort(
                        (a, b) =>
                          (Date.parse(a.createdAt ?? '') || 0) -
                          (Date.parse(b.createdAt ?? '') || 0),
                      )
                      .map((event, index) => (
                        <li
                          className="break-words border-l-2 border-emerald-700 pl-4"
                          key={event.id ?? index}
                        >
                          <h3 className="font-semibold">
                            {event.toStatus ? t(event.toStatus) : t('unknown')}
                          </h3>
                          <p>{date(event.createdAt)}</p>
                          {event.reason && <p>{event.reason}</p>}
                        </li>
                      ))}
                  </ol>
                )}
              </section>
              <PaymentStatus
                order={visible}
                enabled={!query.isFetching && !query.isError && isOnline}
              />
              <section className="space-y-3" aria-labelledby="order-delivery">
                <h2 id="order-delivery" className="text-xl font-semibold">
                  {t('delivery')}
                </h2>
                <dl className="space-y-2">
                  <div>
                    <dt className="font-semibold">{t('address')}</dt>
                    <dd className="break-words">
                      {visible.deliveryAddress ?? t('unknown')}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t('phone')}</dt>
                    <dd>{visible.deliveryPhone ?? t('unknown')}</dd>
                  </div>
                  {visible.notes && (
                    <div>
                      <dt className="font-semibold">{t('notes')}</dt>
                      <dd className="break-words">{visible.notes}</dd>
                    </div>
                  )}
                </dl>
              </section>
              <section aria-labelledby="order-tracking" className="space-y-3">
                <h2 id="order-tracking" className="text-xl font-semibold">
                  {t('tracking')}
                </h2>
                <p>{t('trackingUnavailable')}</p>
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
function PaymentStatus({
  order,
  enabled,
}: {
  order: OrderDetailResponse;
  enabled: boolean;
}) {
  const scope = useOrderScope();
  const { text: t } = useOrdersText();
  const { user, token } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const query = useQuery({
    queryKey: ['buyer-orders', user?.id, scope, 'payment', order.orderId],
    queryFn: async ({ signal }) => {
      if (!enabled || !isOnline || user?.id !== order.buyerId)
        throw new Error('Order ownership not verified');
      const payment = await orderService.payment(order, user!.id!, signal);
      if (
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      return payment;
    },
    enabled: enabled && isOnline && !!user?.id && user.id === order.buyerId,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const status = normalizeApiError(query.error).status;
  const payment = !query.isError || !isOnline ? query.data : undefined;
  return (
    <section aria-labelledby="order-payment" className="space-y-3">
      <h2 id="order-payment" className="text-xl font-semibold">
        {t('payment')}
      </h2>
      {query.isFetching && <p role="status">{t('paymentLoading')}</p>}
      {query.isError && isOnline && (
        <p role={status === 404 ? 'status' : 'alert'}>
          {t(status === 404 ? 'paymentMissing' : 'paymentError')}
        </p>
      )}
      {payment && (
        <dl className="space-y-2">
          <div>
            <dt className="font-semibold">{t('payment')}</dt>
            <dd>
              {payment.status ? t(`pay_${payment.status}`) : t('unknown')}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{t('paymentAmount')}</dt>
            <dd>
              {orderAmount(payment.amount, payment.currency) ?? t('unknown')}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{t('paymentReference')}</dt>
            <dd>{payment.paymentNo ?? t('unknown')}</dd>
          </div>
        </dl>
      )}
      {payment?.paymentId && (
        <RefundDetails
          paymentId={payment.paymentId}
          enabled={enabled && !query.isError}
        />
      )}
      {!payment && !query.isFetching && !query.isError && <p>{t('unknown')}</p>}
      <button
        type="button"
        className={orderControl}
        disabled={!enabled || !isOnline || query.isFetching}
        onClick={() => {
          void query.refetch();
        }}
      >
        {t('paymentRetry')}
      </button>
    </section>
  );
}
