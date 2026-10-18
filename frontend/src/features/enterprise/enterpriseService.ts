import { httpClient } from '../../services/httpClient';
import type {
  StandardApiResponse,
  EnterpriseImpactMetricsResponse,
  FarmerBalanceSummaryResponse,
  FarmerResponse,
  SupplyDeliveryResponse,
  SupplyDeliveryCreateRequest,
  SupplyDeliveryInspectionRequest,
  OrderSummaryResponse,
  InventoryLotResponse,
  BuyingPriceResponse,
  BuyingPriceRequest,
  ProductTypeResponse,
  ProductTypeRequest,
  FarmerPayableResponse,
  FarmerPaymentResponse,
  FarmerPaymentRequest,
} from '../../types/api';

export const enterpriseService = {
  // AI Impact & Reporting
  getImpactMetrics: async (enterpriseId: string): Promise<EnterpriseImpactMetricsResponse> => {
    const res = await httpClient.get<StandardApiResponse<EnterpriseImpactMetricsResponse>>(
      `/api/v1/enterprises/${enterpriseId}/reports/impact-metrics`
    );
    return res.data?.data || (res.data as unknown as EnterpriseImpactMetricsResponse);
  },

  getFarmerBalancesSummary: async (enterpriseId: string): Promise<FarmerBalanceSummaryResponse> => {
    const res = await httpClient.get<StandardApiResponse<FarmerBalanceSummaryResponse>>(
      `/api/v1/enterprises/${enterpriseId}/reports/farmer-balances`
    );
    return res.data?.data || (res.data as unknown as FarmerBalanceSummaryResponse);
  },

  // Farmers Management
  getEnterpriseFarmers: async (enterpriseId: string): Promise<FarmerResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<FarmerResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/farmers`
    );
    return res.data?.data || (res.data as unknown as FarmerResponse[]) || [];
  },

  approveFarmer: async (enterpriseId: string, farmerId: string): Promise<FarmerResponse> => {
    const res = await httpClient.patch<StandardApiResponse<FarmerResponse>>(
      `/api/v1/enterprises/${enterpriseId}/farmers/${farmerId}/approve`
    );
    return res.data?.data || (res.data as unknown as FarmerResponse);
  },

  rejectFarmer: async (enterpriseId: string, farmerId: string): Promise<FarmerResponse> => {
    const res = await httpClient.patch<StandardApiResponse<FarmerResponse>>(
      `/api/v1/enterprises/${enterpriseId}/farmers/${farmerId}/reject`
    );
    return res.data?.data || (res.data as unknown as FarmerResponse);
  },

  linkFarmer: async (enterpriseId: string, farmerId: string): Promise<FarmerResponse> => {
    const res = await httpClient.post<StandardApiResponse<FarmerResponse>>(
      `/api/v1/enterprises/${enterpriseId}/farmers/${farmerId}/link`
    );
    return res.data?.data || (res.data as unknown as FarmerResponse);
  },

  // Product Types and Buying Prices
  getProductTypes: async (category?: string): Promise<ProductTypeResponse[]> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await httpClient.get<StandardApiResponse<ProductTypeResponse[]>>(
      `/api/v1/product-types${query}`
    );
    return res.data?.data || (res.data as unknown as ProductTypeResponse[]) || [];
  },

  createProductType: async (data: ProductTypeRequest): Promise<ProductTypeResponse> => {
    const res = await httpClient.post<StandardApiResponse<ProductTypeResponse>>(
      '/api/v1/product-types',
      data
    );
    return res.data?.data || (res.data as unknown as ProductTypeResponse);
  },

  getBuyingPrices: async (enterpriseId: string): Promise<BuyingPriceResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<BuyingPriceResponse[]>>(
      `/api/v1/buying-prices/enterprises/${enterpriseId}`
    );
    return res.data?.data || (res.data as unknown as BuyingPriceResponse[]) || [];
  },

  createBuyingPrice: async (data: BuyingPriceRequest): Promise<BuyingPriceResponse> => {
    const res = await httpClient.post<StandardApiResponse<BuyingPriceResponse>>(
      '/api/v1/buying-prices',
      data
    );
    return res.data?.data || (res.data as unknown as BuyingPriceResponse);
  },

  // Supply Deliveries & Intake
  getEnterpriseDeliveries: async (enterpriseId: string): Promise<SupplyDeliveryResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<SupplyDeliveryResponse[]>>(
      `/api/v1/supply-deliveries/enterprises/${enterpriseId}`
    );
    return res.data?.data || (res.data as unknown as SupplyDeliveryResponse[]) || [];
  },

  getDeliveryById: async (deliveryId: string): Promise<SupplyDeliveryResponse> => {
    const res = await httpClient.get<StandardApiResponse<SupplyDeliveryResponse>>(
      `/api/v1/supply-deliveries/${deliveryId}`
    );
    return res.data?.data || (res.data as unknown as SupplyDeliveryResponse);
  },

  recordDelivery: async (data: SupplyDeliveryCreateRequest): Promise<SupplyDeliveryResponse> => {
    const res = await httpClient.post<StandardApiResponse<SupplyDeliveryResponse>>(
      '/api/v1/supply-deliveries',
      data
    );
    return res.data?.data || (res.data as unknown as SupplyDeliveryResponse);
  },

  inspectDelivery: async (
    deliveryId: string,
    data: SupplyDeliveryInspectionRequest
  ): Promise<SupplyDeliveryResponse> => {
    const res = await httpClient.patch<StandardApiResponse<SupplyDeliveryResponse>>(
      `/api/v1/supply-deliveries/${deliveryId}/inspect`,
      data
    );
    return res.data?.data || (res.data as unknown as SupplyDeliveryResponse);
  },

  cancelDelivery: async (deliveryId: string, reason?: string): Promise<SupplyDeliveryResponse> => {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await httpClient.post<StandardApiResponse<SupplyDeliveryResponse>>(
      `/api/v1/supply-deliveries/${deliveryId}/cancel${query}`
    );
    return res.data?.data || (res.data as unknown as SupplyDeliveryResponse);
  },

  // Farmer Balances, Payables & Payments
  getFarmerPayables: async (farmerId: string): Promise<FarmerPayableResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<FarmerPayableResponse[]>>(
      `/api/v1/farmers/${farmerId}/payables`
    );
    return res.data?.data || (res.data as unknown as FarmerPayableResponse[]) || [];
  },

  getFarmerBalance: async (farmerId: string): Promise<FarmerBalanceSummaryResponse> => {
    const res = await httpClient.get<StandardApiResponse<FarmerBalanceSummaryResponse>>(
      `/api/v1/farmers/${farmerId}/balance`
    );
    return res.data?.data || (res.data as unknown as FarmerBalanceSummaryResponse);
  },

  getEnterpriseFarmerPayments: async (enterpriseId: string): Promise<FarmerPaymentResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<FarmerPaymentResponse[]>>(
      `/api/v1/farmer-payments/enterprises/${enterpriseId}`
    );
    return res.data?.data || (res.data as unknown as FarmerPaymentResponse[]) || [];
  },

  createFarmerPayment: async (data: FarmerPaymentRequest): Promise<FarmerPaymentResponse> => {
    const res = await httpClient.post<StandardApiResponse<FarmerPaymentResponse>>(
      '/api/v1/farmer-payments',
      data
    );
    return res.data?.data || (res.data as unknown as FarmerPaymentResponse);
  },

  // Orders & Inventory Lots
  getEnterpriseOrders: async (enterpriseId: string): Promise<OrderSummaryResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<OrderSummaryResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/orders`
    );
    return res.data?.data || (res.data as unknown as OrderSummaryResponse[]) || [];
  },

  getEnterpriseLots: async (enterpriseId: string, status?: string): Promise<InventoryLotResponse[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await httpClient.get<StandardApiResponse<InventoryLotResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots${query}`
    );
    return res.data?.data || (res.data as unknown as InventoryLotResponse[]) || [];
  },
};
