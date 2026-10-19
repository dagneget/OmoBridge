import { useAuthStore } from '../auth';
import type { OrderDetailResponse } from '../../types/api';
import ReviewList from './ReviewList';
import { validReviewId } from './reviewService';

export default function OrderReviews({
  order,
  enabled,
}: {
  order: OrderDetailResponse;
  enabled: boolean;
}) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (
    !isAuthenticated ||
    isLoading ||
    order.buyerId !== user?.id ||
    !validReviewId(order.orderId) ||
    !validReviewId(order.buyerId) ||
    order.status !== 'DELIVERED'
  )
    return null;
  return (
    <ReviewList
      buyerId={order.buyerId}
      orderId={order.orderId}
      enabled={enabled}
      targets={(order.items || [])
        .filter((item) => validReviewId(item.productId))
        .map((item) => ({
          type: 'PRODUCT',
          id: item.productId!,
          name: item.productName,
        }))}
    />
  );
}
