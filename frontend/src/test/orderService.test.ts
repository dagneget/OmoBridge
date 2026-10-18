import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderService } from '../features/orders/orderService';
import { httpClient } from '../services/httpClient';
import { mockCheckout, mockOrderConfirmation } from '../mocks/checkoutHandler';
import type { PaymentResponse } from '../types/api';
const id = mockOrderConfirmation.orderId!;
const buyer = mockOrderConfirmation.buyerId!;
const payment: PaymentResponse = {
  paymentId: 'aaaa0000-0000-4000-8000-000000000005',
  orderId: id,
  status: 'PENDING',
  currency: 'ETB',
  amount: 470,
};
afterEach(() => vi.restoreAllMocks());
describe('Buyer orders contract', () => {
  it('loads the current-buyer array with no invented pagination parameters', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({
        data: { success: true, data: mockCheckout.orders },
      });
    const controller = new AbortController();
    expect(await orderService.list(controller.signal)).toEqual(
      mockCheckout.orders,
    );
    expect(get).toHaveBeenCalledWith('/api/v1/orders', {
      signal: controller.signal,
    });
  });
  it.each([
    undefined,
    {},
    [null],
    [{ orderId: 'bad-id', status: 'PLACED' }],
    [...mockCheckout.orders!, ...mockCheckout.orders!],
  ])('rejects malformed lists %j', async (data) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: true, data },
    });
    await expect(orderService.list()).rejects.toThrow('Invalid order list');
  });
  it('loads detail by ID and verifies the buyer before returning private fields', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({
        data: { success: true, data: mockOrderConfirmation },
      });
    const controller = new AbortController();
    expect(await orderService.detail(id, buyer, controller.signal)).toEqual(
      mockOrderConfirmation,
    );
    expect(get).toHaveBeenCalledWith(`/api/v1/orders/${id}`, {
      signal: controller.signal,
    });
  });
  it('refuses another buyer’s detail even if a malformed backend sends 200', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...mockOrderConfirmation, buyerId: 'someone-else' },
      },
    });
    await expect(orderService.detail(id, buyer)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('refuses a mismatched order response', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...mockOrderConfirmation, orderId: 'wrong-order' },
      },
    });
    await expect(orderService.detail(id, buyer)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('does not request a malformed detail ID', async () => {
    const get = vi.spyOn(httpClient, 'get');
    await expect(orderService.detail('bad-id', buyer)).rejects.toMatchObject({
      status: 404,
    });
    expect(get).not.toHaveBeenCalled();
  });
  it.each([
    { status: 'EXPIRED' },
    { items: [null] },
    { statusHistories: [null] },
  ])('rejects malformed detail fields %j', async (patch) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: true, data: { ...mockOrderConfirmation, ...patch } },
    });
    await expect(orderService.detail(id, buyer)).rejects.toThrow(
      'Invalid order detail',
    );
  });
  it('uses the real payment lookup only for a verified owned order', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({ data: { success: true, data: payment } });
    const controller = new AbortController();
    expect(
      await orderService.payment(
        mockOrderConfirmation,
        buyer,
        controller.signal,
      ),
    ).toEqual(payment);
    expect(get).toHaveBeenCalledWith(`/api/v1/payments/order/${id}`, {
      signal: controller.signal,
    });
  });
  it('does not request payment data for another buyer’s order', async () => {
    const get = vi.spyOn(httpClient, 'get');
    await expect(
      orderService.payment(mockOrderConfirmation, 'foreign-buyer'),
    ).rejects.toMatchObject({ status: 404 });
    expect(get).not.toHaveBeenCalled();
  });
  it.each([
    { ...payment, orderId: 'other-order' },
    { ...payment, status: 'SUCCESS' },
    undefined,
  ])('rejects a mismatched or invented payment status %j', async (data) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: true, data },
    });
    await expect(
      orderService.payment(mockOrderConfirmation, buyer),
    ).rejects.toThrow('Invalid payment record');
  });
});
