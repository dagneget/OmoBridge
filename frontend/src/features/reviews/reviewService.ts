import httpClient from '../../services/httpClient';
import type {
  CreateReviewRequest,
  ReviewResponse,
  ReviewSummaryResponse,
  StandardApiResponse,
} from '../../types/api';

export const validReviewId = (value?: string): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const reviewService = {
  /**
   * Fetch recent verified testimonials for public display
   */
  async getTestimonials(): Promise<ReviewResponse[]> {
    const response = await httpClient.get<
      StandardApiResponse<ReviewResponse[]>
    >('/api/v1/reviews/public/testimonials');
    return response.data.data || [];
  },

  /**
   * Fetch reviews and rating breakdown for a target product, experience, guide, or enterprise
   */
  async getTargetReviews(
    targetType: string,
    targetId: string,
  ): Promise<ReviewSummaryResponse> {
    const response = await httpClient.get<
      StandardApiResponse<ReviewSummaryResponse>
    >('/api/v1/reviews/public/target', {
      params: { targetType, targetId },
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Target reviews not found');
    }
    return response.data.data;
  },

  /**
   * Submit a verified review following a completed experience or order
   */
  async createReview(
    payload: CreateReviewRequest,
    buyerId: string,
    signal?: AbortSignal,
  ): Promise<ReviewResponse> {
    if (
      !validReviewId(buyerId) ||
      !validReviewId(payload.targetId) ||
      !['PRODUCT', 'EXPERIENCE', 'ENTERPRISE', 'GUIDE'].includes(
        payload.targetType,
      ) ||
      Boolean(payload.orderId) === Boolean(payload.bookingId) ||
      !validReviewId(payload.orderId || payload.bookingId) ||
      !Number.isInteger(payload.rating) ||
      payload.rating! < 1 ||
      payload.rating! > 5 ||
      (payload.comment !== undefined &&
        (typeof payload.comment !== 'string' || payload.comment.length > 2000))
    )
      throw new Error('Invalid review request');
    const response = await httpClient.post<StandardApiResponse<ReviewResponse>>(
      '/api/v1/reviews',
      payload,
      { signal },
    );
    const review = response.data.data;
    if (
      response.data.success !== true ||
      !review ||
      !validReviewId(review.id) ||
      review.reviewerUserId !== buyerId ||
      review.targetType !== payload.targetType ||
      review.targetId !== payload.targetId ||
      review.rating !== payload.rating ||
      !review.createdAt ||
      !Number.isFinite(Date.parse(review.createdAt))
    )
      throw new Error('Invalid review confirmation');
    return review;
  },
};

export default reviewService;
