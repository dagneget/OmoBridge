import { httpClient } from '../../services/httpClient';
import type { StandardApiResponse, DeliveryJobResponse } from '../../types/api';
import type { DeliveryJobStatus } from './deliveryStatus';

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

  /**
   * PATCH /api/v1/delivery/jobs/{jobId}/status
   *
   * Returns the job exactly as the server now sees it. Callers must render the returned
   * state rather than the status they requested: the server rejects illegal transitions
   * (`DeliveryStatus.canTransitionTo`) with a business-rule error, and the response is
   * the only authoritative view of where the job actually is.
   */
  updateJobStatus: async (
    jobId: string,
    newStatus: DeliveryJobStatus,
    reason?: string
  ): Promise<DeliveryJobResponse> => {
    const res = await httpClient.patch<StandardApiResponse<DeliveryJobResponse>>(
      `/api/v1/delivery/jobs/${encodeURIComponent(jobId)}/status`,
      {
        newStatus,
        ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
      }
    );
    return res.data?.data as DeliveryJobResponse;
  },
};

export default deliveryService;