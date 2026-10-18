import { httpClient } from '../../services/httpClient';
import type { StandardApiResponse, DeliveryTrackingResponse } from '../../types/api';

/**
 * Public delivery tracking.
 *
 * `GET /api/v1/delivery/track/{trackingToken}` is unauthenticated by design — the token *is*
 * the credential, and it is the only thing standing between a bearer and someone's delivery.
 * Nothing here accepts or logs anything else: no job id, no provider id, no phone number.
 */
export const trackingService = {
  /**
   * An unknown or malformed token is a `ResourceNotFoundException` (404) from
   * `DeliveryService.getTracking`, not an empty result. Callers must treat it as "this link is
   * not valid" rather than as "no data yet" — those need different words on screen.
   */
  getTracking: async (token: string): Promise<DeliveryTrackingResponse> => {
    const res = await httpClient.get<StandardApiResponse<DeliveryTrackingResponse>>(
      `/api/v1/delivery/track/${encodeURIComponent(token)}`
    );
    if (!res.data?.data) {
      throw new Error('Tracking response contained no data');
    }
    return res.data.data;
  },
};
