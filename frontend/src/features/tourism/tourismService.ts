import httpClient from '../../services/httpClient';
import type {
  TourPackageResponse,
  Hotel,
  GuideResponse,
  TransportService,
  SafetyGuideline,
  SessionResponse,
  StandardApiResponse,
} from '../../types/api';

export const tourismService = {
  /**
   * Fetch all active tour packages
   */
  async getPackages(): Promise<TourPackageResponse[]> {
    const response = await httpClient.get<StandardApiResponse<TourPackageResponse[]>>(
      '/api/v1/tourism/packages'
    );
    return response.data.data || [];
  },

  /**
   * Fetch a single tour package by ID
   */
  async getPackageById(id: string): Promise<TourPackageResponse> {
    const response = await httpClient.get<StandardApiResponse<TourPackageResponse>>(
      `/api/v1/tourism/packages/${id}`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Tour package not found');
    }
    return response.data.data;
  },

  /**
   * Fetch available sessions for a package
   */
  async getPackageSessions(packageId: string): Promise<SessionResponse[]> {
    const response = await httpClient.get<StandardApiResponse<SessionResponse[]>>(
      `/api/v1/tourism/packages/${packageId}/sessions`
    );
    return response.data.data || [];
  },

  /**
   * Fetch hotel listings
   */
  async getHotels(): Promise<Hotel[]> {
    const response = await httpClient.get<StandardApiResponse<Hotel[]>>(
      '/api/v1/tourism/hotels'
    );
    return response.data.data || [];
  },

  /**
   * Fetch certified guides
   */
  async getGuides(): Promise<GuideResponse[]> {
    const response = await httpClient.get<StandardApiResponse<GuideResponse[]>>(
      '/api/v1/tourism/guides'
    );
    return response.data.data || [];
  },

  /**
   * Fetch safety and cultural guidelines
   */
  async getGuidelines(): Promise<SafetyGuideline[]> {
    const response = await httpClient.get<StandardApiResponse<SafetyGuideline[]>>(
      '/api/v1/tourism/guidelines'
    );
    return response.data.data || [];
  },

  /**
   * Fetch transport services
   */
  async getTransportServices(): Promise<TransportService[]> {
    const response = await httpClient.get<StandardApiResponse<TransportService[]>>(
      '/api/v1/tourism/transports'
    );
    return response.data.data || [];
  },
};
