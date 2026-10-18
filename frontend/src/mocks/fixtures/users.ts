import type { AuthResponse, UserProfileResponse } from '../../types/api';

export const mockUsers = {
  buyer: {
    id: '11111111-1111-1111-1111-111111111111',
    phoneNumber: '+251911000001',
    fullName: 'Yohannes Tesfaye',
    email: 'buyer@omobridge.et',
    role: 'BUYER',
    preferredLanguage: 'en',
    isActive: true,
  } as UserProfileResponse,

  producer: {
    id: '22222222-2222-2222-2222-222222222222',
    phoneNumber: '+251911000002',
    fullName: 'Arbilo Biya',
    role: 'PRODUCER',
    preferredLanguage: 'am',
    isActive: true,
  } as UserProfileResponse,

  enterprise: {
    id: '33333333-3333-3333-3333-333333333333',
    phoneNumber: '+251911000003',
    fullName: 'South Omo Agro Union',
    email: 'admin@southomo.org',
    role: 'ENTERPRISE',
    preferredLanguage: 'am',
    isActive: true,
  } as UserProfileResponse,

  delivery: {
    id: '44444444-4444-4444-4444-444444444444',
    phoneNumber: '+251911000004',
    fullName: 'Omo Valley Express Delivery',
    role: 'DELIVERY_PROVIDER',
    preferredLanguage: 'en',
    isActive: true,
  } as UserProfileResponse,

  guide: {
    id: '55555555-5555-5555-5555-555555555555',
    phoneNumber: '+251911000005',
    fullName: 'Desta Girmay',
    role: 'TOUR_GUIDE',
    preferredLanguage: 'en',
    isActive: true,
  } as UserProfileResponse,

  admin: {
    id: '66666666-6666-6666-6666-666666666666',
    phoneNumber: '+251911000006',
    fullName: 'System Administrator',
    email: 'admin@omobridge.et',
    role: 'ADMIN',
    preferredLanguage: 'en',
    isActive: true,
  } as UserProfileResponse,
};

export function createMockAuthResponse(user: UserProfileResponse): AuthResponse {
  return {
    accessToken: `mock-jwt-token-for-${user.id}`,
    tokenType: 'Bearer',
    expiresInSeconds: 86400,
    user,
  };
}
