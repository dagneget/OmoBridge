import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { server } from '../mocks/server';
import { mockUsers, MOCK_PASSWORD } from '../mocks/fixtures/users';
import { mockTourPackages, mockProducts, MOCK_SESSION_DATE } from '../mocks/fixtures/catalog';
import authService from '../features/auth/authService';
import { httpClient, TOKEN_STORAGE_KEY } from '../services/httpClient';

describe('MSW mock layer (F-007)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
    vi.useRealTimers();
  });

  afterAll(() => {
    server.close();
  });

  it('mocks login request and returns typed AuthResponse for buyer and producer', async () => {
    const buyerRes = await fetch('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '+251911000001',
        password: MOCK_PASSWORD,
      }),
    });
    expect(buyerRes.status).toBe(200);
    const buyerData = await buyerRes.json();
    expect(buyerData.success).toBe(true);
    expect(buyerData.data.user.roles).toEqual(['BUYER_VISITOR']);
    expect(buyerData.data.accessToken).toContain('mock-jwt-token');

    const producerRes = await fetch('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '+251911000002',
        password: MOCK_PASSWORD,
      }),
    });
    const producerData = await producerRes.json();
    expect(producerData.data.user.roles).toEqual(['PRODUCER_FARMER']);
  });

  it('mocks tourism packages and details endpoint', async () => {
    const listRes = await fetch('http://localhost/api/v1/tourism/packages');
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.data).toHaveLength(2);
    expect(listData.data[0].name).toBe('Mursi & Hamar Cultural Immersion');

    const detailRes = await fetch(
      `http://localhost/api/v1/tourism/packages/${mockTourPackages[0].id}`
    );
    const detailData = await detailRes.json();
    expect(detailData.data.id).toBe(mockTourPackages[0].id);
    expect(detailData.data.priceAmount).toBe(4500);
  });

  it('mocks product catalog endpoint', async () => {
    const res = await fetch('http://localhost/api/v1/public/products');
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
        packageId: mockTourPackages[0].id,
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
        items: [{ productId: mockProducts[0].id, quantity: 2 }],
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
  it.each(Object.entries(mockUsers))(
    'authService logs in and restores the %s profile',
    async (_name, user) => {
      const previousAdapter = httpClient.defaults.adapter;
      httpClient.defaults.adapter = 'fetch';
      try {
        const auth = await authService.login({
          phoneNumber: user.phoneNumber,
          password: MOCK_PASSWORD,
        });
        expect(auth.user?.roles).toEqual(user.roles);
        expect(auth.user?.status).toBe('ACTIVE');
        localStorage.setItem(TOKEN_STORAGE_KEY, auth.accessToken!);
        const profile = await authService.getCurrentUser();
        expect(profile.id).toBe(user.id);
        expect(profile.roles).toEqual(user.roles);
      } finally {
        httpClient.defaults.adapter = previousAdapter;
      }
    }
  );

  it.each(['/api/v1/auth', '/api/auth'])('supports login/me under %s', async (base) => {
    const login = await fetch(`http://localhost${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: mockUsers.buyer.email,
        password: MOCK_PASSWORD,
      }),
    });
    const auth = await login.json();
    const profile = await fetch(`http://localhost${base}/me`, {
      headers: { Authorization: `Bearer ${auth.data.accessToken}` },
    });
    expect((await profile.json()).data.id).toBe(mockUsers.buyer.id);
  });

  it.each([undefined, 'Bearer invalid-token'])(
    'rejects missing or invalid profile credentials (%s)',
    async (token) => {
      const res = await fetch('http://localhost/api/v1/auth/me', {
        headers: token ? { Authorization: token } : {},
      });
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe('UNAUTHORIZED');
    }
  );

  it.each([
    { phoneNumber: mockUsers.buyer.phoneNumber, password: 'wrong' },
    { phoneNumber: '+251911999999', password: MOCK_PASSWORD },
  ])('rejects incorrect login credentials', async (body) => {
    const res = await fetch('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(401);
  });

  it('filters package categories and returns empty results for no matches', async () => {
    const res = await fetch('http://localhost/api/v1/tourism/packages?category=cultural');
    expect((await res.json()).data.map((pkg: { category: string }) => pkg.category)).toEqual([
      'CULTURAL',
    ]);
    const empty = await fetch('http://localhost/api/v1/tourism/packages?category=unknown');
    expect((await empty.json()).data).toEqual([]);
  });

  it('serves the plural transport path', async () => {
    const res = await fetch('http://localhost/api/v1/tourism/transports');
    expect(res.status).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });

  it.each(['tourism/packages', 'public/products'])(
    'returns a structured 404 for unknown %s IDs',
    async (path) => {
      const res = await fetch(
        `http://localhost/api/v1/${path}/00000000-0000-4000-8000-000000000000`
      );
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    }
  );

  it('returns sessions for the selected package/date including a full session', async () => {
    const res = await fetch(
      `http://localhost/api/v1/tourism/packages/${mockTourPackages[0].id}/sessions?date=${MOCK_SESSION_DATE}`
    );
    const { data } = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      availableCapacity: 6,
      status: 'OPEN',
      sessionDate: MOCK_SESSION_DATE,
    });
    expect(data[1]).toMatchObject({ availableCapacity: 0, status: 'CLOSED' });
    const empty = await fetch(
      `http://localhost/api/v1/tourism/packages/${mockTourPackages[1].id}/sessions?date=${MOCK_SESSION_DATE}`
    );
    expect((await empty.json()).data).toEqual([]);
    const otherDate = await fetch(
      `http://localhost/api/v1/tourism/packages/${mockTourPackages[0].id}/sessions?date=2026-11-02`
    );
    expect((await otherDate.json()).data).toEqual([]);
  });

  it('uses UUID identifiers for catalog fixtures', () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const fixture of [...mockTourPackages, ...mockProducts]) expect(fixture.id).toMatch(uuid);
  });

  it('defaults sessions to today rather than all upcoming dates', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-01T12:00:00'));
    const res = await fetch(
      `http://localhost/api/v1/tourism/packages/${mockTourPackages[0].id}/sessions`
    );
    expect((await res.json()).data).toHaveLength(2);
    vi.setSystemTime(new Date('2026-11-02T12:00:00'));
    const empty = await fetch(
      `http://localhost/api/v1/tourism/packages/${mockTourPackages[0].id}/sessions`
    );
    expect((await empty.json()).data).toEqual([]);
  });
  it('filters the public catalog by search or category and supports empty results', async () => {
    const res = await fetch('http://localhost/api/v1/public/products?search=honey');
    expect((await res.json()).data.map((product: { id: string }) => product.id)).toEqual([
      mockProducts[0].id,
    ]);
    const category = await fetch(
      'http://localhost/api/v1/public/products?category=artisan%20crafts'
    );
    expect((await category.json()).data.map((product: { id: string }) => product.id)).toEqual([
      mockProducts[2].id,
    ]);
    const empty = await fetch('http://localhost/api/v1/public/products?search=missing');
    expect((await empty.json()).data).toEqual([]);
  });
});
