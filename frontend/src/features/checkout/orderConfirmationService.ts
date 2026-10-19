import { httpClient } from '../../services/httpClient';
import type { OrderDetailResponse, Schemas } from '../../types/api';

const statuses = new Set<OrderDetailResponse['status']>([
  'PLACED',
  'PAID',
  'PACKED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
]);
export const orderConfirmationService = {
  async get(
    orderId: string,
    signal?: AbortSignal,
  ): Promise<OrderDetailResponse> {
    const { data } = await httpClient.get<
      Schemas['ApiResponseOrderDetailResponse']
    >(`/api/v1/orders/${encodeURIComponent(orderId)}`, { signal });
    if (
      data.success !== true ||
      !data.data ||
      data.data.orderId !== orderId ||
      !data.data.status ||
      !statuses.has(data.data.status) ||
      !data.data.checkoutGroupId ||
      !data.data.enterpriseId ||
      !data.data.buyerId
    ) {
      throw new Error('Incomplete order confirmation');
    }
    return data.data;
  },
};
