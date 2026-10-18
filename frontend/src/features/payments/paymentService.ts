import httpClient from '../../services/httpClient';
import type {
  CreatePaymentAttemptRequest,
  PaymentAttemptResponse,
  PaymentResponse,
  StandardApiResponse,
} from '../../types/api';

export const paymentService = {
  /**
   * Start an idempotent payment attempt for an order or booking
   */
  async createAttempt(
    payload: CreatePaymentAttemptRequest
  ): Promise<PaymentAttemptResponse> {
    const response = await httpClient.post<StandardApiResponse<PaymentAttemptResponse>>(
      '/api/v1/payments/attempt',
      payload
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Payment attempt failed');
    }
    return response.data.data;
  },

  /**
   * Fetch payment record for an order
   */
  async getPaymentByOrderId(orderId: string): Promise<PaymentResponse> {
    const response = await httpClient.get<StandardApiResponse<PaymentResponse>>(
      `/api/v1/payments/order/${orderId}`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Payment record not found');
    }
    return response.data.data;
  },
};

export default paymentService;
