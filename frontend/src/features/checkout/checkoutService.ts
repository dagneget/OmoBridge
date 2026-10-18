import { httpClient } from '../../services/httpClient';
import type {
  CheckoutRequest,
  CheckoutResponse,
  Schemas,
} from '../../types/api';

export const checkoutService = {
  async submit(payload: CheckoutRequest): Promise<CheckoutResponse> {
    const { data: envelope } = await httpClient.post<
      Schemas['ApiResponseCheckoutResponse']
    >('/api/v1/checkout', payload);
    const result = envelope.data;
    // A malformed success is ambiguous: keep the same key for a safe retry.
    if (
      envelope.success !== true ||
      !result?.checkoutGroupId ||
      !result.groupNo ||
      !result.status ||
      !result.currency?.trim() ||
      !Number.isFinite(result.totalAmount) ||
      result.totalAmount! < 0 ||
      !result.orders?.length ||
      result.orders.some(
        (order) =>
          !order.orderId ||
          !order.orderNo ||
          !order.enterpriseId ||
          !order.currency ||
          !Number.isFinite(order.totalAmount) ||
          order.totalAmount! < 0,
      )
    ) {
      throw new Error('Incomplete checkout response');
    }
    return result;
  },
};
