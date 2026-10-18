import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../auth';
import { useOrderScope } from '../orders/sessionScope';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { reviewHistoryService } from './reviewHistoryService';
import { validReviewId } from './reviewService';
import { reviewControl, useReviewsText } from './useReviewsText';
export default function MyReviews() {
  const scope = useOrderScope();
  return <ReviewsContent key={scope} scope={scope} />;
}
function ReviewsContent({ scope }: { scope: number }) {
  const t = useReviewsText();
  const { i18n } = useTranslation();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const [page, setPage] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const query = useQuery({
    queryKey: ['buyer-reviews', user?.id, scope, 'list', page],
    queryFn: async ({ signal }) => {
      const result = await reviewHistoryService.list(user!.id!, page, signal);
      if (
        signal.aborted ||
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      return result;
    },
    enabled:
      isOnline &&
      isAuthenticated &&
      !isLoading &&
      !!token &&
      validReviewId(user?.id),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  if (!isAuthenticated || isLoading) return null;
  const data = query.isError ? undefined : query.data;
  return (
    <section
      className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-slate-900 dark:text-slate-100"
      aria-labelledby="my-reviews-title"
    >
      <h1
        id="my-reviews-title"
        className="scroll-mt-24 text-2xl font-bold"
        tabIndex={-1}
        ref={heading}
      >
        {t('history')}
      </h1>
      <Link className={reviewControl} to="/account">
        {t('back')}
      </Link>
      <p>{t('intro')}</p>
      {!isOnline && <p role="status">{t('historyOffline')}</p>}
      {query.isFetching && <p role="status">{t('historyLoading')}</p>}
      {query.isError && (
        <p role="alert">
          {t(
            [401, 403, 404].includes(normalizeApiError(query.error).status)
              ? 'historyUnavailable'
              : 'historyError',
          )}
        </p>
      )}
      <button
        type="button"
        className={reviewControl}
        disabled={!isOnline || query.isFetching || !validReviewId(user?.id)}
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
              {data.content.map((review) => (
                <li
                  key={review.id}
                  className="space-y-2 break-words rounded-lg border border-slate-300 p-4"
                >
                  <h2 className="text-lg font-semibold">
                    {t(review.targetType!)}
                  </h2>
                  <p>{t('stars', { count: review.rating! })}</p>
                  <p className="whitespace-pre-wrap break-words">
                    {review.comment?.trim() || t('noComment')}
                  </p>
                  <dl className="space-y-2">
                    <div>
                      <dt className="font-semibold">{t('created')}</dt>
                      <dd>
                        {new Intl.DateTimeFormat(
                          i18n.resolvedLanguage || 'en',
                          { dateStyle: 'medium', timeStyle: 'short' },
                        ).format(new Date(review.createdAt!))}
                      </dd>
                    </div>
                  </dl>
                  {['PRODUCT', 'EXPERIENCE'].includes(review.targetType!) && (
                    <Link
                      className={`${reviewControl} inline-flex items-center`}
                      to={`/${review.targetType === 'PRODUCT' ? 'products' : 'tourism'}/${review.targetId}`}
                    >
                      {t(
                        review.targetType === 'PRODUCT'
                          ? 'viewProduct'
                          : 'viewExperience',
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <nav
            className="flex flex-wrap items-center gap-3"
            aria-label={t('history')}
          >
            <button
              type="button"
              className={reviewControl}
              disabled={!isOnline || query.isFetching || data.isFirst}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              {t('previous')}
            </button>
            <span aria-live="polite">
              {t('page', { page: page + 1, total: data.totalPages || 1 })}
            </span>
            <button
              type="button"
              className={reviewControl}
              disabled={!isOnline || query.isFetching || data.isLast}
              onClick={() => setPage((value) => value + 1)}
            >
              {t('next')}
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
