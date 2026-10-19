import httpClient from '../../services/httpClient';
import type {
  BookingResponse,
  GuideProfileRequest,
  GuideResponse,
  ReviewSummaryResponse,
  StandardApiResponse,
} from '../../types/api';

/**
 * F-1201..F-1203 guide dashboard data access.
 *
 * Every call is scoped to the authenticated guide by the server:
 *   GET  /api/v1/tourism/guides/me                       (hasRole('TOUR_GUIDE'))
 *   PUT  /api/v1/tourism/guides/{id}                     (isAssignedGuide or ADMIN)
 *   GET  /api/v1/bookings/guides/{guideId}               (isAssignedGuide or ADMIN)
 *   PATCH /api/v1/bookings/{id}/status                   (admin | enterprise | buyer | guide)
 *   GET  /api/v1/reviews/public/target?targetType=GUIDE  (public read)
 *
 * Guide query keys live here rather than in the shared queryKeys module, which
 * Codex owns; see docs/handoffs/F-1201.md for the proposed shared addition.
 */
export const guideKeys = {
  all: ['guide'] as const,
  profile: () => [...guideKeys.all, 'profile'] as const,
  bookings: (guideId: string) => [...guideKeys.all, 'bookings', guideId] as const,
  reviews: (guideId: string) => [...guideKeys.all, 'reviews', guideId] as const,
};

/** Statuses a guide may set on an assigned booking (accept / decline). */
export type GuideBookingAction = 'CONFIRMED' | 'DECLINED';

export const guideService = {
  /**
   * F-1201: the authenticated guide's own profile.
   *
   * This is the only source of the guide id used for edits. Callers must never
   * take a guide id from a route parameter or user input, so one guide cannot
   * address another guide's record.
   */
  async getMyProfile(): Promise<GuideResponse> {
    const response = await httpClient.get<StandardApiResponse<GuideResponse>>(
      '/api/v1/tourism/guides/me'
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Guide profile not found');
    }
    return response.data.data;
  },

  /**
   * F-1201: update bio, languages, specialties, daily rate and availability.
   * The server re-checks ownership via `isAssignedGuide(authentication, id)`.
   */
  async updateProfile(id: string, request: GuideProfileRequest): Promise<GuideResponse> {
    const response = await httpClient.put<StandardApiResponse<GuideResponse>>(
      `/api/v1/tourism/guides/${id}`,
      request
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Guide profile update failed');
    }
    return response.data.data;
  },

  /**
   * F-1202: bookings assigned to this guide only.
   *
   * Uses the guide-scoped endpoint rather than `/bookings/my`, which returns
   * the caller's bookings as a *buyer*. Only the server decides assignment.
   */
  async getAssignedBookings(guideId: string): Promise<BookingResponse[]> {
    const response = await httpClient.get<StandardApiResponse<BookingResponse[]>>(
      `/api/v1/bookings/guides/${guideId}`
    );
    return response.data.data || [];
  },

  /** F-1202: accept (CONFIRMED) or decline (DECLINED) an assigned booking. */
  async updateBookingStatus(
    bookingId: string,
    status: GuideBookingAction,
    notes?: string
  ): Promise<BookingResponse> {
    const response = await httpClient.patch<StandardApiResponse<BookingResponse>>(
      `/api/v1/bookings/${bookingId}/status`,
      { status, ...(notes ? { notes } : {}) }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Booking status update failed');
    }
    return response.data.data;
  },

  /**
   * F-1203: reviews and aggregate rating for this guide.
   *
   * There is no guide payments endpoint in the backend, so payment records are
   * not requested here. See docs/frontend-plan.md section 10, gap F-1203-P1.
   */
  async getMyReviews(guideId: string): Promise<ReviewSummaryResponse> {
    const response = await httpClient.get<StandardApiResponse<ReviewSummaryResponse>>(
      '/api/v1/reviews/public/target',
      { params: { targetType: 'GUIDE', targetId: guideId } }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Reviews not available');
    }
    return response.data.data;
  },
};
