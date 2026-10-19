import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth';
import { useOrderScope } from '../orders/sessionScope';
import { bookingService } from '../bookings/bookingService';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { BookingResponse } from '../../types/api';
import type { ReviewTarget } from './ReviewForm';
import ReviewList from './ReviewList';
import { validReviewId } from './reviewService';
import { reviewControl, useReviewsText } from './useReviewsText';

export default function BookingReviews({ bookingId }: { bookingId?: string }) {
  const scope = useOrderScope();
  return (
    <BookingReviewContent
      key={`${scope}:${bookingId}`}
      bookingId={bookingId}
      scope={scope}
    />
  );
}
function BookingReviewContent({
  bookingId,
  scope,
}: {
  bookingId?: string;
  scope: number;
}) {
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const t = useReviewsText();
  const query = useQuery({
    queryKey: ['buyer-reviews', user?.id, scope, 'booking', bookingId],
    queryFn: async ({ signal }) => {
      const booking = await bookingService.getBookingById(bookingId!, signal);
      if (
        signal.aborted ||
        useAuthStore.getState().token !== token ||
        useAuthStore.getState().user?.id !== user?.id
      )
        throw new Error('Session changed');
      if (
        booking.id !== bookingId ||
        booking.buyerId !== user?.id ||
        !Array.isArray(booking.items) ||
        booking.items.some((item) => !item || typeof item !== 'object')
      )
        throw new Error('Invalid booking confirmation');
      return booking;
    },
    enabled:
      validReviewId(bookingId) &&
      validReviewId(user?.id) &&
      !!token &&
      isAuthenticated &&
      !isLoading &&
      isOnline,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  if (
    !isAuthenticated ||
    isLoading ||
    !validReviewId(user?.id) ||
    !validReviewId(bookingId)
  )
    return null;
  if (!isOnline)
    return (
      <p role="status" className="no-print">
        {t('offline')}
      </p>
    );
  if (query.isPending || query.isFetching)
    return (
      <p role="status" className="no-print">
        {t('loading')}
      </p>
    );
  if (query.isError)
    return (
      <div className="space-y-3 no-print">
        <p role="alert">{t('verifyError')}</p>
        <button
          type="button"
          className={reviewControl}
          onClick={() => {
            void query.refetch();
          }}
        >
          {t('retry')}
        </button>
      </div>
    );
  const booking = query.data;
  if (booking?.status !== 'COMPLETED' || booking.buyerId !== user.id)
    return null;
  return (
    <ReviewList
      buyerId={user.id}
      bookingId={bookingId}
      enabled={true}
      targets={bookingTargets(booking)}
    />
  );
}
function bookingTargets(booking: BookingResponse): ReviewTarget[] {
  const targets: ReviewTarget[] = (booking.items || [])
    .filter(
      (item) =>
        ['PACKAGE', 'GUIDE'].includes(item.itemType || '') &&
        validReviewId(item.itemId),
    )
    .map((item) => ({
      type: item.itemType === 'GUIDE' ? 'GUIDE' : 'EXPERIENCE',
      id: item.itemId!,
      name: item.itemNameSnapshot,
    }));
  if (validReviewId(booking.assignedGuideId))
    targets.push({
      type: 'GUIDE',
      id: booking.assignedGuideId,
      name: booking.assignedGuideName,
    });
  return targets;
}
