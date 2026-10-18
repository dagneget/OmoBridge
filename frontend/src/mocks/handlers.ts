import { http, HttpResponse } from 'msw';
import { mockUsers, createMockAuthResponse } from './fixtures/users';
import {
  mockTourPackages,
  mockHotels,
  mockGuides,
  mockTransportServices,
  mockSafetyGuidelines,
  mockProducts,
  mockTrackingResponse,
  mockPublicTrace,
} from './fixtures/catalog';

export const handlers = [
  // Auth: Login
  http.post('*/api/v1/identity/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const phone = body?.phoneNumber || body?.identifier || '';

    // Route to appropriate mock role based on phone or default to buyer
    let user = mockUsers.buyer;
    if (phone.includes('000002')) user = mockUsers.producer;
    else if (phone.includes('000003')) user = mockUsers.enterprise;
    else if (phone.includes('000004')) user = mockUsers.delivery;
    else if (phone.includes('000005')) user = mockUsers.guide;
    else if (phone.includes('000006')) user = mockUsers.admin;

    return HttpResponse.json({
      success: true,
      message: 'Authentication successful',
      data: createMockAuthResponse(user),
    });
  }),

  // Auth: Mirrored /api/auth/login
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const phone = body?.phoneNumber || body?.identifier || '';
    let user = mockUsers.buyer;
    if (phone.includes('000002')) user = mockUsers.producer;
    return HttpResponse.json({
      success: true,
      message: 'Authentication successful',
      data: createMockAuthResponse(user),
    });
  }),

  // Auth: Current Profile
  http.get('*/api/v1/identity/profile', () => {
    return HttpResponse.json({
      success: true,
      data: mockUsers.buyer,
    });
  }),

  // Tourism: Packages
  http.get('*/api/v1/tourism/packages', () => {
    return HttpResponse.json({
      success: true,
      data: mockTourPackages,
    });
  }),

  http.get('*/api/v1/tourism/packages/:id', ({ params }) => {
    const pkg = mockTourPackages.find((p) => p.id === params.id) || mockTourPackages[0];
    return HttpResponse.json({
      success: true,
      data: pkg,
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
  http.get('*/api/v1/tourism/transport', () => {
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
  http.get('*/api/v1/products', () => {
    return HttpResponse.json({
      success: true,
      data: mockProducts,
    });
  }),

  http.get('*/api/v1/products/:id', ({ params }) => {
    const prod = mockProducts.find((p) => p.id === params.id) || mockProducts[0];
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
