import type { components, paths } from './api.generated';

// Core Schema Aliases
export type Schemas = components['schemas'];

// Generic API Response Wrapper from Backend
export interface StandardApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

// Standard Error Response from Backend GlobalExceptionHandler
export interface ApiErrorResponse {
  success?: boolean;
  status?: number;
  message: string;
  errors?: Record<string, string> | string[];
  errorCode?: string;
  timestamp?: string;
  path?: string;
}

// Identity & Auth Models
export type LoginRequest = Schemas['LoginRequest'];
export type AuthResponse = Schemas['AuthResponse'];
export type UserProfileResponse = Schemas['UserProfileResponse'];
export type BuyerRegisterRequest = Schemas['BuyerRegisterRequest'];
export type ProducerRegisterRequest = Schemas['ProducerRegisterRequest'];
export type EnterpriseRegisterRequest = Schemas['EnterpriseRegisterRequest'];
export type DeliveryProviderRegisterRequest = Schemas['DeliveryProviderRegisterRequest'];
export type GuideRegisterRequest = Schemas['GuideRegisterRequest'];

// Products & Catalog Models
export type ProductResponse = Schemas['ProductResponse'];
export type ProductCreateFromOutputRequest = Schemas['ProductCreateFromOutputRequest'];
export type ProductUpdateRequest = Schemas['ProductUpdateRequest'];
export type ProductPriceBreakdownResponse = Schemas['ProductPriceBreakdownResponse'];
export type PriceBreakdownResponse = Schemas['PriceBreakdownResponse'];
export type PriceBreakdownLine = Schemas['PriceBreakdownLine'];
export type ProductTypeResponse = Schemas['ProductTypeResponse'];
export type ProductTypeRequest = Schemas['ProductTypeRequest'];
export type ProductStockAdjustmentRequest = Schemas['ProductStockAdjustmentRequest'];
export type ProductStockMovementResponse = Schemas['ProductStockMovementResponse'];

// Tourism Models
export type TourPackageResponse = Schemas['TourPackageResponse'];
export type TourPackageRequest = Schemas['TourPackageRequest'];
export type Hotel = Schemas['Hotel'];
export type HotelRequest = Schemas['HotelRequest'];
export type GuideResponse = Schemas['GuideResponse'];
export type GuideProfileRequest = Schemas['GuideProfileRequest'];
export type TransportService = Schemas['TransportService'];
export type TransportRequest = Schemas['TransportRequest'];
export type SafetyGuideline = Schemas['SafetyGuideline'];
export type SafetyGuidelineRequest = Schemas['SafetyGuidelineRequest'];
export type SessionResponse = Schemas['SessionResponse'];
export type SessionCreateRequest = Schemas['SessionCreateRequest'];

// Bookings Models
export type BookingResponse = Schemas['BookingResponse'];
export type BookingItemResponse = Schemas['BookingItemResponse'];
export type BookingCreateRequest = Schemas['BookingCreateRequest'];
export type BookingItemRequest = Schemas['BookingItemRequest'];
export type BookingStatusUpdateRequest = Schemas['BookingStatusUpdateRequest'];

// Orders & Checkout Models
export type CheckoutRequest = Schemas['CheckoutRequest'];
export type CheckoutItemRequest = Schemas['CheckoutItemRequest'];
export type CheckoutResponse = Schemas['CheckoutResponse'];
export type OrderDetailResponse = Schemas['OrderDetailResponse'];
export type OrderSummaryResponse = Schemas['OrderSummaryResponse'];
export type OrderItemResponse = Schemas['OrderItemResponse'];
export type UpdateOrderStatusRequest = Schemas['UpdateOrderStatusRequest'];

// Buyer Payments Models
export type CreatePaymentAttemptRequest = Schemas['CreatePaymentAttemptRequest'];
export type PaymentAttemptResponse = Schemas['PaymentAttemptResponse'];
export type PaymentResponse = Schemas['PaymentResponse'];
export type RefundRequest = Schemas['RefundRequest'];
export type RefundResponse = Schemas['RefundResponse'];

// Delivery & Live Tracking Models
export type CreateDeliveryJobRequest = Schemas['CreateDeliveryJobRequest'];
export type DeliveryJobResponse = Schemas['DeliveryJobResponse'];
export type UpdateDeliveryJobStatusRequest = Schemas['UpdateDeliveryJobStatusRequest'];
export type DeliveryTrackingResponse = Schemas['DeliveryTrackingResponse'];
export type LocationPointResponse = Schemas['LocationPointResponse'];
export type BatchLocationIngestionRequest = Schemas['BatchLocationIngestionRequest'];
export type LocationIngestionRequest = Schemas['LocationIngestionRequest'];

// Supply & Farmer Payments Models
export type SupplyDeliveryCreateRequest = Schemas['SupplyDeliveryCreateRequest'];
export type SupplyDeliveryResponse = Schemas['SupplyDeliveryResponse'];
export type SupplyDeliveryItemCreateRequest = Schemas['SupplyDeliveryItemCreateRequest'];
export type SupplyDeliveryItemResponse = Schemas['SupplyDeliveryItemResponse'];
export type SupplyDeliveryInspectionRequest = Schemas['SupplyDeliveryInspectionRequest'];
export type FarmerPayableResponse = Schemas['FarmerPayableResponse'];
export type FarmerPaymentResponse = Schemas['FarmerPaymentResponse'];
export type FarmerPaymentRequest = Schemas['FarmerPaymentRequest'];
export type FarmerBalanceSummaryResponse = Schemas['FarmerBalanceSummaryResponse'];

// Traceability Models
export type ProductionBatchCreateRequest = Schemas['ProductionBatchCreateRequest'];
export type ProductionBatchResponse = Schemas['ProductionBatchResponse'];
export type ProductionInputRequest = Schemas['ProductionInputRequest'];
export type ProductionInputResponse = Schemas['ProductionInputResponse'];
export type ProductionOutputRequest = Schemas['ProductionOutputRequest'];
export type ProductionOutputResponse = Schemas['ProductionOutputResponse'];
export type ProductionLossRequest = Schemas['ProductionLossRequest'];
export type ProductionLossResponse = Schemas['ProductionLossResponse'];
export type PublicTraceResponse = Schemas['PublicTraceResponse'];
export type PublicFarmerOriginResponse = Schemas['PublicFarmerOriginResponse'];
export type PublicOutputItemResponse = Schemas['PublicOutputItemResponse'];
export type TraceRecordUpdateRequest = Schemas['TraceRecordUpdateRequest'];
export type TraceValidationResponse = Schemas['TraceValidationResponse'];

// Inventory Models
export type InventoryLocationResponse = Schemas['InventoryLocationResponse'];
export type InventoryLocationRequest = Schemas['InventoryLocationRequest'];
export type InventoryLotResponse = Schemas['InventoryLotResponse'];
export type InventoryMovementResponse = Schemas['InventoryMovementResponse'];
export type InventoryTransferRequest = Schemas['InventoryTransferRequest'];
export type InventoryAdjustmentRequest = Schemas['InventoryAdjustmentRequest'];
export type InventoryDisposalRequest = Schemas['InventoryDisposalRequest'];

// Reviews & AI Models
export type CreateReviewRequest = Schemas['CreateReviewRequest'];
export type ReviewResponse = Schemas['ReviewResponse'];
export type ReviewSummaryResponse = Schemas['ReviewSummaryResponse'];
export type GenerateReportRequest = Schemas['GenerateReportRequest'];
export type AiReportResponse = Schemas['AiReportResponse'];

// USSD & SMS Models
export type UssdRequest = Schemas['UssdRequest'];
export type UssdResponse = Schemas['UssdResponse'];
export type InboundSmsRequest = Schemas['InboundSmsRequest'];
export type InboundSmsResponse = Schemas['InboundSmsResponse'];

// Utility helpers for typing paths, queries, request bodies, and responses
export type ApiPaths = keyof paths;

export type PathOperation<P extends ApiPaths, M extends keyof paths[P]> = paths[P][M];

export type RequestBody<P extends ApiPaths, M extends keyof paths[P]> =
  paths[P][M] extends { requestBody?: { content: { 'application/json': infer B } } }
    ? B
    : never;

export type ResponseData<P extends ApiPaths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { '*/*': infer R } } } }
    ? R
    : paths[P][M] extends { responses: { 200: { content: { 'application/json': infer R } } } }
    ? R
    : never;
