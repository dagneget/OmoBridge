import { httpClient } from '../../services/httpClient';
import type { StandardApiResponse, DeliveryJobResponse } from '../../types/api';

/**
 * Delivery provider API access.
 *
 * Endpoints are typed from the generated OpenAPI contract
 * (`frontend/src/types/api.generated.ts`). Nothing here invents a path or a field.
 */
export const deliveryService = {
  /**
   * GET /api/v1/delivery/providers/{providerId}/jobs
   *
   * "Done when: only own jobs appear" is enforced server-side, not by filtering here:
   * `DeliveryService.getProviderJobs` throws ForbiddenException unless the actor owns
   * the provider record or holds an admin role. This client never accepts a provider id
   * from route params or user input -- it is always resolved from the signed-in
   * session by `resolveProviderId`.
   */
  getProviderJobs: async (providerId: string): Promise<DeliveryJobResponse[]> => {
    const res = await httpClient.get<StandardApiResponse<DeliveryJobResponse[]>>(
      `/api/v1/delivery/providers/${encodeURIComponent(providerId)}/jobs`
    );
    return res.data?.data ?? [];
  },
};

export default deliveryService;