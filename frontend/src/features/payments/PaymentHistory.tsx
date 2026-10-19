import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth';
import { useOrderScope } from '../orders/sessionScope';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { paymentHistoryService } from './paymentHistoryService';
import {
  paymentControl,
  paymentScreen,
  usePaymentText,
} from './usePaymentText';

export default function PaymentHistory() {
  const scope = useOrderScope();
  return <HistoryContent key={scope} scope={scope} />;
}
function HistoryContent({ scope }: { scope: number }) {
  const { t, date } = usePaymentText();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const [page, setPage] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const query = useQuery({
    queryKey: ['buyer-payments', user?.id, scope, 'list', page],
    queryFn: async ({ signal }) => {
      const result = await paymentHistoryService.list(page, signal);
      if (
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      return result;
    },
    enabled: isOnline && isAuthenticated && !isLoading && !!user?.id,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  const data = query.isError ? undefined : query.data;
  return (
    <section className={paymentScreen} aria-labelledby="payment-history-title">
      <h1
        id="payment-history-title"
        className="text-2xl font-bold"
        tabIndex={-1}
        ref={heading}
      >
        {t('history')}
      </h1>
      <p>{t('intro')}</p>
      {!isOnline && <p role="status">{t('offline')}</p>}
      {query.isFetching && <p role="status">{t('loading')}</p>}
      {query.isError && (
        <p role="alert">
          {t(
            [401, 403, 404].includes(normalizeApiError(query.error).status)
              ? 'unavailable'
              : 'error',
          )}
        </p>
      )}
      <button
        className={paymentControl}
        disabled={
          !isOnline || query.isFetching || !isAuthenticated || isLoading
        }
        onClick={() => {
          void query.refetch();
        }}
      >
        {t('refresh')}
      </button>
      {data && (
        <>
          {!data.content?.length ? (
            <p>{t('empty')}</p>
          ) : (
            <ul className="space-y-4">
              {data.content.map((payment) => (
                <li
                  key={payment.paymentId}
                  className="space-y-2 break-words rounded-lg border border-slate-300 p-4"
                >
                  <h2 className="text-lg font-semibold">{payment.paymentNo}</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="font-semibold">{t('amount')}</dt>
                      <dd>
                        {payment.amount!.toFixed(2)} {payment.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">{t('status')}</dt>
                      <dd>{t(payment.status!)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">{t('created')}</dt>
                      <dd>{date(payment.createdAt!)}</dd>
                    </div>
                  </dl>
                  <Link
                    className={paymentControl}
                    to={`/account/payments/${payment.paymentId}`}
                  >
                    {t('view', { reference: payment.paymentNo! })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div
            className="flex flex-wrap items-center gap-3 no-print"
            aria-label={t('history')}
          >
            <button
              className={paymentControl}
              disabled={!isOnline || query.isFetching || data.isFirst}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              {t('previous')}
            </button>
            <span>
              {t('page', { page: page + 1, total: data.totalPages || 1 })}
            </span>
            <button
              className={paymentControl}
              disabled={!isOnline || query.isFetching || data.isLast}
              onClick={() => setPage((value) => value + 1)}
            >
              {t('next')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
