import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useAuthStore } from '../auth';
import { getOrderScope, useOrderScope } from '../orders/sessionScope';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { paymentHistoryService, validPaymentId } from './paymentHistoryService';
import { refundService } from './refundService';
import { paymentControl, usePaymentText } from './usePaymentText';
import en from './locales/refunds.en.json';
import am from './locales/refunds.am.json';
i18n.addResourceBundle('en', 'refunds', en, true, true);
i18n.addResourceBundle('am', 'refunds', am, true, true);
interface Props {
  paymentId?: string;
  bookingId?: string;
  enabled?: boolean;
}
export default function RefundDetails(props: Props) {
  const scope = useOrderScope();
  return (
    <RefundContent
      key={`${scope}:${props.paymentId}:${props.bookingId}`}
      {...props}
      scope={scope}
    />
  );
}
function RefundContent({
  paymentId,
  bookingId,
  enabled = true,
  scope,
}: Props & { scope: number }) {
  const { t: translate } = useTranslation('refunds');
  const t = (
    key: keyof typeof en,
    values: Record<string, string | number> = {},
  ) => translate(key, { ...values, fallbackLng: ['am', 'en'] });
  const { date } = usePaymentText();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const [page, setPage] = useState(0);
  const heading = useId();
  const client = useQueryClient();
  useEffect(
    () =>
      useAuthStore.subscribe((next, previous) => {
        if (
          next.token !== previous.token ||
          next.user?.id !== previous.user?.id ||
          !next.isAuthenticated
        ) {
          client.removeQueries({
            queryKey: ['buyer-payments', previous.user?.id],
            predicate: (query) => query.queryKey[2] !== getOrderScope(),
          });
        }
      }),
    [client],
  );
  const targetValid =
    Boolean(paymentId) !== Boolean(bookingId) &&
    validPaymentId(paymentId || bookingId);
  const query = useQuery({
    queryKey: [
      'buyer-payments',
      user?.id,
      scope,
      'refunds',
      paymentId,
      bookingId,
      page,
    ],
    queryFn: async ({ signal }) => {
      const resolvedId =
        paymentId ||
        (await paymentHistoryService.booking(bookingId!, signal)).paymentId!;
      if (
        signal.aborted ||
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      const summary = await refundService.get(resolvedId, page, signal);
      if (
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      return summary;
    },
    enabled:
      targetValid &&
      enabled &&
      isOnline &&
      isAuthenticated &&
      !isLoading &&
      !!user?.id,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  if (!targetValid || !isAuthenticated || isLoading || !user?.id) return null;
  const data = query.isError ? undefined : query.data;
  const errorStatus = normalizeApiError(query.error).status;
  return (
    <section
      className="space-y-3 break-words rounded-lg border border-slate-300 p-4 text-slate-900 dark:text-slate-100"
      aria-labelledby={heading}
    >
      <h3 id={heading} className="text-lg font-semibold">
        {t('title')}
      </h3>
      {!isOnline && <p role="status">{t('offline')}</p>}
      {query.isFetching && <p role="status">{t('loading')}</p>}
      {query.isError && (
        <p role={errorStatus === 404 ? 'status' : 'alert'}>
          {t([401, 403, 404].includes(errorStatus) ? 'unavailable' : 'error')}
        </p>
      )}
      <button
        className={`${paymentControl} no-print`}
        disabled={!enabled || !isOnline || query.isFetching}
        onClick={() => {
          void query.refetch();
        }}
      >
        {t('refresh')}
      </button>
      {data && (
        <>
          <p className="font-semibold" role="status">
            {t(data.coverage!)}
          </p>
          <dl className="space-y-2">
            <div>
              <dt className="font-semibold">{t('paymentAmount')}</dt>
              <dd>
                {data.paymentAmount!.toFixed(2)} {data.currency}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">{t('completed')}</dt>
              <dd>
                {data.completedRefundAmount!.toFixed(2)} {data.currency}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">{t('notRefunded')}</dt>
              <dd>
                {data.notRefundedAmount!.toFixed(2)} {data.currency}
              </dd>
            </div>
          </dl>
          <p>{t('note')}</p>
          {!data.refunds!.content!.length ? (
            <p>{t('empty')}</p>
          ) : (
            <ul className="space-y-3">
              {data.refunds!.content!.map((refund) => (
                <li
                  key={refund.refundId}
                  className="space-y-2 rounded border border-slate-300 p-3"
                >
                  <dl className="space-y-2">
                    <div>
                      <dt className="font-semibold">{t('reference')}</dt>
                      <dd>{refund.refundNo}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">{t('amount')}</dt>
                      <dd>
                        {refund.amount!.toFixed(2)} {refund.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">{t('status')}</dt>
                      <dd>{t(refund.status!)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">{t('date')}</dt>
                      <dd>{date(refund.createdAt!)}</dd>
                    </div>
                    {refund.reason && (
                      <div>
                        <dt className="font-semibold">{t('reason')}</dt>
                        <dd>{refund.reason}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3 no-print">
            <button
              className={paymentControl}
              disabled={
                !enabled ||
                !isOnline ||
                query.isFetching ||
                data.refunds!.isFirst
              }
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              {t('previous')}
            </button>
            <span>
              {t('page', {
                page: page + 1,
                total: data.refunds!.totalPages || 1,
              })}
            </span>
            <button
              className={paymentControl}
              disabled={
                !enabled ||
                !isOnline ||
                query.isFetching ||
                data.refunds!.isLast
              }
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
