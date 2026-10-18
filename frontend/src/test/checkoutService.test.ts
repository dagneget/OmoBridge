import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../services/httpClient';
import { checkoutService } from '../features/checkout/checkoutService';
import { mockCheckout } from '../mocks/checkoutHandler';
import type { CheckoutRequest } from '../types/api';
const request: CheckoutRequest = {
  idempotencyKey: 'fixed-key',
  items: [{ productId: 'id', quantity: 1 }],
  deliveryAddress: 'Jinka',
  deliveryPhone: '+251911000001',
};
afterEach(() => vi.restoreAllMocks());
describe('Checkout contract', () => {
  it('posts the generated request to the real endpoint with the key in the body', async () => {
    const post = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue({ data: { success: true, data: mockCheckout } });
    expect(await checkoutService.submit(request)).toEqual(mockCheckout);
    expect(post).toHaveBeenCalledWith('/api/v1/checkout', request);
  });
  it.each([
    undefined,
    {},
    { ...mockCheckout, orders: [] },
    { ...mockCheckout, totalAmount: -1 },
    { ...mockCheckout, orders: [{ orderNo: 'incomplete' }] },
  ])(
    'does not treat incomplete or invalid responses as confirmation %j',
    async (data) => {
      vi.spyOn(httpClient, 'post').mockResolvedValue({
        data: { success: true, data },
      });
      await expect(checkoutService.submit(request)).rejects.toThrow(
        'Incomplete checkout response',
      );
    },
  );
  it('does not silently retry a failed POST', async () => {
    const post = vi
      .spyOn(httpClient, 'post')
      .mockRejectedValue(new Error('network'));
    await expect(checkoutService.submit(request)).rejects.toThrow('network');
    expect(post).toHaveBeenCalledTimes(1);
  });
});
