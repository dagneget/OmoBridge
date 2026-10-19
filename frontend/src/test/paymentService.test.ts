import { afterEach, describe, expect, it, vi } from 'vitest';
import httpClient from '../services/httpClient';
import { paymentService } from '../features/payments/paymentService';
import { bookingService } from '../features/bookings/bookingService';

afterEach(() => vi.restoreAllMocks());
describe('Payment verification response boundaries', () => {
  it.each([false, undefined])(
    'rejects an unsuccessful attempt envelope (%s) even with success-shaped data',
    async (success) => {
      vi.spyOn(httpClient, 'post').mockResolvedValue({
        data: { success, data: { status: 'SUCCESS' } },
      });
      await expect(
        paymentService.createAttempt({
          bookingId: 'booking',
          provider: 'TELEBIRR',
          idempotencyKey: 'same-key',
        }),
      ).rejects.toThrow('Payment attempt failed');
    },
  );
  it.each([false, undefined])(
    'rejects an unsuccessful booking envelope (%s) even with PAID data',
    async (success) => {
      vi.spyOn(httpClient, 'get').mockResolvedValue({
        data: { success, data: { id: 'booking', status: 'PAID' } },
      });
      await expect(bookingService.getBookingById('booking')).rejects.toThrow(
        'Booking not found',
      );
    },
  );
  it('passes the abort signal and stable key through the real attempt service', async () => {
    const controller = new AbortController();
    const post = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue({
        data: { success: true, data: { attemptId: 'attempt' } },
      });
    const payload = {
      bookingId: 'booking',
      provider: 'TELEBIRR',
      idempotencyKey: 'same-key',
    };
    await paymentService.createAttempt(payload, controller.signal);
    expect(post).toHaveBeenCalledWith('/api/v1/payments/attempt', payload, {
      signal: controller.signal,
    });
  });
});
