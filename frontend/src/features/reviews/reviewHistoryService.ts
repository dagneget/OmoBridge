import httpClient from '../../services/httpClient';
import type { ReviewResponse, Schemas } from '../../types/api';
import { validReviewId } from './reviewService';
export type ReviewPage = Schemas['PageResponseReviewResponse'];
function ownRecord(review: ReviewResponse, buyerId: string) {
  return (
    !!review &&
    validReviewId(review.id) &&
    review.reviewerUserId === buyerId &&
    validReviewId(review.targetId) &&
    !!review.targetType &&
    ['PRODUCT', 'EXPERIENCE', 'GUIDE', 'ENTERPRISE'].includes(
      review.targetType,
    ) &&
    Number.isInteger(review.rating) &&
    review.rating! >= 1 &&
    review.rating! <= 5 &&
    typeof review.createdAt === 'string' &&
    Number.isFinite(Date.parse(review.createdAt)) &&
    (review.comment === undefined ||
      review.comment === null ||
      typeof review.comment === 'string')
  );
}
export const reviewHistoryService = {
  async list(
    buyerId: string,
    page = 0,
    signal?: AbortSignal,
  ): Promise<ReviewPage> {
    if (!validReviewId(buyerId) || !Number.isSafeInteger(page) || page < 0)
      throw new Error('Invalid review page');
    const { data } = await httpClient.get<
      Schemas['ApiResponsePageResponseReviewResponse']
    >('/api/v1/reviews/my', { params: { page, size: 20 }, signal });
    const result = data.data;
    if (
      data.success !== true ||
      !result ||
      !Array.isArray(result.content) ||
      result.content.length > 20 ||
      result.content.some((review) => !ownRecord(review, buyerId)) ||
      new Set(result.content.map((review) => review.id)).size !==
        result.content.length ||
      result.pageNumber !== page ||
      result.pageSize !== 20 ||
      !Number.isSafeInteger(result.totalElements) ||
      result.totalElements! < result.content.length ||
      !Number.isSafeInteger(result.totalPages) ||
      result.totalPages !== Math.ceil(result.totalElements! / 20) ||
      result.isFirst !== (page === 0) ||
      result.isLast !== page + 1 >= result.totalPages!
    )
      throw new Error('Invalid review history');
    return result;
  },
};
