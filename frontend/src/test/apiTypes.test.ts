import { describe, it, expect } from 'vitest';
import type {
  LoginRequest,
  BuyerRegisterRequest,
  StandardApiResponse,
  TourPackageResponse,
  CreatePaymentAttemptRequest,
  CheckoutRequest,
} from '../types/api';

describe('Generated API types and client helpers (F-004)', () => {
  it('enforces exact shape of LoginRequest matching backend OpenAPI', () => {
    const loginPayload: LoginRequest = {
      identifier: '+251911234567',
      phoneNumber: '+251911234567',
      password: 'SecretPassword123!',
    };
    expect(loginPayload.identifier).toBe('+251911234567');
    expect(loginPayload.password).toBe('SecretPassword123!');
  });

  it('enforces shape of BuyerRegisterRequest matching backend OpenAPI', () => {
    const registerPayload: BuyerRegisterRequest = {
      phoneNumber: '+251911234567',
      password: 'SecretPassword123!',
      fullName: 'Abebe Bikila',
      email: 'abebe@example.com',
      preferredLanguage: 'am',
    };
    expect(registerPayload.phoneNumber).toBe('+251911234567');
    expect(registerPayload.fullName).toBe('Abebe Bikila');
    expect(registerPayload.preferredLanguage).toBe('am');
  });

  it('correctly models StandardApiResponse generic envelope with TourPackageResponse', () => {
    const mockTour: TourPackageResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Mursi & Hamar Cultural Immersion',
      priceAmount: 2500,
      isActive: true,
    };

    const envelope: StandardApiResponse<TourPackageResponse> = {
      success: true,
      data: mockTour,
      message: 'Tour package retrieved',
      timestamp: '2026-10-18T00:00:00Z',
    };

    expect(envelope.success).toBe(true);
    expect(envelope.data?.id).toBe(mockTour.id);
    expect(envelope.data?.name).toBe('Mursi & Hamar Cultural Immersion');
    expect(envelope.data?.priceAmount).toBe(2500);
  });

  it('enforces CheckoutRequest and CreatePaymentAttemptRequest fields matching backend', () => {
    const checkout: CheckoutRequest = {
      items: [
        {
          productId: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 2,
        },
      ],
      deliveryAddress: 'Jinka Town, Center',
      deliveryPhone: '+251911234567',
    };

    const payment: CreatePaymentAttemptRequest = {
      orderId: '123e4567-e89b-12d3-a456-426614174002',
      provider: 'TELEBIRR',
      idempotencyKey: 'idem-test-12345',
    };

    expect(checkout.items).toHaveLength(1);
    expect(payment.provider).toBe('TELEBIRR');
    expect(payment.idempotencyKey).toBe('idem-test-12345');
  });
});
