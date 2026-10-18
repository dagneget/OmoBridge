import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../mocks/server';

describe('MSW mock layer (F-007)', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('mocks login request and returns typed AuthResponse for buyer and producer', async () => {
    const buyerRes = await fetch('http://localhost/api/v1/identity/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '+251911000001',
        password: 'SecretPassword123!',
      }),
    });
    expect(buyerRes.status).toBe(200);
    const buyerData = await buyerRes.json();
    expect(buyerData.success).toBe(true);
    expect(buyerData.data.user.role).toBe('BUYER');
    expect(buyerData.data.accessToken).toContain('mock-jwt-token');

    const producerRes = await fetch('http://localhost/api/v1/identity/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '+251911000002',
        password: 'SecretPassword123!',
      }),
    });
    const producerData = await producerRes.json();
    expect(producerData.data.user.role).toBe('PRODUCER');
  });

  it('mocks tourism packages and details endpoint', async () => {
    const listRes = await fetch('http://localhost/api/v1/tourism/packages');
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.data).toHaveLength(2);
    expect(listData.data[0].name).toBe('Mursi & Hamar Cultural Immersion');

    const detailRes = await fetch('http://localhost/api/v1/tourism/packages/pack-001');
    const detailData = await detailRes.json();
    expect(detailData.data.id).toBe('pack-001');
    expect(detailData.data.priceAmount).toBe(4500);
  });

  it('mocks product catalog endpoint', async () => {
    const res = await fetch('http://localhost/api/v1/products');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.data[0].name).toContain('Honey');
  });

  it('mocks booking creation and checkout order generation', async () => {
    const bookingRes = await fetch('http://localhost/api/v1/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: 'pack-001',
        sessionDate: '2026-11-01',
        numberOfPeople: 2,
      }),
    });
    expect(bookingRes.status).toBe(200);
    const bookingData = await bookingRes.json();
    expect(bookingData.data.id).toBe('book-mock-001');
    expect(bookingData.data.status).toBe('PENDING');

    const orderRes = await fetch('http://localhost/api/v1/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 'prod-001', quantity: 2 }],
      }),
    });
    expect(orderRes.status).toBe(200);
    const orderData = await orderRes.json();
    expect(orderData.data.orderId).toBe('ord-mock-001');
  });

  it('mocks payment attempt and delivery tracking stream', async () => {
    const payRes = await fetch('http://localhost/api/v1/payments/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: 'ord-mock-001',
        provider: 'TELEBIRR',
        idempotencyKey: 'idem-test-999',
      }),
    });
    const payData = await payRes.json();
    expect(payData.data.status).toBe('PENDING');
    expect(payData.data.transactionReference).toBe('TXN-OMO-554433');

    const trackRes = await fetch('http://localhost/api/v1/delivery/track/TRK-OMO-9876');
    const trackData = await trackRes.json();
    expect(trackData.data.status).toBe('IN_TRANSIT');
    expect(trackData.data.currentLatitude).toBe(5.4678);
  });
});
