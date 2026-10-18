import { afterEach, describe, expect, it, vi } from 'vitest';
import httpClient from '../services/httpClient';
import { orderService } from '../features/orders/orderService';
const id = '11111111-1111-4111-8111-000000000001';
const buyer = '22222222-2222-4222-8222-000000000001';
const order = {
  orderId: id,
  buyerId: buyer,
  status: 'CANCELLED',
  items: [],
  statusHistories: [],
};
afterEach(() => vi.restoreAllMocks());
describe('Cancellation contract boundaries', () => {
  it('uses the real bodyless buyer endpoint and cancellation signal', async () => {
    const signal = new AbortController().signal;
    const post = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue({ data: { success: true, data: order } });
    expect(await orderService.cancel(id, buyer, signal)).toEqual(order);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/orders/${id}/cancel`,
      undefined,
      { signal },
    );
  });
  it.each([
    { buyerId: 'other' },
    { orderId: buyer },
    { status: 'PLACED' },
    { items: [null] },
    { statusHistories: [null] },
  ])(
    'does not accept an unverified cancellation response %o',
    async (patch) => {
      vi.spyOn(httpClient, 'post').mockResolvedValue({
        data: { success: true, data: { ...order, ...patch } },
      });
      await expect(orderService.cancel(id, buyer)).rejects.toThrow();
    },
  );
  it('rejects a false success envelope', async () => {
    vi.spyOn(httpClient, 'post').mockResolvedValue({
      data: { success: false, data: order },
    });
    await expect(orderService.cancel(id, buyer)).rejects.toThrow(
      'Invalid order detail',
    );
  });
  it('does not send requests for invalid IDs', async () => {
    const post = vi.spyOn(httpClient, 'post');
    await expect(orderService.cancel('../../admin', buyer)).rejects.toThrow(
      'Order unavailable',
    );
    expect(post).not.toHaveBeenCalled();
  });
});
