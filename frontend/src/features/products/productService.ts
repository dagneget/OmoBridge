import httpClient from '../../services/httpClient';
import type { ProductResponse, StandardApiResponse } from '../../types/api';

export const productService = {
  async getProduct(id: string, signal?: AbortSignal, options?: { fresh?: boolean }): Promise<ProductResponse> {
    const response = await httpClient.get<StandardApiResponse<ProductResponse>>(
      `/api/v1/public/products/${encodeURIComponent(id)}`,
      { signal, ...(options?.fresh ? { headers: { 'Cache-Control': 'no-cache' } } : {}) }
    );
    const product = response.data.data;
    if (response.data.success === false || !product || typeof product !== 'object' || Array.isArray(product)) {
      throw new Error('Invalid product detail response');
    }
    return product;
  },
  async getProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
    const response = await httpClient.get<StandardApiResponse<ProductResponse[]>>(
      '/api/v1/public/products',
      { signal }
    );
    if (response.data.success === false || !Array.isArray(response.data.data)) {
      throw new Error('Invalid product catalog response');
    }
    return response.data.data;
  },
};
