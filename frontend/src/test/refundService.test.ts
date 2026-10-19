import { afterEach, describe, expect, it, vi } from 'vitest';
import httpClient from '../services/httpClient';
import {
  refundService,
  type RefundSummary,
} from '../features/payments/refundService';
import { paymentHistoryService } from '../features/payments/paymentHistoryService';
const id = '11111111-1111-4111-8111-000000000001';
const bookingId = '22222222-2222-4222-8222-000000000001';
const summary: RefundSummary = {
  paymentId: id,
  paymentAmount: 500,
  completedRefundAmount: 100,
  notRefundedAmount: 400,
  currency: 'ETB',
  coverage: 'PARTIAL',
  refunds: {
    content: [
      {
        refundId: bookingId,
        refundNo: 'REF-001',
        paymentId: id,
        amount: 100,
        currency: 'ETB',
        status: 'COMPLETED',
        createdAt: '2026-10-18T10:00:00Z',
      },
    ],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 1,
    totalPages: 1,
    isFirst: true,
    isLast: true,
  },
};
afterEach(() => vi.restoreAllMocks());
describe('Refund read contract', () => {
  it('reads a paginated authenticated summary without calculating totals locally', async () => {
    const signal = new AbortController().signal;
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({ data: { success: true, data: summary } });
    expect(await refundService.get(id, 0, signal)).toEqual(summary);
    expect(get).toHaveBeenCalledWith(`/api/v1/payments/${id}/refunds`, {
      params: { page: 0, size: 20 },
      signal,
    });
  });
  it.each([
    { paymentId: bookingId },
    { paymentAmount: -1 },
    { completedRefundAmount: 501 },
    { notRefundedAmount: -1 },
    { coverage: 'SUCCESS' },
    { currency: '' },
  ])('rejects malformed refund totals or identity %o', async (patch) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: true, data: { ...summary, ...patch } },
    });
    await expect(refundService.get(id)).rejects.toThrow(
      'Invalid refund summary',
    );
  });
  it.each([
    { paymentId: bookingId },
    { status: 'SUCCESS' },
    { currency: 'USD' },
    { amount: -1 },
    { createdAt: 'bad-date' },
  ])('rejects records mismatching the summary %o', async (patch) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          ...summary,
          refunds: {
            ...summary.refunds,
            content: [{ ...summary.refunds!.content![0], ...patch }],
          },
        },
      },
    });
    await expect(refundService.get(id)).rejects.toThrow(
      'Invalid refund summary',
    );
  });
  it('does not interpret a failed envelope as a refund response', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: false, data: summary },
    });
    await expect(refundService.get(id)).rejects.toThrow(
      'Invalid refund summary',
    );
  });
  it('does not request invalid payment identifiers or page numbers', async () => {
    const get = vi.spyOn(httpClient, 'get');
    await expect(refundService.get('../../private')).rejects.toThrow(
      'Refund information unavailable',
    );
    await expect(refundService.get(id, -1)).rejects.toThrow(
      'Refund information unavailable',
    );
    expect(get).not.toHaveBeenCalled();
  });
  it('rejects a booking payment belonging to a different booking', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          paymentId: id,
          paymentNo: 'PAY-001',
          bookingId: id,
          status: 'RELEASED',
          amount: 500,
          currency: 'ETB',
          createdAt: '2026-10-18T10:00:00Z',
        },
      },
    });
    await expect(paymentHistoryService.booking(bookingId)).rejects.toThrow(
      'Invalid booking payment',
    );
  });
});
