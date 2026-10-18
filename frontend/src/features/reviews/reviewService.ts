import httpClient from '../../services/httpClient';
import type {
  CreateReviewRequest,
  ReviewResponse,
  ReviewSummaryResponse,
  StandardApiResponse,
} from '../../types/api';

export const reviewService = {
  /**
   * Fetch recent verified testimonials for public display
   */
  async getTestimonials(): Promise<ReviewResponse[]> {
    const response = await httpClient.get<StandardApiResponse<ReviewResponse[]>>(
      '/api/v1/reviews/public/testimonials'
    );
    return response.data.data || [];
  },

  /**
   * Fetch reviews and rating breakdown for a target product, experience, guide, or enterprise
   */
  async getTargetReviews(targetType: string, targetId: string): Promise<ReviewSummaryResponse> {
    const response = await httpClient.get<StandardApiResponse<ReviewSummaryResponse>>(
      '/api/v1/reviews/public/target',
      {
        params: { targetType, targetId },
      }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Target reviews not found');
    }
    return response.data.data;
  },

  /**
   * Submit a verified review following a completed experience or order
   */
  async createReview(payload: CreateReviewRequest): Promise<ReviewResponse> {
    const response = await httpClient.post<StandardApiResponse<ReviewResponse>>(
      '/api/v1/reviews',
      payload
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to submit review');
    }
    return response.data.data;
  },
};

export default reviewService;
