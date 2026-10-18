import httpClient from '../../services/httpClient';
import type {
  SessionResponse,
  BookingCreateRequest,
  BookingResponse,
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
  async getBookingById(id: string): Promise<BookingResponse> {
    const response = await httpClient.get<StandardApiResponse<BookingResponse>>(
      `/api/v1/bookings/${id}`
    );
    if (!response.data.data) {
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
};

export default bookingService;
