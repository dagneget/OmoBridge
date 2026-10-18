import { http, HttpResponse } from 'msw';
import type { PaymentResponse, Schemas } from '../types/api';
import { mockUsers, createMockAuthResponse } from './fixtures/users';
// Fixed history fixtures; never used by the real API or to infer provider settlement.
export const mockBuyerPaymentHistory: PaymentResponse[] = [
  {
    paymentId: 'cccc0000-0000-4000-8000-000000000001',
    paymentNo: 'PAY-DEMO-001',
    orderId: 'aaaa0000-0000-4000-8000-000000000003',
    orderNo: 'ORD-DEMO-001',
    amount: 470,
    currency: 'ETB',
    status: 'RELEASED',
    createdAt: '2026-10-18T10:15:00Z',
  },
  {
    paymentId: 'cccc0000-0000-4000-8000-000000000002',
    paymentNo: 'PAY-DEMO-002',
    bookingId: 'bbbb0000-0000-4000-8000-000000000001',
    bookingCode: 'BK-DEMO-001',
    amount: 1200,
    currency: 'ETB',
    status: 'PENDING',
    createdAt: '2026-10-17T10:15:00Z',
  },
  {
    paymentId: 'cccc0000-0000-4000-8000-000000000003',
    paymentNo: 'PAY-DEMO-003',
    bookingId: 'bbbb0000-0000-4000-8000-000000000002',
    bookingCode: 'BK-REFUND-DEMO',
    amount: 1200,
    currency: 'ETB',
    status: 'REFUNDED',
    createdAt: '2026-10-16T10:15:00Z',
  },
];
const userFor = (request: Request) =>
  Object.values(mockUsers).find(
    (user) =>
      request.headers.get('Authorization') ===
      `Bearer ${createMockAuthResponse(user).accessToken}`,
  );
const refundExamples: Record<string, Schemas['PaymentRefundSummaryResponse']> =
  {
    'cccc0000-0000-4000-8000-000000000001': {
      paymentId: 'cccc0000-0000-4000-8000-000000000001',
      paymentAmount: 470,
      currency: 'ETB',
      completedRefundAmount: 100,
      notRefundedAmount: 370,
      coverage: 'PARTIAL',
      refunds: {
        content: [
          {
            refundId: 'dddd0000-0000-4000-8000-000000000001',
            refundNo: 'REF-DEMO-001',
            paymentId: 'cccc0000-0000-4000-8000-000000000001',
            amount: 100,
            currency: 'ETB',
            status: 'COMPLETED',
            reason: 'Partial item return',
            createdAt: '2026-10-18T10:30:00Z',
          },
        ],
        pageNumber: 0,
        pageSize: 20,
        totalElements: 1,
        totalPages: 1,
        isFirst: true,
        isLast: true,
      },
    },
    'cccc0000-0000-4000-8000-000000000002': {
      paymentId: 'cccc0000-0000-4000-8000-000000000002',
      paymentAmount: 1200,
      currency: 'ETB',
      completedRefundAmount: 0,
      notRefundedAmount: 1200,
      coverage: 'NONE',
      refunds: {
        content: [],
        pageNumber: 0,
        pageSize: 20,
        totalElements: 0,
        totalPages: 0,
        isFirst: true,
        isLast: true,
      },
    },
    'cccc0000-0000-4000-8000-000000000003': {
      paymentId: 'cccc0000-0000-4000-8000-000000000003',
      paymentAmount: 1200,
      currency: 'ETB',
      completedRefundAmount: 1200,
      notRefundedAmount: 0,
      coverage: 'FULL',
      refunds: {
        content: [
          {
            refundId: 'dddd0000-0000-4000-8000-000000000003',
            refundNo: 'REF-DEMO-003',
            paymentId: 'cccc0000-0000-4000-8000-000000000003',
            amount: 1200,
            currency: 'ETB',
            status: 'COMPLETED',
            reason: 'Booking cancellation refund',
            createdAt: '2026-10-18T10:30:00Z',
          },
        ],
        pageNumber: 0,
        pageSize: 20,
        totalElements: 1,
        totalPages: 1,
        isFirst: true,
        isLast: true,
      },
    },
  };
const ownBuyer = (request: Request) =>
  userFor(request)?.id === mockUsers.buyer.id;
const unavailable = () =>
  HttpResponse.json({ message: 'Unavailable' }, { status: 404 });
export const paymentHistoryHandlers = [
  http.get('*/api/v1/payments/:id/refunds', ({ request, params }) => {
    const summary = ownBuyer(request)
      ? refundExamples[String(params.id)]
      : undefined;
    if (!summary) return unavailable();
    const page = Number(new URL(request.url).searchParams.get('page') || 0);
    return HttpResponse.json({
      success: true,
      data: {
        ...summary,
        refunds: {
          ...summary.refunds,
          pageNumber: page,
          content: page === 0 ? summary.refunds!.content : [],
          isFirst: page === 0,
        },
      },
    });
  }),
  http.get('*/api/v1/payments/booking/:bookingId', ({ request, params }) => {
    const payment = ownBuyer(request)
      ? mockBuyerPaymentHistory.find(
          (record) => record.bookingId === params.bookingId,
        )
      : undefined;
    return payment
      ? HttpResponse.json({ success: true, data: payment })
      : unavailable();
  }),
  http.get(
    '*/api/v1/orders/aaaa0000-0000-4000-8000-000000000003',
    ({ request }) =>
      ownBuyer(request)
        ? HttpResponse.json({
            success: true,
            data: {
              orderId: 'aaaa0000-0000-4000-8000-000000000003',
              orderNo: 'ORD-DEMO-001',
              checkoutGroupId: 'aaaa0000-0000-4000-8000-000000000004',
              enterpriseId: '11111111-1111-4111-8111-000000000001',
              enterpriseName: 'South Omo Beekeeping Union',
              buyerId: mockUsers.buyer.id,
              status: 'PAID',
              currency: 'ETB',
              totalAmount: 470,
              items: [],
              statusHistories: [],
            },
          })
        : unavailable(),
  ),
  http.get(
    '*/api/v1/payments/order/aaaa0000-0000-4000-8000-000000000003',
    ({ request }) =>
      ownBuyer(request)
        ? HttpResponse.json({ success: true, data: mockBuyerPaymentHistory[0] })
        : unavailable(),
  ),
  http.get(
    '*/api/v1/bookings/bbbb0000-0000-4000-8000-000000000002',
    ({ request }) =>
      ownBuyer(request)
        ? HttpResponse.json({
            success: true,
            data: {
              id: 'bbbb0000-0000-4000-8000-000000000002',
              bookingCode: 'BK-REFUND-DEMO',
              enterpriseId: '11111111-1111-4111-8111-000000000001',
              enterpriseName: 'Community tourism',
              buyerId: mockUsers.buyer.id,
              status: 'CANCELLED',
              currency: 'ETB',
              totalAmount: 1200,
              subtotal: 1200,
              visitDate: '2026-11-20',
              partySize: 2,
              contactName: 'Demo buyer',
              contactPhone: '+251911000001',
              items: [],
            },
          })
        : unavailable(),
  ),
  http.get('*/api/v1/payments', ({ request }) => {
    const user = userFor(request);
    if (!user)
      return HttpResponse.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    const url = new URL(request.url);
    const page = Math.max(0, Number(url.searchParams.get('page') || 0));
    const size = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('size') || 20)),
    );
    const own = user.id === mockUsers.buyer.id ? mockBuyerPaymentHistory : [];
    return HttpResponse.json({
      success: true,
      data: {
        content: own.slice(page * size, (page + 1) * size),
        pageNumber: page,
        pageSize: size,
        totalElements: own.length,
        totalPages: Math.ceil(own.length / size),
        isFirst: page === 0,
        isLast: (page + 1) * size >= own.length,
      },
    });
  }),
  http.get('*/api/v1/payments/:id', ({ request, params }) => {
    const user = userFor(request);
    if (!user)
      return HttpResponse.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    const record =
      user.id === mockUsers.buyer.id
        ? mockBuyerPaymentHistory.find(
            (payment) => payment.paymentId === params.id,
          )
        : undefined;
    return record
      ? HttpResponse.json({ success: true, data: record })
      : HttpResponse.json({ message: 'Payment unavailable' }, { status: 404 });
  }),
];
