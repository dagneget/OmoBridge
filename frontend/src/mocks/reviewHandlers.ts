import { http, HttpResponse } from 'msw';
import type {
  BookingResponse,
  CreateReviewRequest,
  OrderDetailResponse,
  ReviewResponse,
} from '../types/api';
import { mockUsers, createMockAuthResponse } from './fixtures/users';

// Review-only demo purchases. They never alter checkout, cancellation, or payment fixtures.
const buyer = mockUsers.buyer;
const orderId = 'aaaa0000-0000-4000-8000-000000000004';
const bookingId = 'bbbb0000-0000-4000-8000-000000000003';
const productId = 'eeee0000-0000-4000-8000-000000000001';
const packageId = 'ffff0000-0000-4000-8000-000000000001';
const authenticated = (request: Request) =>
  request.headers.get('Authorization') ===
  `Bearer ${createMockAuthResponse(buyer).accessToken}`;
const error = (status: number, message: string) =>
  HttpResponse.json({ success: false, message }, { status });
const order: OrderDetailResponse = {
  orderId,
  buyerId: buyer.id,
  orderNo: 'ORD-REVIEW-DEMO',
  enterpriseName: 'Omo Honey Cooperative',
  status: 'DELIVERED',
  subtotal: 400,
  tax: 0,
  platformFee: 0,
  deliveryFee: 0,
  totalAmount: 400,
  currency: 'ETB',
  createdAt: '2026-10-18T10:00:00Z',
  deliveryAddress: 'Turmi',
  deliveryPhone: '+251911000000',
  items: [
    {
      id: productId,
      productId,
      productName: 'Forest honey',
      productSku: 'HONEY-REVIEW',
      quantity: 1,
      unitPrice: 400,
      lineTotal: 400,
    },
  ],
  statusHistories: [],
};
const booking: BookingResponse = {
  id: bookingId,
  buyerId: buyer.id,
  bookingCode: 'BK-REVIEW-DEMO',
  status: 'COMPLETED',
  enterpriseName: 'Omo Cultural Tours',
  contactName: 'Demo guest',
  contactPhone: '+251911000000',
  visitDate: '2026-10-18',
  partySize: 1,
  subtotal: 1200,
  taxAmount: 0,
  feeAmount: 0,
  totalAmount: 1200,
  currency: 'ETB',
  items: [
    {
      id: packageId,
      itemType: 'PACKAGE',
      itemId: packageId,
      itemNameSnapshot: 'Village visit',
      quantity: 1,
      unitPriceSnapshot: 1200,
      lineTotal: 1200,
    },
  ],
};
const reviews = new Map<string, ReviewResponse>();
const history: ReviewResponse[] = Array.from({ length: 21 }, (_, index) => ({
  id: `abcd0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  reviewerUserId: buyer.id,
  reviewerName: buyer.fullName,
  targetType: index % 2 ? 'EXPERIENCE' : 'PRODUCT',
  targetId: `eeee0000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
  rating: (index % 5) + 1,
  comment: `Recorded review ${index + 1}`,
  createdAt: new Date(
    Date.parse('2026-10-18T10:00:00Z') - index * 60000,
  ).toISOString(),
}));
export const reviewHandlers = [
  http.get('*/api/v1/reviews/my', ({ request }) => {
    const actor = Object.values(mockUsers).find(
      (user) =>
        request.headers.get('Authorization') ===
        `Bearer ${createMockAuthResponse(user).accessToken}`,
    );
    if (!actor) return error(401, 'Sign in to view reviews');
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 0);
    const size = Number(url.searchParams.get('size') || 20);
    if (
      !Number.isInteger(page) ||
      page < 0 ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > 100
    )
      return error(400, 'Invalid review page');
    const all = [...reviews.values(), ...history].filter(
      (review) => review.reviewerUserId === actor.id,
    );
    return HttpResponse.json({
      success: true,
      data: {
        content: all.slice(page * size, (page + 1) * size),
        pageNumber: page,
        pageSize: size,
        totalElements: all.length,
        totalPages: Math.ceil(all.length / size),
        isFirst: page === 0,
        isLast: (page + 1) * size >= all.length,
      },
    });
  }),
  http.get(`*/api/v1/orders/${orderId}`, ({ request }) =>
    authenticated(request)
      ? HttpResponse.json({ success: true, data: order })
      : error(404, 'Order not found'),
  ),
  http.get(`*/api/v1/bookings/${bookingId}`, ({ request }) =>
    authenticated(request)
      ? HttpResponse.json({ success: true, data: booking })
      : error(404, 'Booking not found'),
  ),
  http.get(`*/api/v1/payments/order/${orderId}`, () =>
    error(404, 'No demo payment record'),
  ),
  http.get(`*/api/v1/payments/booking/${bookingId}`, () =>
    error(404, 'No demo payment record'),
  ),
  http.post('*/api/v1/reviews', async ({ request }) => {
    if (!authenticated(request)) return error(401, 'Sign in to review');
    const payload = (await request.json()) as CreateReviewRequest;
    const matchesOrder =
      payload.orderId === orderId &&
      !payload.bookingId &&
      payload.targetType === 'PRODUCT' &&
      payload.targetId === productId;
    const matchesBooking =
      payload.bookingId === bookingId &&
      !payload.orderId &&
      payload.targetType === 'EXPERIENCE' &&
      payload.targetId === packageId;
    if (!matchesOrder && !matchesBooking)
      return error(422, 'A completed matching demo purchase is required');
    if (
      !Number.isInteger(payload.rating) ||
      payload.rating! < 1 ||
      payload.rating! > 5
    )
      return error(400, 'Choose a rating from 1 to 5');
    const key = `${buyer.id}:${payload.targetType}:${payload.targetId}`;
    if (reviews.has(key)) return error(409, 'Review already submitted');
    const review: ReviewResponse = {
      id: crypto.randomUUID(),
      reviewerUserId: buyer.id,
      reviewerName: buyer.fullName,
      targetType: payload.targetType,
      targetId: payload.targetId,
      rating: payload.rating,
      comment: payload.comment,
      createdAt: new Date().toISOString(),
    };
    reviews.set(key, review);
    return HttpResponse.json({ success: true, data: review }, { status: 201 });
  }),
];
