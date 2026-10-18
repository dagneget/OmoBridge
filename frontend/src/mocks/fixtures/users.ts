import type { AuthResponse, UserProfileResponse } from '../../types/api';

export const MOCK_PASSWORD = 'Password123!';

export const mockUsers = {
  buyer: {
    id: '11111111-1111-1111-1111-111111111111',
    phoneNumber: '+251911000001',
    fullName: 'Yohannes Tesfaye',
    email: 'buyer@omobridge.et',
    roles: ['BUYER_VISITOR'],
    preferredLanguage: 'en',
    status: 'ACTIVE',
  } satisfies UserProfileResponse,

  producer: {
    id: '22222222-2222-2222-2222-222222222222',
    phoneNumber: '+251911000002',
    fullName: 'Arbilo Biya',
    roles: ['PRODUCER_FARMER'],
    preferredLanguage: 'am',
    status: 'ACTIVE',
  } satisfies UserProfileResponse,

  enterprise: {
    id: '33333333-3333-3333-3333-333333333333',
    phoneNumber: '+251911000003',
    fullName: 'South Omo Agro Union',
    email: 'admin@southomo.org',
    roles: ['MICRO_ENTERPRISE'],
    enterpriseId: '33333333-3333-3333-3333-333333333333',
    enterpriseName: 'South Omo Agro Union',
    preferredLanguage: 'am',
    status: 'ACTIVE',
  } satisfies UserProfileResponse,

  delivery: {
    id: '44444444-4444-4444-4444-444444444444',
    phoneNumber: '+251911000004',
    fullName: 'Omo Valley Express Delivery',
    roles: ['DELIVERY_PROVIDER'],
    preferredLanguage: 'en',
    status: 'ACTIVE',
  } satisfies UserProfileResponse,

  guide: {
    id: '55555555-5555-5555-5555-555555555555',
    phoneNumber: '+251911000005',
    fullName: 'Desta Girmay',
    roles: ['TOUR_GUIDE'],
    preferredLanguage: 'en',
    status: 'ACTIVE',
  } satisfies UserProfileResponse,

  admin: {
    id: '66666666-6666-6666-6666-666666666666',
    phoneNumber: '+251911000006',
    fullName: 'System Administrator',
    email: 'admin@omobridge.et',
    roles: ['SYSTEM_ADMIN'],
    preferredLanguage: 'en',
    status: 'ACTIVE',
  } satisfies UserProfileResponse,
  authority: {
    id: '77777777-7777-4777-8777-777777777777',
    phoneNumber: '+251911000007',
    fullName: 'Tourism Authority',
    roles: ['TOURISM_AUTHORITY'],
    status: 'ACTIVE',
    preferredLanguage: 'en',
  } satisfies UserProfileResponse,
};

export function createMockAuthResponse(user: UserProfileResponse): AuthResponse {
  return {
    accessToken: `mock-jwt-token-for-${user.id}`,
    tokenType: 'Bearer',
    expiresInSeconds: 86400,
    user,
  };
}
