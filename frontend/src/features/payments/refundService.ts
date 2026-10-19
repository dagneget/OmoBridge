import httpClient from '../../services/httpClient';
import type { Schemas } from '../../types/api';
import { validPaymentId } from './paymentHistoryService';
export type RefundSummary = Schemas['PaymentRefundSummaryResponse'];
const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
export const refundService = {
  async get(
    paymentId: string,
    page = 0,
    signal?: AbortSignal,
  ): Promise<RefundSummary> {
    if (!validPaymentId(paymentId) || !Number.isSafeInteger(page) || page < 0)
      throw new Error('Refund information unavailable');
    const { data } = await httpClient.get<
      Schemas['ApiResponsePaymentRefundSummaryResponse']
    >(`/api/v1/payments/${paymentId}/refunds`, {
      params: { page, size: 20 },
      signal,
    });
    const summary = data.data;
    const records = summary?.refunds;
    if (
      data.success !== true ||
      !summary ||
      summary.paymentId !== paymentId ||
      !nonnegative(summary.paymentAmount) ||
      summary.paymentAmount <= 0 ||
      !nonnegative(summary.completedRefundAmount) ||
      summary.completedRefundAmount > summary.paymentAmount ||
      !nonnegative(summary.notRefundedAmount) ||
      summary.notRefundedAmount > summary.paymentAmount ||
      !['NONE', 'PARTIAL', 'FULL'].includes(summary.coverage || '') ||
      !summary.currency ||
      !/^[A-Z]{3}$/.test(summary.currency) ||
      !records ||
      records.pageNumber !== page ||
      records.pageSize !== 20 ||
      !Number.isSafeInteger(records.totalPages) ||
      records.totalPages! < 0 ||
      !Number.isSafeInteger(records.totalElements) ||
      typeof records.isFirst !== 'boolean' ||
      typeof records.isLast !== 'boolean' ||
      !Array.isArray(records.content) ||
      records.content.length > 20 ||
      records.totalElements! < records.content.length ||
      new Set(records.content.map((refund) => refund?.refundId)).size !==
        records.content.length ||
      records.content.some(
        (refund) =>
          !refund ||
          !validPaymentId(refund.refundId) ||
          refund.paymentId !== paymentId ||
          !refund.refundNo?.trim() ||
          !nonnegative(refund.amount) ||
          refund.amount <= 0 ||
          refund.currency !== summary.currency ||
          !['PENDING', 'COMPLETED', 'FAILED'].includes(refund.status || '') ||
          !refund.createdAt ||
          !Number.isFinite(Date.parse(refund.createdAt)),
      )
    )
      throw new Error('Invalid refund summary');
    return summary;
  },
};
