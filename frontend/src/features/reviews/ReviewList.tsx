import { useId } from 'react';
import ReviewForm, { type ReviewTarget } from './ReviewForm';
import { validReviewId } from './reviewService';
import { useReviewsText } from './useReviewsText';

export default function ReviewList({
  targets,
  buyerId,
  orderId,
  bookingId,
  enabled,
}: {
  targets: ReviewTarget[];
  buyerId: string;
  orderId?: string;
  bookingId?: string;
  enabled: boolean;
}) {
  const t = useReviewsText();
  const heading = useId();
  const distinct = targets.filter(
    (target, index) =>
      validReviewId(target.id) &&
      targets.findIndex(
        (other) => other.type === target.type && other.id === target.id,
      ) === index,
  );
  if (!distinct.length) return null;
  return (
    <section aria-labelledby={heading} className="space-y-4 no-print">
      <h2 id={heading} className="text-xl font-semibold">
        {t('title')}
      </h2>
      {distinct.map((target) => (
        <ReviewForm
          key={`${target.type}:${target.id}`}
          target={target}
          buyerId={buyerId}
          orderId={orderId}
          bookingId={bookingId}
          enabled={enabled}
        />
      ))}
    </section>
  );
}
