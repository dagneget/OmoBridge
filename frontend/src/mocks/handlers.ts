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
import {
  mockImpactMetrics,
  mockFarmerBalanceSummary,
  mockEnterpriseFarmers,
  mockProductTypes,
  mockBuyingPrices,
  mockDeliveries,
  mockEnterpriseOrders,
  mockInventoryLots,
  mockInventoryLocations,
  mockInventoryMovements,
  mockFarmerPayables,
  mockFarmerPayments,
} from './fixtures/enterprise';

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

  http.get('*/api/v1/enterprises/:enterpriseId/inventory/lots', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const filtered = status
      ? mockInventoryLots.filter((lot) => lot.status === status)
      : mockInventoryLots;
    return HttpResponse.json({
      success: true,
      data: filtered,
    });
  }),

  http.get('*/api/v1/enterprises/:enterpriseId/inventory/lots/:lotId', ({ params }) => {
    const { lotId } = params;
    const lot = mockInventoryLots.find((l) => l.id === lotId);
    if (!lot) {
      return HttpResponse.json({ success: false, message: 'Lot not found' }, { status: 404 });
    }
    return HttpResponse.json({
      success: true,
      data: lot,
    });
  }),

  http.get('*/api/v1/enterprises/:enterpriseId/inventory/lots/:lotId/movements', ({ params }) => {
    const { lotId } = params;
    const movements = (lotId && mockInventoryMovements[lotId as string]) || [];
    return HttpResponse.json({
      success: true,
      data: movements,
    });
  }),

  http.get('*/api/v1/enterprises/:enterpriseId/inventory/locations', () => {
    return HttpResponse.json({
      success: true,
      data: mockInventoryLocations,
    });
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/inventory/locations', async ({ params, request }) => {
    const { enterpriseId } = params;
    const body = (await request.json().catch(() => ({}))) as any;
    const newLocation = {
      id: `loc-${Date.now()}`,
      enterpriseId: enterpriseId as string,
      name: body.name || 'New Warehouse Bay',
      locationType: body.locationType || 'WAREHOUSE',
      description: body.description || '',
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(
      {
        success: true,
        data: newLocation,
      },
      { status: 201 }
    );
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
