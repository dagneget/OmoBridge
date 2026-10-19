import httpClient from '../../services/httpClient';
import type {
  SessionResponse,
  BookingCreateRequest,
  BookingResponse,
  BookingStatusUpdateRequest,
  PriceBreakdownResponse,
  StandardApiResponse,
} from '../../types/api';

export const bookingService = {
  /**
   * Fetch available sessions for a tour package
   */
  async getSessions(packageId: string): Promise<SessionResponse[]> {
    const response = await httpClient.get<StandardApiResponse<SessionResponse[]>>(
      `/api/v1/tourism/packages/${packageId}/sessions`
    );
    return response.data.data || [];
  },

  /**
   * Calculate server-provided price breakdown
   */
  async calculatePricing(
    baseAmount: number,
    enterpriseId?: string,
    appliesTo: string = 'TOURISM'
  ): Promise<PriceBreakdownResponse> {
    const params = new URLSearchParams({
      baseAmount: baseAmount.toString(),
      appliesTo,
    });
    if (enterpriseId) {
      params.append('enterpriseId', enterpriseId);
    }
    const response = await httpClient.get<StandardApiResponse<PriceBreakdownResponse>>(
      `/api/v1/pricing/calculate?${params.toString()}`
    );
    return (
      response.data.data || {
        subtotal: baseAmount,
        breakdown: [],
        total: baseAmount,
        currency: 'ETB',
      }
    );
  },

  /**
   * Create a booking with idempotency key
   */
  async createBooking(
    payload: BookingCreateRequest,
    idempotencyKey?: string
  ): Promise<BookingResponse> {
    const headers = idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined;
    const response = await httpClient.post<StandardApiResponse<BookingResponse>>(
      '/api/v1/bookings',
      payload,
      { headers }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create booking');
    }
    return response.data.data;
  },

  /**
   * Fetch a single booking by ID
   */
  async getBookingById(id: string, signal?: AbortSignal): Promise<BookingResponse> {
    const response = await httpClient.get<StandardApiResponse<BookingResponse>>(
      `/api/v1/bookings/${id}`,
      { signal }
    );
    if (response.data.success !== true || !response.data.data) {
      throw new Error(response.data.message || 'Booking not found');
    }
    return response.data.data;
  },

  /**
   * Fetch current authenticated buyer's bookings
   */
  async getMyBookings(): Promise<BookingResponse[]> {
    const response = await httpClient.get<StandardApiResponse<BookingResponse[]>>(
      '/api/v1/bookings/my'
    );
    return response.data.data || [];
  },

  /**
   * Update booking status (cancel, etc.)
   */
  async updateStatus(
    id: string,
    payload: BookingStatusUpdateRequest
  ): Promise<BookingResponse> {
    const response = await httpClient.patch<StandardApiResponse<BookingResponse>>(
      `/api/v1/bookings/${id}/status`,
      payload
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update booking status');
    }
    return response.data.data;
  },
};

export default bookingService;
