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
  InventoryLocationResponse,
  InventoryLocationRequest,
  InventoryMovementResponse,
  InventoryAdjustmentRequest,
  InventoryTransferRequest,
  InventoryDisposalRequest,
  ReconciliationReportResponse,
  ProductionBatchCreateRequest,
  ProductionBatchResponse,
  TraceValidationResponse,
  TraceRecordUpdateRequest,
  ProductResponse,
  ProductCreateFromOutputRequest,
  ProductUpdateRequest,
  ProductStockAdjustmentRequest,
  ProductStockMovementResponse,
  OrderDetailResponse,
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

  getEnterpriseOrderDetail: async (
    enterpriseId: string,
    orderId: string
  ): Promise<OrderDetailResponse> => {
    const res = await httpClient.get<StandardApiResponse<OrderDetailResponse>>(
      `/api/v1/enterprises/${enterpriseId}/orders/${orderId}`
    );
    return res.data?.data || (res.data as unknown as OrderDetailResponse);
  },

  updateOrderStatus: async (
    enterpriseId: string,
    orderId: string,
    newStatus: string,
    reason?: string
  ): Promise<OrderDetailResponse> => {
    const res = await httpClient.patch<StandardApiResponse<OrderDetailResponse>>(
      `/api/v1/enterprises/${enterpriseId}/orders/${orderId}/status`,
      { newStatus, reason }
    );
    return res.data?.data || (res.data as unknown as OrderDetailResponse);
  },

  getEnterpriseLots: async (enterpriseId: string, status?: string): Promise<InventoryLotResponse[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await httpClient.get<StandardApiResponse<InventoryLotResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots${query}`
    );
    return res.data?.data || (res.data as unknown as InventoryLotResponse[]) || [];
  },

  getLotById: async (enterpriseId: string, lotId: string): Promise<InventoryLotResponse> => {
    const res = await httpClient.get<StandardApiResponse<InventoryLotResponse>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots/${lotId}`
    );
    return res.data?.data || (res.data as unknown as InventoryLotResponse);
  },

  getLotMovements: async (enterpriseId: string, lotId: string): Promise<InventoryMovementResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<InventoryMovementResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots/${lotId}/movements`
    );
    return res.data?.data || (res.data as unknown as InventoryMovementResponse[]) || [];
  },

  getLocations: async (enterpriseId: string): Promise<InventoryLocationResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<InventoryLocationResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/locations`
    );
    return res.data?.data || (res.data as unknown as InventoryLocationResponse[]) || [];
  },

  createLocation: async (
    enterpriseId: string,
    data: InventoryLocationRequest
  ): Promise<InventoryLocationResponse> => {
    const res = await httpClient.post<StandardApiResponse<InventoryLocationResponse>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/locations`,
      data
    );
    return res.data?.data || (res.data as unknown as InventoryLocationResponse);
  },

  adjustLot: async (
    enterpriseId: string,
    lotId: string,
    data: InventoryAdjustmentRequest
  ): Promise<InventoryMovementResponse> => {
    const res = await httpClient.post<StandardApiResponse<InventoryMovementResponse>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots/${lotId}/adjustments`,
      data
    );
    return res.data?.data || (res.data as unknown as InventoryMovementResponse);
  },

  transferLot: async (
    enterpriseId: string,
    lotId: string,
    data: InventoryTransferRequest
  ): Promise<InventoryMovementResponse> => {
    const res = await httpClient.post<StandardApiResponse<InventoryMovementResponse>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots/${lotId}/transfers`,
      data
    );
    return res.data?.data || (res.data as unknown as InventoryMovementResponse);
  },

  disposeLot: async (
    enterpriseId: string,
    lotId: string,
    data: InventoryDisposalRequest
  ): Promise<InventoryMovementResponse> => {
    const res = await httpClient.post<StandardApiResponse<InventoryMovementResponse>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots/${lotId}/disposals`,
      data
    );
    return res.data?.data || (res.data as unknown as InventoryMovementResponse);
  },

  reconcileEnterpriseLots: async (enterpriseId: string): Promise<ReconciliationReportResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<ReconciliationReportResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/reconciliation`
    );
    return res.data?.data || (res.data as unknown as ReconciliationReportResponse[]) || [];
  },

  reconcileLot: async (enterpriseId: string, lotId: string): Promise<ReconciliationReportResponse> => {
    const res = await httpClient.get<StandardApiResponse<ReconciliationReportResponse>>(
      `/api/v1/enterprises/${enterpriseId}/inventory/lots/${lotId}/reconciliation`
    );
    return res.data?.data || (res.data as unknown as ReconciliationReportResponse);
  },

  // Production Batches & Processing Traceability
  getProductionBatches: async (enterpriseId: string): Promise<ProductionBatchResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<ProductionBatchResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/production/batches`
    );
    return res.data?.data || (res.data as unknown as ProductionBatchResponse[]) || [];
  },

  getProductionBatchById: async (
    enterpriseId: string,
    batchId: string
  ): Promise<ProductionBatchResponse> => {
    const res = await httpClient.get<StandardApiResponse<ProductionBatchResponse>>(
      `/api/v1/enterprises/${enterpriseId}/production/batches/${batchId}`
    );
    return res.data?.data || (res.data as unknown as ProductionBatchResponse);
  },

  createProductionBatch: async (
    enterpriseId: string,
    data: ProductionBatchCreateRequest
  ): Promise<ProductionBatchResponse> => {
    const res = await httpClient.post<StandardApiResponse<ProductionBatchResponse>>(
      `/api/v1/enterprises/${enterpriseId}/production/batches`,
      data
    );
    return res.data?.data || (res.data as unknown as ProductionBatchResponse);
  },

  completeProductionBatch: async (
    enterpriseId: string,
    batchId: string
  ): Promise<ProductionBatchResponse> => {
    const res = await httpClient.post<StandardApiResponse<ProductionBatchResponse>>(
      `/api/v1/enterprises/${enterpriseId}/production/batches/${batchId}/complete`
    );
    return res.data?.data || (res.data as unknown as ProductionBatchResponse);
  },

  cancelProductionBatch: async (
    enterpriseId: string,
    batchId: string,
    reason?: string
  ): Promise<ProductionBatchResponse> => {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await httpClient.post<StandardApiResponse<ProductionBatchResponse>>(
      `/api/v1/enterprises/${enterpriseId}/production/batches/${batchId}/cancel${query}`
    );
    return res.data?.data || (res.data as unknown as ProductionBatchResponse);
  },

  validateTrace: async (
    enterpriseId: string,
    batchId: string
  ): Promise<TraceValidationResponse> => {
    const res = await httpClient.get<StandardApiResponse<TraceValidationResponse>>(
      `/api/v1/enterprises/${enterpriseId}/production/batches/${batchId}/validation`
    );
    return res.data?.data || (res.data as unknown as TraceValidationResponse);
  },

  updateTraceRecord: async (
    enterpriseId: string,
    batchId: string,
    data: TraceRecordUpdateRequest
  ): Promise<{ batchId: string; publicToken: string; showFarmerNames: boolean; publicStory: string }> => {
    const res = await httpClient.patch<StandardApiResponse<{ batchId: string; publicToken: string; showFarmerNames: boolean; publicStory: string }>>(
      `/api/v1/enterprises/${enterpriseId}/production/batches/${batchId}/trace`,
      data
    );
    return res.data?.data || (res.data as unknown as { batchId: string; publicToken: string; showFarmerNames: boolean; publicStory: string });
  },

  // Enterprise Products Management (F-907, F-908)
  getEnterpriseProducts: async (enterpriseId: string): Promise<ProductResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<ProductResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/products`
    );
    return res.data?.data || (res.data as unknown as ProductResponse[]) || [];
  },

  getProductById: async (enterpriseId: string, productId: string): Promise<ProductResponse> => {
    const res = await httpClient.get<StandardApiResponse<ProductResponse>>(
      `/api/v1/enterprises/${enterpriseId}/products/${productId}`
    );
    return res.data?.data || (res.data as unknown as ProductResponse);
  },

  createProductFromOutput: async (
    enterpriseId: string,
    data: ProductCreateFromOutputRequest
  ): Promise<ProductResponse> => {
    const res = await httpClient.post<StandardApiResponse<ProductResponse>>(
      `/api/v1/enterprises/${enterpriseId}/products`,
      data
    );
    return res.data?.data || (res.data as unknown as ProductResponse);
  },

  updateProduct: async (
    enterpriseId: string,
    productId: string,
    data: ProductUpdateRequest
  ): Promise<ProductResponse> => {
    const res = await httpClient.patch<StandardApiResponse<ProductResponse>>(
      `/api/v1/enterprises/${enterpriseId}/products/${productId}`,
      data
    );
    return res.data?.data || (res.data as unknown as ProductResponse);
  },

  publishProduct: async (
    enterpriseId: string,
    productId: string,
    publish: boolean
  ): Promise<ProductResponse> => {
    const res = await httpClient.patch<StandardApiResponse<ProductResponse>>(
      `/api/v1/enterprises/${enterpriseId}/products/${productId}/publish?publish=${publish}`
    );
    return res.data?.data || (res.data as unknown as ProductResponse);
  },

  adjustProductStock: async (
    enterpriseId: string,
    productId: string,
    data: ProductStockAdjustmentRequest
  ): Promise<ProductStockMovementResponse> => {
    const res = await httpClient.post<StandardApiResponse<ProductStockMovementResponse>>(
      `/api/v1/enterprises/${enterpriseId}/products/${productId}/adjust-stock`,
      data
    );
    return res.data?.data || (res.data as unknown as ProductStockMovementResponse);
  },

  getProductStockMovements: async (
    enterpriseId: string,
    productId: string
  ): Promise<ProductStockMovementResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<ProductStockMovementResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/products/${productId}/stock-movements`
    );
    return res.data?.data || (res.data as unknown as ProductStockMovementResponse[]) || [];
  },
};
