import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../auth';
import { useOrderScope } from '../orders/sessionScope';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { paymentHistoryService, validPaymentId } from './paymentHistoryService';
import {
  paymentControl,
  paymentScreen,
  usePaymentText,
} from './usePaymentText';
export default function PaymentRecord() {
  const { id } = useParams();
  const scope = useOrderScope();
  const { t, date } = usePaymentText();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [id]);
  const query = useQuery({
    queryKey: ['buyer-payments', user?.id, scope, 'record', id],
    queryFn: async ({ signal }) => {
      const result = await paymentHistoryService.get(id!, signal);
      if (
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      return result;
    },
    enabled:
      validPaymentId(id) &&
      isOnline &&
      isAuthenticated &&
      !isLoading &&
      !!user?.id,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  const data = query.isError ? undefined : query.data;
  const settled = data?.status === 'HELD' || data?.status === 'RELEASED';
  const unavailable =
    !validPaymentId(id) ||
    [401, 403, 404].includes(normalizeApiError(query.error).status);
  return (
    <section
      className={`${paymentScreen} printable-slip`}
      aria-labelledby="payment-record-title"
    >
      <h1
        id="payment-record-title"
        className="text-2xl font-bold"
        tabIndex={-1}
        ref={heading}
      >
        {t(settled ? 'receipt' : 'record')}
      </h1>
      <Link className={`${paymentControl} no-print`} to="/account/payments">
        {t('back')}
      </Link>
      {!isOnline && <p role="status">{t('offline')}</p>}
      {query.isFetching && <p role="status">{t('loading')}</p>}
      {(query.isError || !validPaymentId(id)) && (
        <p role="alert">{t(unavailable ? 'unavailable' : 'error')}</p>
      )}
      <button
        className={`${paymentControl} no-print`}
        disabled={
          !validPaymentId(id) ||
          !isOnline ||
          query.isFetching ||
          !isAuthenticated ||
          isLoading
        }
        onClick={() => {
          void query.refetch();
        }}
      >
        {t('refresh')}
      </button>
      {data && (
        <>
          <p>{t(settled ? 'settled' : 'unsettled')}</p>
          <dl className="space-y-3 break-words">
            <div>
              <dt className="font-semibold">{t('reference')}</dt>
              <dd>{data.paymentNo}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t('amount')}</dt>
              <dd>
                {data.amount!.toFixed(2)} {data.currency}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">{t('status')}</dt>
              <dd>{t(data.status!)}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t('created')}</dt>
              <dd>{date(data.createdAt!)}</dd>
            </div>
          </dl>
          {data.orderId && (
            <Link
              className={paymentControl}
              to={`/account/orders/${data.orderId}`}
            >
              {t('order', { reference: data.orderNo || data.orderId })}
            </Link>
          )}
          {data.bookingId && (
            <Link
              className={paymentControl}
              to={`/booking/confirmation/${data.bookingId}`}
            >
              {t('booking', { reference: data.bookingCode || data.bookingId })}
            </Link>
          )}
          <button
            className={`${paymentControl} no-print`}
            disabled={
              !settled || !isOnline || query.isFetching || query.isError
            }
            onClick={() => window.print()}
          >
            {t('print')}
          </button>
        </>
      )}
    </section>
  );
}
