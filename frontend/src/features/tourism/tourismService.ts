import { getPreferredLanguage } from '../../i18n/languages';
import httpClient from '../../services/httpClient';
import type {
  TourPackageResponse,
  TourPackageRequest,
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
  async getPackages(language = getPreferredLanguage()): Promise<TourPackageResponse[]> {
    const response = await httpClient.get<StandardApiResponse<TourPackageResponse[]>>(
      '/api/v1/tourism/packages',
      { params: { lang: language } }
    );
    return response.data.data || [];
  },

  /**
   * Fetch a single tour package by ID
   */
  async getPackageById(id: string, language = getPreferredLanguage()): Promise<TourPackageResponse> {
    const response = await httpClient.get<StandardApiResponse<TourPackageResponse>>(
      `/api/v1/tourism/packages/${id}`,
      { params: { lang: language } }
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

  /**
   * Enterprise Tourism Package Management (F-911)
   */
  async getEnterprisePackages(enterpriseId: string): Promise<TourPackageResponse[]> {
    const response = await httpClient.get<StandardApiResponse<TourPackageResponse[]>>(
      `/api/v1/enterprises/${enterpriseId}/tourism/packages`
    );
    return response.data.data || [];
  },

  async createPackage(enterpriseId: string, request: TourPackageRequest): Promise<TourPackageResponse> {
    const response = await httpClient.post<StandardApiResponse<TourPackageResponse>>(
      `/api/v1/enterprises/${enterpriseId}/tourism/packages`,
      request
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create tour package');
    }
    return response.data.data;
  },

  async updatePackage(
    enterpriseId: string,
    id: string,
    request: TourPackageRequest
  ): Promise<TourPackageResponse> {
    const response = await httpClient.put<StandardApiResponse<TourPackageResponse>>(
      `/api/v1/enterprises/${enterpriseId}/tourism/packages/${id}`,
      request
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update tour package');
    }
    return response.data.data;
  },

  async deletePackage(enterpriseId: string, id: string): Promise<void> {
    await httpClient.delete(`/api/v1/enterprises/${enterpriseId}/tourism/packages/${id}`);
  },
};

