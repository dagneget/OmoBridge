import { afterEach, describe, expect, it, vi } from 'vitest';
import httpClient from '../services/httpClient';
import { productService } from '../features/products';

afterEach(() => vi.restoreAllMocks());
describe('Public product service', () => {
  it('uses the public API path and forwards cancellation without invented page parameters', async () => {
    const get = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({ data: { success: true, data: [] } });
    const controller = new AbortController();
    expect(await productService.getProducts(controller.signal)).toEqual([]);
    expect(get).toHaveBeenCalledWith('/api/v1/public/products', { signal: controller.signal });
  });
  it('rejects malformed responses instead of reporting an empty catalog', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { success: true } });
    await expect(productService.getProducts()).rejects.toThrow('Invalid product catalog response');
  });
  it('propagates API failures to the screen', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('Network failure'));
    await expect(productService.getProducts()).rejects.toThrow('Network failure');
  });
});
