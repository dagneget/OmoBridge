import { useOrderScope } from './sessionScope';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { orderService } from './orderService';
import {
  orderAmount,
  orderControl,
  orderScreen,
  useOrdersText,
} from './useOrdersText';

export function OrdersLink() {
  const { text: t } = useOrdersText();
  return (
    <Link className={orderControl} to="/account/orders">
      {t('myOrders')}
    </Link>
  );
}
export function OrdersList() {
  const scope = useOrderScope();
  const { text: t, date } = useOrdersText();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const query = useQuery({
    queryKey: ['buyer-orders', user?.id, scope, 'list'],
    queryFn: async ({ signal }) => {
      const orders = await orderService.list(signal);
      if (
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      return orders;
    },
    enabled: isOnline && isAuthenticated && !isLoading && !!user?.id,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const data = [401, 403].includes(normalizeApiError(query.error).status)
    ? undefined
    : query.data;
  return (
    <section className={orderScreen} aria-labelledby="orders-title">
      <h1
        id="orders-title"
        className="text-2xl font-bold"
        tabIndex={-1}
        ref={heading}
      >
        {t('myOrders')}
      </h1>
      <p>{t('intro')}</p>
      {!isOnline && (
        <p role="status">{t(query.data ? 'offline' : 'offlineEmpty')}</p>
      )}
      {query.isFetching && <p role="status">{t('loading')}</p>}
      {query.isError && isOnline && <p role="alert">{t('error')}</p>}
      <button
        type="button"
        className={orderControl}
        disabled={!isOnline || query.isFetching}
        onClick={() => {
          void query.refetch();
        }}
      >
        {t('refresh')}
      </button>
      {data?.length === 0 && (
        <div className="space-y-3">
          <p>{t('empty')}</p>
          <Link className={orderControl} to="/products">
            {t('browse')}
          </Link>
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="space-y-4">
          {data.map((order) => (
            <li
              key={order.orderId}
              className="space-y-3 break-words rounded-lg border border-slate-300 p-4"
            >
              <h2 className="text-lg font-semibold">
                {t('order', { reference: order.orderNo ?? t('unknown') })}
              </h2>
              <dl className="space-y-2">
                <div>
                  <dt className="font-semibold">{t('seller')}</dt>
                  <dd>{order.enterpriseName ?? t('unknown')}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('status')}</dt>
                  <dd>{order.status ? t(order.status) : t('unknown')}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('total')}</dt>
                  <dd>
                    {orderAmount(order.totalAmount, order.currency) ??
                      t('unknown')}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{t('date')}</dt>
                  <dd>{date(order.createdAt)}</dd>
                </div>
              </dl>
              <Link
                className={orderControl}
                to={`/account/orders/${encodeURIComponent(order.orderId!)}`}
              >
                {t('viewOrder', { reference: order.orderNo ?? t('unknown') })}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
