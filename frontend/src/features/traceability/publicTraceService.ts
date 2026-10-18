import { httpClient } from '../../services/httpClient';
import type { StandardApiResponse, PublicTraceResponse } from '../../types/api';

/**
 * Public traceability lookup.
 *
 * `GET /api/v1/trace/{publicToken}` is unauthenticated: the token is the credential, and it is
 * printed on a QR code attached to a physical product, so it travels far from any session.
 *
 * ## This endpoint is not free to call
 * `TraceabilityService.getPublicTrace` writes a `TraceScan` row on **every** request, and the
 * response's `scanCount` is the running total of those rows. A page that refetches on window
 * focus, on reconnect, or on a poll would inflate a product's scan count with no human behind
 * it — which is a number producers read as customer interest. Callers must fetch once and cache.
 */
export const publicTraceService = {
  /** An unknown token is a `ResourceNotFoundException` (404), not an empty result. */
  getPublicTrace: async (publicToken: string): Promise<PublicTraceResponse> => {
    const res = await httpClient.get<StandardApiResponse<PublicTraceResponse>>(
      `/api/v1/trace/${encodeURIComponent(publicToken)}`
    );
    if (!res.data?.data) {
      throw new Error('Trace response contained no data');
    }
    return res.data.data;
  },
};
