import { http, HttpResponse } from 'msw';
import type { PaymentResponse } from '../types/api';
import { mockUsers, createMockAuthResponse } from './fixtures/users';
// Fixed history fixtures; never used by the real API or to infer provider settlement.
export const mockBuyerPaymentHistory: PaymentResponse[] = [
  {
    paymentId: 'cccc0000-0000-4000-8000-000000000001',
    paymentNo: 'PAY-DEMO-001',
    orderId: 'aaaa0000-0000-4000-8000-000000000002',
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
];
const userFor = (request: Request) =>
  Object.values(mockUsers).find(
    (user) =>
      request.headers.get('Authorization') ===
      `Bearer ${createMockAuthResponse(user).accessToken}`,
  );
export const paymentHistoryHandlers = [
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
