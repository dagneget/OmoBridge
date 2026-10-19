import { useEffect, useId, useRef, useState } from 'react';
import { useAuthStore } from '../auth';
import { getOrderScope, useOrderScope } from '../orders/sessionScope';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import type { CreateReviewRequest } from '../../types/api';
import { reviewService, validReviewId } from './reviewService';
import { reviewControl, useReviewsText } from './useReviewsText';

export interface ReviewTarget {
  type: CreateReviewRequest['targetType'];
  id: string;
  name?: string;
}
interface Props {
  target: ReviewTarget;
  buyerId: string;
  orderId?: string;
  bookingId?: string;
  enabled: boolean;
}
export default function ReviewForm(props: Props) {
  const scope = useOrderScope();
  return (
    <FormContent
      key={`${scope}:${props.orderId}:${props.bookingId}:${props.target.type}:${props.target.id}`}
      {...props}
      scope={scope}
    />
  );
}
function FormContent({
  target,
  buyerId,
  orderId,
  bookingId,
  enabled,
  scope,
}: Props & { scope: number }) {
  const t = useReviewsText();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const id = useId();
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<
    | 'idle'
    | 'sending'
    | 'success'
    | 'duplicate'
    | 'ineligible'
    | 'unavailable'
    | 'uncertain'
    | 'invalid'
  >('idle');
  const active = useRef<AbortController | null>(null);
  const message = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!['idle', 'sending'].includes(state)) message.current?.focus();
  }, [state]);
  const own =
    isAuthenticated &&
    !isLoading &&
    !!token &&
    user?.id === buyerId &&
    validReviewId(buyerId);
  const canSend =
    own &&
    enabled &&
    isOnline &&
    !['sending', 'success', 'duplicate', 'ineligible', 'unavailable'].includes(
      state,
    );
  const current = () =>
    getOrderScope() === scope &&
    useAuthStore.getState().token === token &&
    useAuthStore.getState().user?.id === buyerId;
  if (!own || !validReviewId(target.id)) return null;
  const terminal = [
    'success',
    'duplicate',
    'ineligible',
    'unavailable',
  ].includes(state);
  return (
    <section
      className="space-y-3 break-words rounded-lg border border-slate-300 p-4"
      aria-labelledby={`${id}-title`}
    >
      <h3 id={`${id}-title`} className="font-semibold">
        {t('item', { name: target.name || t('unknown') })}
      </h3>
      {state !== 'idle' && (
        <p
          ref={message}
          tabIndex={-1}
          role={
            ['invalid', 'ineligible', 'unavailable', 'uncertain'].includes(
              state,
            )
              ? 'alert'
              : 'status'
          }
        >
          {t(state)}
        </p>
      )}
      {!isOnline && <p role="status">{t('offline')}</p>}
      {!terminal && (
        <form
          className="space-y-3"
          aria-labelledby={`${id}-title`}
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSend || active.current || !current() || !navigator.onLine)
              return;
            const value = Number(rating);
            if (
              !Number.isInteger(value) ||
              value < 1 ||
              value > 5 ||
              comment.length > 2000
            ) {
              setState('invalid');
              return;
            }
            const controller = new AbortController();
            active.current = controller;
            setState('sending');
            const timeout = window.setTimeout(() => controller.abort(), 25000);
            try {
              await reviewService.createReview(
                {
                  targetType: target.type,
                  targetId: target.id,
                  ...(orderId ? { orderId } : { bookingId }),
                  rating: value,
                  ...(comment.trim() ? { comment: comment.trim() } : {}),
                },
                buyerId,
                controller.signal,
              );
              if (current() && !controller.signal.aborted) {
                setComment('');
                setState('success');
              } else if (current()) setState('uncertain');
            } catch (error) {
              if (!current()) return;
              const status = normalizeApiError(error).status;
              setState(
                status === 409
                  ? 'duplicate'
                  : status === 422
                    ? 'ineligible'
                    : [401, 403, 404].includes(status)
                      ? 'unavailable'
                      : 'uncertain',
              );
            } finally {
              window.clearTimeout(timeout);
              if (active.current === controller) active.current = null;
            }
          }}
        >
          <fieldset
            disabled={!enabled || !isOnline || state === 'sending'}
            className="space-y-3"
          >
            <div className="space-y-1">
              <label className="block font-medium" htmlFor={`${id}-rating`}>
                {t('rating')}
              </label>
              <select
                id={`${id}-rating`}
                className={`${reviewControl} w-full`}
                required
                value={rating}
                onChange={(event) => setRating(event.target.value)}
              >
                <option value="">{t('choose')}</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {t('stars', { count: value })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block font-medium" htmlFor={`${id}-comment`}>
                {t('comment')}
              </label>
              <textarea
                id={`${id}-comment`}
                className={`${reviewControl} w-full`}
                rows={4}
                maxLength={2000}
                aria-describedby={`${id}-limit`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <p id={`${id}-limit`} className="text-sm">
                {t('limit')}
              </p>
            </div>
            <button type="submit" className={reviewControl} disabled={!canSend}>
              {t(state === 'sending' ? 'sending' : 'submit')}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
