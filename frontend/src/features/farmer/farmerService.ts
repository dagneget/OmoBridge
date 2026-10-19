import { httpClient } from '../../services/httpClient';
import type {
  StandardApiResponse,
  FarmerBalanceSummaryResponse,
  SupplyDeliveryResponse,
  FarmerPaymentResponse,
  BuyingPriceResponse,
} from '../../types/api';

/**
 * Farmer self-service API layer.
 * All endpoints are under /api/v1/farmers/{farmerId} and require PRODUCER_FARMER
 * ownership (the backend's OwnershipService checks isOwnFarmer).
 * Buying prices are public (no auth) so farmers can see today's rates.
 */
export const farmerService = {
  /** GET /api/v1/farmers/{farmerId}/balance — outstanding balance summary */
  getBalance: async (farmerId: string): Promise<FarmerBalanceSummaryResponse> => {
    const res = await httpClient.get<StandardApiResponse<FarmerBalanceSummaryResponse>>(
      `/api/v1/farmers/${farmerId}/balance`
    );
    return res.data?.data || (res.data as unknown as FarmerBalanceSummaryResponse);
  },

  /** GET /api/v1/farmers/{farmerId}/deliveries — own delivery history (accepted/rejected quantities) */
  getDeliveries: async (farmerId: string): Promise<SupplyDeliveryResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<SupplyDeliveryResponse[]>>(
      `/api/v1/farmers/${farmerId}/deliveries`
    );
    return res.data?.data || (res.data as unknown as SupplyDeliveryResponse[]) || [];
  },

  /** GET /api/v1/farmers/{farmerId}/payments — received payments and allocations */
  getPayments: async (farmerId: string): Promise<FarmerPaymentResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<FarmerPaymentResponse[]>>(
      `/api/v1/farmers/${farmerId}/payments`
    );
    return res.data?.data || (res.data as unknown as FarmerPaymentResponse[]) || [];
  },

  /** GET /api/v1/buying-prices/enterprises/{enterpriseId} — public, today's buying prices */
  getBuyingPrices: async (enterpriseId: string): Promise<BuyingPriceResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<BuyingPriceResponse[]>>(
      `/api/v1/buying-prices/enterprises/${enterpriseId}`
    );
    return res.data?.data || (res.data as unknown as BuyingPriceResponse[]) || [];
  },
};
