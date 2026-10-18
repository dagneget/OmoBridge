import { reviewHandlers } from './reviewHandlers';
import { paymentHistoryHandlers } from './paymentHistoryHandlers';
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
import {
  mockImpactMetrics,
  mockFarmerBalanceSummary,
  mockEnterpriseFarmers,
  mockProductTypes,
  mockBuyingPrices,
  mockDeliveries,
  mockEnterpriseOrders,
  mockInventoryLots,
  mockFarmerPayables,
  mockFarmerPayments,
} from './fixtures/enterprise';

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
  ...reviewHandlers,
  ...paymentHistoryHandlers,
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

  // Enterprise: Impact Metrics
  http.get('*/api/v1/enterprises/:enterpriseId/reports/impact-metrics', () => {
    return HttpResponse.json({
      success: true,
      data: mockImpactMetrics,
    });
  }),

  // Enterprise: Farmer Balances Summary
  http.get('*/api/v1/enterprises/:enterpriseId/reports/farmer-balances', () => {
    return HttpResponse.json({
      success: true,
      data: mockFarmerBalanceSummary,
    });
  }),

  // Enterprise: Farmers List
  http.get('*/api/v1/enterprises/:enterpriseId/farmers', () => {
    return HttpResponse.json({
      success: true,
      data: mockEnterpriseFarmers,
    });
  }),

  http.patch('*/api/v1/enterprises/:enterpriseId/farmers/:farmerId/approve', ({ params }) => {
    const farmer = mockEnterpriseFarmers.find((f) => f.id === params.farmerId) || mockEnterpriseFarmers[0];
    return HttpResponse.json({
      success: true,
      message: 'Farmer approved successfully',
      data: { ...farmer, verificationStatus: 'VERIFIED' },
    });
  }),

  http.patch('*/api/v1/enterprises/:enterpriseId/farmers/:farmerId/reject', ({ params }) => {
    const farmer = mockEnterpriseFarmers.find((f) => f.id === params.farmerId) || mockEnterpriseFarmers[0];
    return HttpResponse.json({
      success: true,
      message: 'Farmer rejected',
      data: { ...farmer, verificationStatus: 'REJECTED' },
    });
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/farmers/:farmerId/link', ({ params }) => {
    const farmer = mockEnterpriseFarmers.find((f) => f.id === params.farmerId) || mockEnterpriseFarmers[0];
    return HttpResponse.json({
      success: true,
      message: 'Farmer linked successfully',
      data: farmer,
    });
  }),

  // Enterprise: Supply Deliveries
  http.get('*/api/v1/supply-deliveries/enterprises/:enterpriseId', () => {
    return HttpResponse.json({
      success: true,
      data: mockDeliveries,
    });
  }),

  http.get('*/api/v1/supply-deliveries/:id', ({ params }) => {
    const delivery = mockDeliveries.find((d) => d.id === params.id) || mockDeliveries[0];
    return HttpResponse.json({
      success: true,
      data: delivery,
    });
  }),

  http.post('*/api/v1/supply-deliveries', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const newDelivery = {
      id: `del-new-${Date.now()}`,
      deliveryNo: `DEL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      enterpriseId: body?.enterpriseId || '33333333-3333-3333-3333-333333333333',
      farmerId: body?.farmerId,
      deliveredAt: body?.deliveredAt || new Date().toISOString(),
      status: 'RECORDED',
      notes: body?.notes,
      totalDeliveredValue: 15000,
      items: body?.items || [],
    };
    return HttpResponse.json({
      success: true,
      message: 'Delivery recorded successfully',
      data: newDelivery,
    });
  }),

  http.patch('*/api/v1/supply-deliveries/:id/inspect', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const delivery = mockDeliveries.find((d) => d.id === params.id) || mockDeliveries[0];
    return HttpResponse.json({
      success: true,
      message: 'Delivery inspected successfully',
      data: {
        ...delivery,
        status: 'INSPECTED',
        inspectionItems: body?.items,
      },
    });
  }),

  http.post('*/api/v1/supply-deliveries/:id/cancel', ({ params }) => {
    const delivery = mockDeliveries.find((d) => d.id === params.id) || mockDeliveries[0];
    return HttpResponse.json({
      success: true,
      message: 'Delivery cancelled',
      data: { ...delivery, status: 'CANCELLED' },
    });
  }),

  // Enterprise: Product Types
  http.get('*/api/v1/product-types', () => {
    return HttpResponse.json({
      success: true,
      data: mockProductTypes,
    });
  }),

  http.post('*/api/v1/product-types', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const newPt = {
      id: `pt-${Date.now()}`,
      ...body,
    };
    return HttpResponse.json({
      success: true,
      message: 'Product type created',
      data: newPt,
    });
  }),

  // Enterprise: Buying Prices
  http.get('*/api/v1/buying-prices/enterprises/:enterpriseId', () => {
    return HttpResponse.json({
      success: true,
      data: mockBuyingPrices,
    });
  }),

  http.post('*/api/v1/buying-prices', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const newBp = {
      id: `bp-${Date.now()}`,
      ...body,
      isActive: true,
    };
    return HttpResponse.json({
      success: true,
      message: 'Buying price created',
      data: newBp,
    });
  }),

  // Enterprise: Orders & Lots
  http.get('*/api/v1/enterprises/:enterpriseId/orders', () => {
    return HttpResponse.json({
      success: true,
      data: mockEnterpriseOrders,
    });
  }),

  http.get('*/api/v1/enterprises/:enterpriseId/inventory/lots', () => {
    return HttpResponse.json({
      success: true,
      data: mockInventoryLots,
    });
  }),

  // Farmer Portal / Payables / Payments
  http.get('*/api/v1/farmers/:farmerId/payables', () => {
    return HttpResponse.json({
      success: true,
      data: mockFarmerPayables,
    });
  }),

  http.get('*/api/v1/farmers/:farmerId/balance', () => {
    return HttpResponse.json({
      success: true,
      data: mockFarmerBalanceSummary,
    });
  }),

  http.get('*/api/v1/farmer-payments/enterprises/:enterpriseId', () => {
    return HttpResponse.json({
      success: true,
      data: mockFarmerPayments,
    });
  }),

  http.post('*/api/v1/farmer-payments', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const newPmt = {
      id: `pmt-${Date.now()}`,
      paymentNo: `PMT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      enterpriseId: body?.enterpriseId,
      farmerId: body?.farmerId,
      amount: body?.amount,
      paymentMethod: body?.paymentMethod || 'TELEBIRR',
      status: 'SETTLED',
      referenceNumber: `TXN-OMO-${Date.now()}`,
      paidAt: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      message: 'Farmer payment recorded',
      data: newPmt,
    });
  }),
];
