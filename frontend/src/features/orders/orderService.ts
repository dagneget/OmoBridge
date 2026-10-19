import { httpClient } from '../../services/httpClient';
import { NormalizedApiError } from '../../services/apiError';
import type {
  OrderDetailResponse,
  OrderSummaryResponse,
  PaymentResponse,
  Schemas,
} from '../../types/api';

export const validOrderId = (id?: string): id is string =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const orderStatuses = new Set<OrderSummaryResponse['status']>([
  'PLACED',
  'PAID',
  'PACKED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
]);
const paymentStatuses = new Set<PaymentResponse['status']>([
  'PENDING',
  'HELD',
  'RELEASED',
  'REFUNDED',
  'FAILED',
]);
const unavailable = () =>
  new NormalizedApiError({ status: 404, message: 'Order unavailable' });
function checkedDetail(
  data: Schemas['ApiResponseOrderDetailResponse'],
  orderId: string,
  buyerId: string,
): OrderDetailResponse {
  const order = data.data;
  // Fail closed before any private fields or dependent payment lookup reach the screen.
  if (
    order?.orderId?.toLowerCase() !== orderId.toLowerCase() ||
    order.buyerId !== buyerId
  )
    throw unavailable();
  if (
    data.success !== true ||
    !order.status ||
    !orderStatuses.has(order.status) ||
    (order.items !== undefined &&
      (!Array.isArray(order.items) || order.items.some((item) => !item))) ||
    (order.statusHistories !== undefined &&
      (!Array.isArray(order.statusHistories) ||
        order.statusHistories.some((event) => !event)))
  )
    throw new Error('Invalid order detail');
  return order;
}
export const orderService = {
  async list(signal?: AbortSignal): Promise<OrderSummaryResponse[]> {
    const { data } = await httpClient.get<
      Schemas['ApiResponseListOrderSummaryResponse']
    >('/api/v1/orders', { signal });
    if (
      data.success !== true ||
      !Array.isArray(data.data) ||
      data.data.some(
        (order) =>
          !order ||
          !validOrderId(order.orderId) ||
          !order.status ||
          !orderStatuses.has(order.status),
      ) ||
      new Set(data.data.map((order) => order.orderId)).size !== data.data.length
    )
      throw new Error('Invalid order list');
    return data.data;
  },
  async detail(
    orderId: string,
    buyerId: string,
    signal?: AbortSignal,
  ): Promise<OrderDetailResponse> {
    if (!validOrderId(orderId)) throw unavailable();
    const { data } = await httpClient.get<
      Schemas['ApiResponseOrderDetailResponse']
    >(`/api/v1/orders/${encodeURIComponent(orderId)}`, { signal });
    return checkedDetail(data, orderId, buyerId);
  },
  async cancel(
    orderId: string,
    buyerId: string,
    signal?: AbortSignal,
  ): Promise<OrderDetailResponse> {
    if (!validOrderId(orderId) || !buyerId) throw unavailable();
    const { data } = await httpClient.post<
      Schemas['ApiResponseOrderDetailResponse']
    >(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, undefined, {
      signal,
    });
    const order = checkedDetail(data, orderId, buyerId);
    if (order.status !== 'CANCELLED')
      throw new Error('Cancellation was not confirmed');
    return order;
  },

  async payment(
    order: OrderDetailResponse,
    buyerId: string,
    signal?: AbortSignal,
  ): Promise<PaymentResponse> {
    if (!validOrderId(order.orderId) || order.buyerId !== buyerId)
      throw unavailable();
    const { data } = await httpClient.get<
      Schemas['ApiResponsePaymentResponse']
    >(`/api/v1/payments/order/${encodeURIComponent(order.orderId)}`, {
      signal,
    });
    if (
      data.success !== true ||
      data.data?.orderId !== order.orderId ||
      !data.data.status ||
      !paymentStatuses.has(data.data.status)
    )
      throw new Error('Invalid payment record');
    return data.data;
  },
};
