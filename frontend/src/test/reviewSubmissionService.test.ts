import { afterEach, describe, expect, it, vi } from 'vitest';
import httpClient from '../services/httpClient';
import { reviewService } from '../features/reviews/reviewService';
import type { CreateReviewRequest } from '../types/api';
const id = '11111111-1111-4111-8111-000000000001';
const buyer = '22222222-2222-4222-8222-000000000001';
const target = '33333333-3333-4333-8333-000000000001';
const payload: CreateReviewRequest = {
  targetType: 'PRODUCT',
  targetId: target,
  orderId: id,
  rating: 4,
  comment: 'Good honey',
};
const confirmation = {
  id,
  reviewerUserId: buyer,
  targetType: 'PRODUCT',
  targetId: target,
  rating: 4,
  createdAt: '2026-10-19T10:00:00Z',
};
afterEach(() => vi.restoreAllMocks());
describe('review submission contract', () => {
  it('posts the existing contract with a cancellation signal', async () => {
    const signal = new AbortController().signal;
    const post = vi
      .spyOn(httpClient, 'post')
      .mockResolvedValue({ data: { success: true, data: confirmation } });
    expect(await reviewService.createReview(payload, buyer, signal)).toEqual(
      confirmation,
    );
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/reviews', payload, {
      signal,
    });
  });
  it.each([
    { reviewerUserId: target },
    { targetId: buyer },
    { targetType: 'GUIDE' },
    { rating: 5 },
    { id: 'invalid' },
    { createdAt: 'invalid' },
  ])('rejects mismatched confirmation %o', async (patch) => {
    vi.spyOn(httpClient, 'post').mockResolvedValue({
      data: { success: true, data: { ...confirmation, ...patch } },
    });
    await expect(reviewService.createReview(payload, buyer)).rejects.toThrow(
      'Invalid review confirmation',
    );
  });
  it('requires a successful response envelope', async () => {
    vi.spyOn(httpClient, 'post').mockResolvedValue({
      data: { success: false, data: confirmation },
    });
    await expect(reviewService.createReview(payload, buyer)).rejects.toThrow();
  });
  it.each([
    { rating: 0 },
    { rating: 6 },
    { rating: 1.5 },
    { targetId: '../../admin' },
    { bookingId: id },
    { orderId: undefined },
    { comment: 'x'.repeat(2001) },
  ])('does not send invalid payload %o', async (patch) => {
    const post = vi.spyOn(httpClient, 'post');
    await expect(
      reviewService.createReview({ ...payload, ...patch }, buyer),
    ).rejects.toThrow('Invalid review request');
    expect(post).not.toHaveBeenCalled();
  });
});
