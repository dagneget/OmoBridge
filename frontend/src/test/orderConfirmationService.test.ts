import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../services/httpClient';
import { orderConfirmationService } from '../features/checkout/orderConfirmationService';
import { mockOrderConfirmation } from '../mocks/checkoutHandler';
afterEach(() => vi.restoreAllMocks());
describe('Buyer order confirmation contract', () => {
  it('uses the existing authenticated order endpoint and cancellation signal', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({
        data: { success: true, data: mockOrderConfirmation },
      });
    const controller = new AbortController();
    expect(
      await orderConfirmationService.get(
        mockOrderConfirmation.orderId!,
        controller.signal,
      ),
    ).toEqual(mockOrderConfirmation);
    expect(get).toHaveBeenCalledWith(
      `/api/v1/orders/${mockOrderConfirmation.orderId}`,
      { signal: controller.signal },
    );
  });
  it.each([
    undefined,
    {},
    { ...mockOrderConfirmation, status: 'EXPIRED' },
    { ...mockOrderConfirmation, orderId: 'other-id' },
    { ...mockOrderConfirmation, buyerId: undefined },
  ])(
    'rejects incomplete, mismatched or unknown contract values %j',
    async (data) => {
      vi.spyOn(httpClient, 'get').mockResolvedValue({
        data: { success: true, data },
      });
      await expect(
        orderConfirmationService.get(mockOrderConfirmation.orderId!),
      ).rejects.toThrow('Incomplete order confirmation');
    },
  );
  it('propagates failed envelopes without claiming confirmation', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: false, data: mockOrderConfirmation },
    });
    await expect(
      orderConfirmationService.get(mockOrderConfirmation.orderId!),
    ).rejects.toThrow();
  });
});
