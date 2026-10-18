import { http, HttpResponse } from 'msw';
import type {
  CheckoutRequest,
  CheckoutResponse,
  OrderDetailResponse,
} from '../types/api';
import { mockUsers, createMockAuthResponse } from './fixtures/users';

// Deliberately fixed demo scenario: one honey unit. No production totals are calculated here.
export const mockCheckout: CheckoutResponse = {
  checkoutGroupId: 'aaaa0000-0000-4000-8000-000000000001',
  groupNo: 'CHK-DEMO-001',
  status: 'CREATED',
  totalAmount: 470,
  currency: 'ETB',
  orders: [
    {
      orderId: 'aaaa0000-0000-4000-8000-000000000002',
      orderNo: 'ORD-DEMO-001',
      enterpriseId: '11111111-1111-4111-8111-000000000001',
      enterpriseName: 'South Omo Beekeeping Union',
      status: 'PLACED',
      subtotal: 420,
      tax: 15,
      platformFee: 35,
      deliveryFee: 0,
      totalAmount: 470,
      currency: 'ETB',
      itemCount: 1,
      createdAt: '2026-10-18T10:00:00Z',
    },
  ],
};
const confirmed = new Map<string, CheckoutResponse>();
export const checkoutHandler = http.post(
  '*/api/v1/checkout',
  async ({ request }) => {
    const user = Object.values(mockUsers).find(
      (candidate) =>
        request.headers.get('Authorization') ===
        `Bearer ${createMockAuthResponse(candidate).accessToken}`,
    );
    if (!user)
      return HttpResponse.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    const body = (await request.json()) as CheckoutRequest;
    if (
      !body?.idempotencyKey ||
      !body.deliveryAddress?.trim() ||
      !body.deliveryPhone?.trim()
    )
      return HttpResponse.json(
        { message: 'Delivery details required' },
        { status: 400 },
      );
    const key = `${user.id}:${body.idempotencyKey}`;
    const previous = confirmed.get(key);
    if (previous)
      return HttpResponse.json(
        { success: true, data: previous },
        { status: 201 },
      );
    if (
      body.items?.length !== 1 ||
      body.items[0].productId !== 'ffffffff-ffff-4fff-8fff-000000000001' ||
      body.items[0].quantity !== 1
    ) {
      return HttpResponse.json(
        { message: 'Demo checkout supports one honey unit only' },
        { status: 422 },
      );
    }
    confirmed.set(key, mockCheckout);
    return HttpResponse.json(
      { success: true, data: mockCheckout },
      { status: 201 },
    );
  },
);

export const mockOrderConfirmation: OrderDetailResponse = {
  ...mockCheckout.orders![0],
  checkoutGroupId: mockCheckout.checkoutGroupId,
  checkoutGroupNo: mockCheckout.groupNo,
  buyerId: mockUsers.buyer.id,
  deliveryAddress: 'Jinka market',
  deliveryPhone: '+251911000001',
  items: [
    {
      id: 'aaaa0000-0000-4000-8000-000000000003',
      productId: 'ffffffff-ffff-4fff-8fff-000000000001',
      productName: 'Wild honey — snapshot name',
      productSku: 'HONEY-DEMO-001',
      unitPrice: 420,
      quantity: 1,
      lineTotal: 420,
    },
  ],
  statusHistories: [
    {
      id: 'aaaa0000-0000-4000-8000-000000000004',
      toStatus: 'PLACED',
      reason: 'Order created via checkout',
      createdAt: '2026-10-18T10:00:00Z',
    },
  ],
};
export const orderConfirmationHandler = http.get(
  '*/api/v1/orders/:id',
  ({ request, params }) => {
    const user = Object.values(mockUsers).find(
      (candidate) =>
        request.headers.get('Authorization') ===
        `Bearer ${createMockAuthResponse(candidate).accessToken}`,
    );
    if (!user)
      return HttpResponse.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    if (
      params.id !== mockOrderConfirmation.orderId ||
      ![...confirmed.keys()].some((key) => key.startsWith(`${user.id}:`))
    ) {
      return HttpResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    return HttpResponse.json({
      success: true,
      data: { ...mockOrderConfirmation, buyerId: user.id },
    });
  },
);

export const myOrdersHandler = http.get('*/api/v1/orders', ({ request }) => {
  const user = Object.values(mockUsers).find(
    (candidate) =>
      request.headers.get('Authorization') ===
      `Bearer ${createMockAuthResponse(candidate).accessToken}`,
  );
  if (!user)
    return HttpResponse.json(
      { message: 'Authentication required' },
      { status: 401 },
    );
  const hasOrders = [...confirmed.keys()].some((key) =>
    key.startsWith(`${user.id}:`),
  );
  return HttpResponse.json({
    success: true,
    data: hasOrders ? mockCheckout.orders : [],
  });
});
export const orderPaymentHandler = http.get(
  '*/api/v1/payments/order/:id',
  ({ request }) => {
    const user = Object.values(mockUsers).find(
      (candidate) =>
        request.headers.get('Authorization') ===
        `Bearer ${createMockAuthResponse(candidate).accessToken}`,
    );
    if (!user)
      return HttpResponse.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    // Checkout alone does not create a payment record. F-601 owns attempts and payment fixtures.
    return HttpResponse.json(
      { message: 'Payment record not found' },
      { status: 404 },
    );
  },
);
