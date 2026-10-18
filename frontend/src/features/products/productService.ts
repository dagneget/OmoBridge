import httpClient from '../../services/httpClient';
import type { ProductResponse, StandardApiResponse } from '../../types/api';

export const productService = {
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
