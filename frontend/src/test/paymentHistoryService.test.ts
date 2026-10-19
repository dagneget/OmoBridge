import { afterEach, describe, expect, it, vi } from 'vitest';
import httpClient from '../services/httpClient';
import { paymentHistoryService } from '../features/payments/paymentHistoryService';
import type { PaymentResponse } from '../types/api';
const id = '11111111-1111-4111-8111-000000000001';
const payment: PaymentResponse = {
  paymentId: id,
  paymentNo: 'PAY-001',
  orderId: '22222222-2222-4222-8222-000000000001',
  amount: 470,
  currency: 'ETB',
  status: 'RELEASED',
  createdAt: '2026-10-18T10:15:00Z',
};
const page = {
  content: [payment],
  pageNumber: 0,
  pageSize: 20,
  totalElements: 1,
  totalPages: 1,
  isFirst: true,
  isLast: true,
};
afterEach(() => vi.restoreAllMocks());
describe('Payment history contract boundaries', () => {
  it('uses the authenticated list endpoint without accepting a client payer filter', async () => {
    const signal = new AbortController().signal;
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({ data: { success: true, data: page } });
    expect(await paymentHistoryService.list(0, signal)).toEqual(page);
    expect(get).toHaveBeenCalledWith('/api/v1/payments', {
      params: { page: 0, size: 20 },
      signal,
    });
  });
  it.each([
    { status: 'SUCCESS' },
    { amount: -1 },
    { amount: NaN },
    { currency: '' },
    { createdAt: 'invalid' },
    { orderId: undefined },
    { bookingId: id },
  ])('rejects malformed payment data %o', async (patch) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...page, content: [{ ...payment, ...patch }] },
      },
    });
    await expect(paymentHistoryService.list()).rejects.toThrow(
      'Invalid payment history',
    );
  });
  it.each([
    { pageNumber: 1 },
    { totalElements: -1 },
    { totalPages: NaN },
    { isLast: undefined },
    { content: [payment, payment] },
  ])('rejects inconsistent page data %o', async (patch) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: true, data: { ...page, ...patch } },
    });
    await expect(paymentHistoryService.list()).rejects.toThrow(
      'Invalid payment history',
    );
  });
  it('rejects unsuccessful envelopes even with paid-shaped data', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: false, data: payment },
    });
    await expect(paymentHistoryService.get(id)).rejects.toThrow(
      'Invalid payment record',
    );
  });
  it('rejects a receipt response for another payment', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: true, data: { ...payment, paymentId: payment.orderId } },
    });
    await expect(paymentHistoryService.get(id)).rejects.toThrow(
      'Invalid payment record',
    );
  });
  it('does not make a request for an invalid ID or page', async () => {
    const get = vi.spyOn(httpClient, 'get');
    await expect(paymentHistoryService.get('../../admin')).rejects.toThrow(
      'Payment unavailable',
    );
    await expect(paymentHistoryService.list(-1)).rejects.toThrow(
      'Invalid payment page',
    );
    expect(get).not.toHaveBeenCalled();
  });
});
