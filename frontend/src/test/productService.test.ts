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

describe('Public product detail service', () => {
  it('uses the public detail path and forwards cancellation', async () => {
    const product = { id: 'test/id', published: true };
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { success: true, data: product } });
    const controller = new AbortController();
    expect(await productService.getProduct(product.id, controller.signal)).toEqual(product);
    expect(get).toHaveBeenCalledWith('/api/v1/public/products/test%2Fid', { signal: controller.signal });
  });
  it.each([undefined, [], 'invalid'])('rejects malformed product response %j', async (data) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { success: true, data } });
    await expect(productService.getProduct('id')).rejects.toThrow('Invalid product detail response');
  });
  it('rejects unsuccessful envelopes', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { success: false, data: { id: 'id' } } });
    await expect(productService.getProduct('id')).rejects.toThrow('Invalid product detail response');
  });
});
