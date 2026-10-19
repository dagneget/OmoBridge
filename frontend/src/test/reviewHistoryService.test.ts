import { afterEach, describe, expect, it, vi } from 'vitest';
import httpClient from '../services/httpClient';
import { reviewHistoryService } from '../features/reviews/reviewHistoryService';
const buyer = '22222222-2222-4222-8222-000000000001';
const id = '11111111-1111-4111-8111-000000000001';
const review = {
  id,
  reviewerUserId: buyer,
  targetId: id,
  targetType: 'PRODUCT',
  rating: 5,
  comment: 'My review',
  createdAt: '2026-10-19T10:00:00Z',
};
const page = {
  content: [review],
  pageNumber: 0,
  pageSize: 20,
  totalElements: 1,
  totalPages: 1,
  isFirst: true,
  isLast: true,
};
afterEach(() => vi.restoreAllMocks());
describe('own review page contract', () => {
  it('uses the authenticated endpoint without a caller-supplied reviewer filter', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({ data: { success: true, data: page } });
    const signal = new AbortController().signal;
    expect(await reviewHistoryService.list(buyer, 0, signal)).toEqual(page);
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/reviews/my', {
      params: { page: 0, size: 20 },
      signal,
    });
  });
  it.each([
    { reviewerUserId: id },
    { id: 'bad' },
    { targetId: 'bad' },
    { targetType: 'UNKNOWN' },
    { rating: 6 },
    { rating: 1.5 },
    { createdAt: 'bad' },
    { comment: {} },
  ])('rejects unverified review %o', async (patch) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { ...page, content: [{ ...review, ...patch }] },
      },
    });
    await expect(reviewHistoryService.list(buyer)).rejects.toThrow(
      'Invalid review history',
    );
  });
  it.each([
    { pageNumber: 2 },
    { pageSize: 100 },
    { totalElements: -1 },
    { totalPages: 2 },
    { isFirst: false },
    { isLast: false },
    { content: [review, review] },
  ])('rejects inconsistent pagination %o', async (patch) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: true, data: { ...page, ...patch } },
    });
    await expect(reviewHistoryService.list(buyer)).rejects.toThrow(
      'Invalid review history',
    );
  });
  it('does not trust a false success envelope', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      data: { success: false, data: page },
    });
    await expect(reviewHistoryService.list(buyer)).rejects.toThrow();
  });
  it.each([-1, 0.5, NaN])('does not query invalid page %s', async (value) => {
    const get = vi.spyOn(httpClient, 'get');
    await expect(reviewHistoryService.list(buyer, value)).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });
});
