import httpClient from '../../services/httpClient';
import type { PaymentResponse, Schemas } from '../../types/api';
export type PaymentPage = Schemas['PageResponsePaymentResponse'];
export const validPaymentId = (id?: string): id is string =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const statuses = new Set(['PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED']);
function validRecord(value: PaymentResponse): boolean {
  return (
    !!value &&
    validPaymentId(value.paymentId) &&
    typeof value.paymentNo === 'string' &&
    !!value.paymentNo.trim() &&
    !!value.status &&
    statuses.has(value.status) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    typeof value.currency === 'string' &&
    /^[A-Z]{3}$/.test(value.currency) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    ((validPaymentId(value.orderId) && !value.bookingId) ||
      (validPaymentId(value.bookingId) && !value.orderId))
  );
}
export const paymentHistoryService = {
  async list(page = 0, signal?: AbortSignal): Promise<PaymentPage> {
    if (!Number.isSafeInteger(page) || page < 0)
      throw new Error('Invalid payment page');
    const { data } = await httpClient.get<
      Schemas['ApiResponsePageResponsePaymentResponse']
    >('/api/v1/payments', { params: { page, size: 20 }, signal });
    const result = data.data;
    if (
      data.success !== true ||
      !result ||
      !Array.isArray(result.content) ||
      result.content.length > 20 ||
      result.content.some((payment) => !validRecord(payment)) ||
      new Set(result.content.map((payment) => payment.paymentId)).size !==
        result.content.length ||
      result.pageNumber !== page ||
      result.pageSize !== 20 ||
      !Number.isSafeInteger(result.totalElements) ||
      result.totalElements! < result.content.length ||
      !Number.isSafeInteger(result.totalPages) ||
      result.totalPages! < 0 ||
      typeof result.isFirst !== 'boolean' ||
      typeof result.isLast !== 'boolean'
    )
      throw new Error('Invalid payment history');
    return result;
  },
  async booking(
    bookingId: string,
    signal?: AbortSignal,
  ): Promise<PaymentResponse> {
    if (!validPaymentId(bookingId)) throw new Error('Payment unavailable');
    const { data } = await httpClient.get<
      Schemas['ApiResponsePaymentResponse']
    >(`/api/v1/payments/booking/${bookingId}`, { signal });
    if (
      data.success !== true ||
      !data.data ||
      !validRecord(data.data) ||
      data.data.bookingId !== bookingId
    )
      throw new Error('Invalid booking payment');
    return data.data;
  },
  async get(id: string, signal?: AbortSignal): Promise<PaymentResponse> {
    if (!validPaymentId(id)) throw new Error('Payment unavailable');
    const { data } = await httpClient.get<
      Schemas['ApiResponsePaymentResponse']
    >(`/api/v1/payments/${encodeURIComponent(id)}`, { signal });
    if (
      data.success !== true ||
      !data.data ||
      !validRecord(data.data) ||
      data.data.paymentId !== id
    )
      throw new Error('Invalid payment record');
    return data.data;
  },
};
