import { http, HttpResponse } from 'msw';
import { checkoutHandler, orderConfirmationHandler, myOrdersHandler, orderPaymentHandler } from './checkoutHandler';
import type { LoginRequest } from '../types/api';
import { mockUsers, createMockAuthResponse, MOCK_PASSWORD } from './fixtures/users';
import {
  mockTourPackages,
  mockSessions,
  mockHotels,
  mockGuides,
  mockTransportServices,
  mockSafetyGuidelines,
  mockProducts,
  mockTrackingResponse,
  mockPublicTrace,
} from './fixtures/catalog';

function errorResponse(status: number, code: string, message: string, request: Request) {
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(),
      status,
      code,
      message,
      path: new URL(request.url).pathname,
    },
    { status }
  );
}

const authHandlers = ['/api/v1/auth', '/api/auth'].flatMap((base) => [
  http.post(`*${base}/login`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Partial<LoginRequest> | null;
    if (!body || typeof body !== 'object' || !body.password) {
      return errorResponse(400, 'VALIDATION_FAILED', 'Password is required', request);
    }
    const identifier = body.phoneNumber || body.identifier;
    const user = Object.values(mockUsers).find(
      (candidate) =>
        candidate.phoneNumber === identifier ||
        ('email' in candidate && candidate.email === identifier)
    );
    if (!user || body.password !== MOCK_PASSWORD) {
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid credentials', request);
    }
    return HttpResponse.json({
      success: true,
      data: createMockAuthResponse(user),
    });
  }),
  http.get(`*${base}/me`, ({ request }) => {
    const user = Object.values(mockUsers).find(
      (candidate) =>
        request.headers.get('Authorization') ===
        `Bearer ${createMockAuthResponse(candidate).accessToken}`
    );
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Authentication required', request);
    return HttpResponse.json({ success: true, data: user });
  }),
]);

export const handlers = [
  ...authHandlers,
  checkoutHandler,
  orderConfirmationHandler,
  myOrdersHandler,
  orderPaymentHandler,
  // Tourism: Packages
  http.get('*/api/v1/tourism/packages', ({ request }) => {
    const category = new URL(request.url).searchParams.get('category')?.trim().toUpperCase();
    return HttpResponse.json({
      success: true,
      data: category
        ? mockTourPackages.filter((pkg) => pkg.category === category)
        : mockTourPackages,
    });
  }),

  http.get('*/api/v1/tourism/packages/:id', ({ params, request }) => {
    const pkg = mockTourPackages.find((p) => p.id === params.id);
    if (!pkg) return errorResponse(404, 'RESOURCE_NOT_FOUND', 'Package not found', request);
    return HttpResponse.json({
      success: true,
      data: pkg,
    });
  }),

  http.get('*/api/v1/tourism/packages/:packageId/sessions', ({ params, request }) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const date = new URL(request.url).searchParams.get('date') || today;
    return HttpResponse.json({
      success: true,
      data: mockSessions.filter(
        (session) => session.packageId === params.packageId && session.sessionDate === date
      ),
    });
  }),

  // Tourism: Hotels
  http.get('*/api/v1/tourism/hotels', () => {
    return HttpResponse.json({
      success: true,
      data: mockHotels,
    });
  }),

  // Tourism: Guides
  http.get('*/api/v1/tourism/guides', () => {
    return HttpResponse.json({
      success: true,
      data: mockGuides,
    });
  }),

  // Tourism: Transport
  http.get('*/api/v1/tourism/transports', () => {
    return HttpResponse.json({
      success: true,
      data: mockTransportServices,
    });
  }),

  // Tourism: Guidelines
  http.get('*/api/v1/tourism/guidelines', () => {
    return HttpResponse.json({
      success: true,
      data: mockSafetyGuidelines,
    });
  }),

  // Catalog: Products
  http.get('*/api/v1/public/products', ({ request }) => {
    const query = new URL(request.url).searchParams;
    const search = query.get('search')?.trim().toLowerCase();
    const category = query.get('category')?.trim().toLowerCase();
    const products = search
      ? mockProducts.filter((product) =>
          `${product.name} ${product.description}`.toLowerCase().includes(search)
        )
      : category
        ? mockProducts.filter((product) => product.category?.toLowerCase() === category)
        : mockProducts;
    return HttpResponse.json({
      success: true,
      data: products,
    });
  }),

  http.get('*/api/v1/public/products/:id', ({ params, request }) => {
    const prod = mockProducts.find((p) => p.id === params.id);
    if (!prod) return errorResponse(404, 'RESOURCE_NOT_FOUND', 'Product not found', request);
    return HttpResponse.json({
      success: true,
      data: prod,
    });
  }),

  // Bookings: Create
  http.post('*/api/v1/bookings', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: {
        id: 'book-mock-001',
        buyerId: mockUsers.buyer.id,
        status: 'PENDING',
        totalPrice: 4500,
        createdAt: new Date().toISOString(),
        ...body,
      },
    });
  }),

  // Checkout: Create Order
  http.post('*/api/v1/orders/checkout', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({
      success: true,
      message: 'Checkout completed and order created',
      data: {
        orderId: 'ord-mock-001',
        totalAmount: 1490,
        paymentStatus: 'UNPAID',
        createdAt: new Date().toISOString(),
        ...body,
      },
    });
  }),

  // Payments: Attempt
  http.post('*/api/v1/payments/attempt', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({
      success: true,
      message: 'Payment attempt initiated',
      data: {
        paymentId: 'pay-mock-001',
        provider: body?.provider || 'TELEBIRR',
        status: 'PENDING',
        transactionReference: 'TXN-OMO-554433',
        idempotencyKey: body?.idempotencyKey || 'mock-idem-key',
      },
    });
  }),

  // Delivery: Tracking
  http.get('*/api/v1/delivery/track/:token', () => {
    return HttpResponse.json({
      success: true,
      data: mockTrackingResponse,
    });
  }),

  // Traceability: Public Trace
  http.get('*/api/v1/trace/:publicToken', () => {
    return HttpResponse.json({
      success: true,
      data: mockPublicTrace,
    });
  }),
];
