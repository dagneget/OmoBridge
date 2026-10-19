import httpClient from '../../services/httpClient';
import type {
  LoginRequest,
  AuthResponse,
  UserProfileResponse,
  BuyerRegisterRequest,
  ProducerRegisterRequest,
  EnterpriseRegisterRequest,
  DeliveryProviderRegisterRequest,
  GuideRegisterRequest,
  StandardApiResponse,
} from '../../types/api';

export const authService = {
  /**
   * Authenticate user with phone/identifier and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await httpClient.post<StandardApiResponse<AuthResponse>>(
      '/api/v1/auth/login',
      credentials
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Login failed: no response data');
    }
    return response.data.data;
  },

  /**
   * Fetch current authenticated user's profile and roles
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    const response = await httpClient.get<StandardApiResponse<UserProfileResponse>>('/api/v1/auth/me');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Could not fetch user profile');
    }
    return response.data.data;
  },

  /**
   * Register buyer/visitor
   */
  async registerBuyer(data: BuyerRegisterRequest): Promise<AuthResponse> {
    const response = await httpClient.post<StandardApiResponse<AuthResponse>>(
      '/api/v1/auth/register/buyer',
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Buyer registration failed');
    }
    return response.data.data;
  },

  /**
   * Register producer / farmer
   */
  async registerProducer(data: ProducerRegisterRequest): Promise<AuthResponse> {
    const response = await httpClient.post<StandardApiResponse<AuthResponse>>(
      '/api/v1/auth/register/producer',
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Producer registration failed');
    }
    return response.data.data;
  },

  /**
   * Register micro-enterprise
   */
  async registerEnterprise(data: EnterpriseRegisterRequest): Promise<AuthResponse> {
    const response = await httpClient.post<StandardApiResponse<AuthResponse>>(
      '/api/v1/auth/register/enterprise',
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Enterprise registration failed');
    }
    return response.data.data;
  },

  /**
   * Register delivery provider
   */
  async registerDeliveryProvider(data: DeliveryProviderRegisterRequest): Promise<AuthResponse> {
    const response = await httpClient.post<StandardApiResponse<AuthResponse>>(
      '/api/v1/auth/register/delivery-provider',
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Delivery provider registration failed');
    }
    return response.data.data;
  },

  /**
   * Register tour guide
   */
  async registerGuide(data: GuideRegisterRequest): Promise<AuthResponse> {
    const response = await httpClient.post<StandardApiResponse<AuthResponse>>(
      '/api/v1/auth/register/guide',
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Guide registration failed');
    }
    return response.data.data;
  },
};

export default authService;
