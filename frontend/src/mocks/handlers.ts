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
  mockProductionBatches,
  mockEnterpriseProducts,
  mockOrderDetails,
  mockAiReports,
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

  http.get('*/api/v1/enterprises/:enterpriseId/orders/:orderId', ({ params }) => {
    const { orderId } = params;
    const order = mockOrderDetails[String(orderId)];
    if (!order) {
      return HttpResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }
    return HttpResponse.json({
      success: true,
      data: order,
    });
  }),

  http.patch('*/api/v1/enterprises/:enterpriseId/orders/:orderId/status', async ({ params, request }) => {
    const { orderId } = params;
    const body = (await request.json().catch(() => ({}))) as { newStatus?: string; reason?: string };
    const order = mockOrderDetails[String(orderId)];
    if (!order) {
      return HttpResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const currentStatus = order.status || 'PLACED';
    const newStatus = body.newStatus;
    if (!newStatus) {
      return HttpResponse.json({ success: false, message: 'newStatus is required' }, { status: 400 });
    }

    const allowedTransitions: Record<string, string[]> = {
      PLACED: ['PAID', 'CANCELLED'],
      PAID: ['PACKED', 'CANCELLED'],
      PACKED: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      return HttpResponse.json(
        {
          success: false,
          message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        },
        { status: 400 }
      );
    }

    order.status = newStatus as any;
    if (!order.statusHistories) {
      order.statusHistories = [];
    }
    order.statusHistories.push({
      id: `hist-${Date.now()}`,
      fromStatus: currentStatus as any,
      toStatus: newStatus as any,
      changedBy: 'Enterprise Manager',
      reason: body.reason || `Status updated to ${newStatus}`,
      createdAt: new Date().toISOString(),
    });

    // Also update mockEnterpriseOrders summary
    const summaryOrder = mockEnterpriseOrders.find((o) => o.orderId === orderId);
    if (summaryOrder) {
      summaryOrder.status = newStatus as any;
    }

    return HttpResponse.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      data: order,
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

  // Enterprise Production Batches & Processing Traceability
  http.get('*/api/v1/enterprises/:enterpriseId/production/batches', () => {
    return HttpResponse.json({
      success: true,
      data: mockProductionBatches,
    });
  }),

  http.get('*/api/v1/enterprises/:enterpriseId/production/batches/:batchId', ({ params }) => {
    const { batchId } = params;
    const batch = mockProductionBatches.find((b) => b.id === batchId);
    if (!batch) {
      return HttpResponse.json({ success: false, message: 'Production batch not found' }, { status: 404 });
    }
    return HttpResponse.json({
      success: true,
      data: batch,
    });
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/production/batches', async ({ params, request }) => {
    const { enterpriseId } = params;
    const body = (await request.json().catch(() => ({}))) as any;

    if (!body?.inputs || body.inputs.length === 0) {
      return HttpResponse.json(
        { success: false, message: 'A production batch must contain at least one input lot' },
        { status: 400 }
      );
    }
    if (!body?.outputs || body.outputs.length === 0) {
      return HttpResponse.json(
        { success: false, message: 'A production batch must contain at least one output product' },
        { status: 400 }
      );
    }

    // Conservation of mass validation in compatible units
    const baseUnit = body.inputs[0].unit;
    const allInputsSame = body.inputs.every((i: any) => i.unit?.toLowerCase() === baseUnit?.toLowerCase());
    const allOutputsSame = body.outputs.every((o: any) => o.unit?.toLowerCase() === baseUnit?.toLowerCase());
    const allLossesSame = !body.losses || body.losses.every((l: any) => l.unit?.toLowerCase() === baseUnit?.toLowerCase());

    if (allInputsSame && allOutputsSame && allLossesSame) {
      const totalIn = body.inputs.reduce((acc: number, i: any) => acc + Number(i.quantity || 0), 0);
      const totalOut = body.outputs.reduce((acc: number, o: any) => acc + Number(o.quantity || 0), 0);
      const totalLoss = (body.losses || []).reduce((acc: number, l: any) => acc + Number(l.quantity || 0), 0);
      const discrepancy = Math.round((totalIn - (totalOut + totalLoss)) * 1000) / 1000;

      if (discrepancy !== 0) {
        return HttpResponse.json(
          {
            success: false,
            message: `BATCH_IMBALANCE: Total inputs (${totalIn} ${baseUnit}) must equal outputs (${totalOut}) + losses (${totalLoss}). Discrepancy: ${discrepancy} ${baseUnit}`,
          },
          { status: 400 }
        );
      }
    }

    const batchId = `batch-${Date.now()}`;
    const batchCode = `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newBatch = {
      id: batchId,
      batchCode,
      enterpriseId: String(enterpriseId),
      status: (body.completeImmediately ? 'COMPLETED' : 'DRAFT') as 'COMPLETED' | 'DRAFT',
      processedAt: body.completeImmediately ? new Date().toISOString() : undefined,
      laborCost: Number(body.laborCost || 0),
      processingCost: Number(body.processingCost || 0),
      packagingCost: Number(body.packagingCost || 0),
      notes: body.notes || '',
      inputs: body.inputs.map((inReq: any, idx: number) => {
        const lot = mockInventoryLots.find((l) => l.id === inReq.lotId);
        return {
          id: `in-${idx}-${Date.now()}`,
          lotId: inReq.lotId,
          lotCode: lot?.lotCode || inReq.lotId,
          quantity: Number(inReq.quantity),
          unit: inReq.unit,
        };
      }),
      outputs: body.outputs.map((outReq: any, idx: number) => {
        const pt = mockProductTypes.find((p) => p.id === outReq.productTypeId);
        return {
          id: `out-${idx}-${Date.now()}`,
          productTypeId: outReq.productTypeId,
          productTypeName: pt?.name || 'Processed Product',
          quantity: Number(outReq.quantity),
          unit: outReq.unit,
          grade: outReq.grade,
          resultingLotId: outReq.createInventoryLot ? `lot-out-${Date.now()}` : undefined,
        };
      }),
      losses: (body.losses || []).map((lossReq: any, idx: number) => ({
        id: `loss-${idx}-${Date.now()}`,
        quantity: Number(lossReq.quantity),
        unit: lossReq.unit,
        reason: lossReq.reason,
      })),
      traceToken: `token-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    mockProductionBatches.unshift(newBatch);

    return HttpResponse.json(
      {
        success: true,
        message: 'Production batch created successfully',
        data: newBatch,
      },
      { status: 201 }
    );
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/production/batches/:batchId/complete', ({ params }) => {
    const { batchId } = params;
    const batch = mockProductionBatches.find((b) => b.id === batchId);
    if (!batch) {
      return HttpResponse.json({ success: false, message: 'Production batch not found' }, { status: 404 });
    }
    batch.status = 'COMPLETED';
    batch.processedAt = new Date().toISOString();
    return HttpResponse.json({ success: true, data: batch });
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/production/batches/:batchId/cancel', ({ params }) => {
    const { batchId } = params;
    const batch = mockProductionBatches.find((b) => b.id === batchId);
    if (!batch) {
      return HttpResponse.json({ success: false, message: 'Production batch not found' }, { status: 404 });
    }
    batch.status = 'CANCELLED';
    return HttpResponse.json({ success: true, data: batch });
  }),

  http.get('*/api/v1/enterprises/:enterpriseId/production/batches/:batchId/validation', ({ params }) => {
    const { batchId } = params;
    return HttpResponse.json({
      success: true,
      data: {
        batchId,
        chainValid: true,
        inputDeliveriesCount: 3,
        farmerOriginsCount: 3,
        steps: ['Supply Delivery Intake', 'Quality Grading & Acceptance', 'Storage Lot Storage', 'Processing & Batch Milling'],
      },
    });
  }),

  // Enterprise Products Catalog & Transparent Pricing (F-907, F-908)
  http.get('*/api/v1/enterprises/:enterpriseId/products', () => {
    return HttpResponse.json({
      success: true,
      data: mockEnterpriseProducts,
    });
  }),

  http.get('*/api/v1/enterprises/:enterpriseId/products/:productId', ({ params }) => {
    const { productId } = params;
    const prod = mockEnterpriseProducts.find((p) => p.id === productId);
    if (!prod) {
      return HttpResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: prod });
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/products', async ({ params, request }) => {
    const { enterpriseId } = params;
    const body = (await request.json().catch(() => ({}))) as any;

    const packSize = Number(body.packSize || 1);
    const purchaseCost = Number(body.purchaseCost || 200 * packSize);
    const processingCost = Number(body.processingCost || 25 * packSize);
    const packagingCost = Number(body.packagingCost || 20 * packSize);
    const laborCost = Number(body.laborCost || 15 * packSize);
    const transportCost = Number(body.transportCost || 10);
    const directCost = purchaseCost + processingCost + packagingCost + laborCost + transportCost;
    const marginRate = Number(body.marginRate || 0.15);
    const enterpriseMargin = Math.round(directCost * marginRate * 100) / 100;
    const subtotal = directCost + enterpriseMargin;
    const communityFund = Math.round(subtotal * 0.03 * 100) / 100;
    const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.15 * 100) / 100;
    const totalPrice = Math.round((subtotal + communityFund + platformFee + taxAmount) * 100) / 100;

    const newProd = {
      id: `prod-${Date.now()}`,
      enterpriseId: String(enterpriseId),
      enterpriseName: 'South Omo Community Heritage Cooperative',
      sku: body.sku || `SKU-OMO-${Date.now()}`,
      name: body.name || 'Artisanal Product',
      description: body.description || '',
      story: body.story || '',
      category: body.category || 'Honey & Hive Products',
      unit: 'UNIT',
      packSize,
      unitPrice: totalPrice,
      currency: 'ETB',
      productionOutputId: body.productionOutputId,
      stockOnHand: Number(body.initialStock || 50),
      stockReserved: 0,
      availableStock: Number(body.initialStock || 50),
      published: Boolean(body.publishImmediately),
      traceToken: `TRC-OMO-${Date.now()}`,
      priceBreakdown: {
        purchaseCost,
        processingCost,
        packagingCost,
        laborCost,
        transportCost,
        enterpriseMargin,
        communityFund,
        platformFee,
        taxAmount,
        totalPrice,
      },
      createdAt: new Date().toISOString(),
    };

    mockEnterpriseProducts.unshift(newProd);

    return HttpResponse.json(
      {
        success: true,
        message: 'Product created with transparent pricing breakdown',
        data: newProd,
      },
      { status: 201 }
    );
  }),

  http.patch('*/api/v1/enterprises/:enterpriseId/products/:productId/publish', ({ params, request }) => {
    const { productId } = params;
    const url = new URL(request.url);
    const publishParam = url.searchParams.get('publish');
    const shouldPublish = publishParam !== 'false';

    const prod = mockEnterpriseProducts.find((p) => p.id === productId);
    if (!prod) {
      return HttpResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }
    prod.published = shouldPublish;
    return HttpResponse.json({ success: true, data: prod });
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/products/:productId/adjust-stock', async ({ params, request }) => {
    const { productId } = params;
    const body = (await request.json().catch(() => ({}))) as any;
    const prod = mockEnterpriseProducts.find((p) => p.id === productId);
    if (!prod) {
      return HttpResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const delta = Number(body.quantity || 0);
    prod.stockOnHand = (prod.stockOnHand || 0) + delta;
    prod.availableStock = prod.stockOnHand - (prod.stockReserved || 0);

    const movement = {
      id: `smov-${Date.now()}`,
      productId: String(productId),
      movementType: delta >= 0 ? 'RESTOCK' : 'ADJUSTMENT_DAMAGE',
      quantity: delta,
      balanceAfter: prod.stockOnHand,
      reason: body.reason || 'Inventory audit adjustment',
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json({ success: true, data: movement });
  }),

  // AI Narrative Reports & Assistant (B-1204, B-1205, B-1206)
  http.get('*/api/v1/enterprises/:enterpriseId/ai/reports', () => {
    return HttpResponse.json({
      success: true,
      data: mockAiReports,
    });
  }),

  http.post('*/api/v1/enterprises/:enterpriseId/ai/reports', async ({ request, params }) => {
    const { enterpriseId } = params;
    const body = (await request.json().catch(() => ({}))) as any;
    const reportType = body.reportType || 'WEEKLY_OPERATIONS_SUMMARY';
    const period = body.period || '2026-W42';
    const language = body.language || 'EN';

    let content = '';
    if (reportType === 'FARMER_TRAINING_MESSAGE') {
      content = language === 'AM'
        ? `ለደቡብ ኦሞ አምራቾች የጥራት ማሻሻያ መልዕክት: ምርትን በሚሰበስቡበት ወቅት የንጽህና መስፈርቶችን ያክብሩ። ደረጃ ሀ ማር የተሻለ የገበያ ዋጋ ያስገኛል።`
        : `Farmer Training Guidance (${period}): Maintain strict clean stainless steel harvesting protocols. Grade A honey guarantees top fair-trade cooperative payout rates.`;
    } else {
      content = `AI Generated Narrative Operations Report (${period}) [Language: ${language}]:
- Active Farmers: 48 registered producers across Turmi and Dimeka woredas.
- Total Farmer Payout: 345,000 ETB distributed with 76.5% producer price share.
- Production Efficiency: High throughput achieved in certified raw lot processing.
- Market Outlook: Growing tourist lodge demand for 500g packaged retail honey.`;
    }

    const newReport = {
      id: `rep-${Date.now()}`,
      enterpriseId: String(enterpriseId),
      reportType,
      period,
      language,
      content,
      status: 'GENERATED',
      createdAt: new Date().toISOString(),
    };

    mockAiReports.unshift(newReport as any);

    return HttpResponse.json(
      {
        success: true,
        message: 'AI Report generated and pending enterprise review',
        data: newReport,
      },
      { status: 201 }
    );
  }),

  http.patch('*/api/v1/enterprises/:enterpriseId/ai/reports/:reportId/approval', ({ params, request }) => {
    const { reportId } = params;
    const url = new URL(request.url);
    const approveParam = url.searchParams.get('approve');
    const isApproved = approveParam === 'true';

    const report = mockAiReports.find((r) => r.id === reportId);
    if (!report) {
      return HttpResponse.json({ success: false, message: 'Report not found' }, { status: 404 });
    }

    report.status = isApproved ? 'APPROVED' : 'REJECTED';

    return HttpResponse.json({
      success: true,
      message: `Report ${reportId} has been ${report.status}`,
      data: report,
    });
  }),
];

