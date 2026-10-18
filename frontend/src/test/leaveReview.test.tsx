import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewForm from '../features/reviews/ReviewForm';
import OrderReviews from '../features/reviews/PurchaseReviews';
import BookingReviews from '../features/reviews/BookingReviews';
import { reviewService } from '../features/reviews/reviewService';
import { bookingService } from '../features/bookings/bookingService';
import { useAuthStore } from '../features/auth';
import { NormalizedApiError } from '../services/apiError';
import type {
  BookingResponse,
  OrderDetailResponse,
  ReviewResponse,
} from '../types/api';
import i18n from '../i18n';
const id = '11111111-1111-4111-8111-000000000001';
const buyer = '22222222-2222-4222-8222-000000000001';
const target = '33333333-3333-4333-8333-000000000001';
const guide = '44444444-4444-4444-8444-000000000001';
const order: OrderDetailResponse = {
  orderId: id,
  buyerId: buyer,
  status: 'DELIVERED',
  items: [{ id: target, productId: target, productName: 'Forest honey' }],
};
const booking: BookingResponse = {
  id,
  buyerId: buyer,
  status: 'COMPLETED',
  items: [
    { itemType: 'PACKAGE', itemId: target, itemNameSnapshot: 'Village visit' },
  ],
};
const response: ReviewResponse = {
  id,
  reviewerUserId: buyer,
  targetId: target,
  targetType: 'PRODUCT',
  rating: 5,
  createdAt: '2026-10-19T10:00:00Z',
};
let client: QueryClient;
function form() {
  return render(
    <ReviewForm
      buyerId={buyer}
      orderId={id}
      target={{ type: 'PRODUCT', id: target, name: 'Forest honey' }}
      enabled={true}
    />,
  );
}
function send() {
  fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
}
function bookingView() {
  return render(
    <QueryClientProvider client={client}>
      <BookingReviews bookingId={id} />
    </QueryClientProvider>,
  );
}
beforeEach(async () => {
  useAuthStore.setState({
    token: 'buyer-token',
    user: { id: buyer, roles: ['BUYER_VISITOR'] },
    isAuthenticated: true,
    isLoading: false,
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(reviewService, 'createReview').mockResolvedValue(response);
  vi.spyOn(bookingService, 'getBookingById').mockResolvedValue(booking);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});
describe('F-1401 review form', () => {
  it('submits a selected rating and trimmed optional comment and focuses server confirmation', async () => {
    form();
    fireEvent.change(screen.getByLabelText('Comment (optional)'), {
      target: { value: '  Excellent honey  ' },
    });
    send();
    const confirmation = await screen.findByText(
      'Your review was submitted. Thank you!',
    );
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(reviewService.createReview).toHaveBeenCalledExactlyOnceWith(
      {
        targetType: 'PRODUCT',
        targetId: target,
        orderId: id,
        rating: 5,
        comment: 'Excellent honey',
      },
      buyer,
      expect.any(AbortSignal),
    );
    expect(
      screen.queryByRole('button', { name: 'Submit review' }),
    ).not.toBeInTheDocument();
  });
  it('validates rating without posting and does not invent a default rating', () => {
    form();
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a rating from 1 to 5',
    );
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });
  it('sends no blank comment', async () => {
    form();
    send();
    await screen.findByText('Your review was submitted. Thank you!');
    expect(
      vi.mocked(reviewService.createReview).mock.calls[0][0],
    ).not.toHaveProperty('comment');
  });
  it('blocks rapid duplicate submits while awaiting confirmation', async () => {
    let resolve!: (value: ReviewResponse) => void;
    vi.mocked(reviewService.createReview).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    form();
    send();
    fireEvent.submit(screen.getByRole('form'));
    expect(reviewService.createReview).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Submitting review…' }),
    ).toBeDisabled();
    await act(async () => resolve(response));
    await screen.findByText('Your review was submitted. Thank you!');
  });
  it.each([
    [409, 'You have already reviewed this item.'],
    [422, 'This purchase is not eligible for a review.'],
    [403, 'We could not verify this purchase for your account.'],
  ])(
    'displays clear terminal feedback for HTTP %s',
    async (status, message) => {
      vi.mocked(reviewService.createReview).mockRejectedValue(
        new NormalizedApiError({
          status: Number(status),
          message: 'Server rejection',
        }),
      );
      form();
      send();
      expect(
        await screen.findByText(
          new RegExp(String(message).replaceAll('.', '\\.')),
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Submit review' }),
      ).not.toBeInTheDocument();
    },
  );
  it('retains the comment for an explicit retry after uncertain submission', async () => {
    vi.mocked(reviewService.createReview).mockRejectedValueOnce(
      new Error('Network error'),
    );
    form();
    fireEvent.change(screen.getByLabelText('Comment (optional)'), {
      target: { value: 'Keep this draft' },
    });
    send();
    await screen.findByText(/We could not confirm submission/);
    expect(screen.getByLabelText('Comment (optional)')).toHaveValue(
      'Keep this draft',
    );
    expect(reviewService.createReview).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    await screen.findByText('Your review was submitted. Thank you!');
    expect(reviewService.createReview).toHaveBeenCalledTimes(2);
  });
  it('disables offline submission without queueing anything', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    form();
    expect(
      screen.getByRole('button', { name: 'Submit review' }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Reviews are not saved or queued offline/),
    ).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('form'));
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });
  it('clears drafts and ignores a late response after switching accounts', async () => {
    let resolve!: (value: ReviewResponse) => void;
    vi.mocked(reviewService.createReview).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    form();
    fireEvent.change(screen.getByLabelText('Comment (optional)'), {
      target: { value: 'Private draft' },
    });
    send();
    const signal = vi.mocked(reviewService.createReview).mock.calls[0][2]!;
    act(() =>
      useAuthStore.setState({ token: 'other-token', user: { id: guide } }),
    );
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(response));
    expect(
      screen.queryByText('Your review was submitted. Thank you!'),
    ).not.toBeInTheDocument();
    act(() =>
      useAuthStore.setState({ token: 'buyer-token-2', user: { id: buyer } }),
    );
    expect(screen.getByLabelText('Comment (optional)')).toHaveValue('');
  });
  it('aborts an in-flight request on unmount', () => {
    vi.mocked(reviewService.createReview).mockReturnValue(
      new Promise(() => {}),
    );
    const view = form();
    send();
    const signal = vi.mocked(reviewService.createReview).mock.calls[0][2]!;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
  it('bounds an uncertain request and requires a manual retry', async () => {
    vi.useFakeTimers();
    vi.mocked(reviewService.createReview).mockImplementation(
      (_payload, _buyer, signal) =>
        new Promise((_resolve, reject) => {
          signal!.addEventListener(
            'abort',
            () => reject(new Error('Request timed out')),
            { once: true },
          );
        }),
    );
    form();
    send();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not confirm submission',
    );
    expect(screen.getByRole('button', { name: 'Submit review' })).toBeEnabled();
    expect(reviewService.createReview).toHaveBeenCalledTimes(1);
  });
  it('discards the old target draft and confirmation when changing purchases', async () => {
    let resolve!: (value: ReviewResponse) => void;
    vi.mocked(reviewService.createReview).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = form();
    send();
    const signal = vi.mocked(reviewService.createReview).mock.calls[0][2]!;
    view.rerender(
      <ReviewForm
        buyerId={buyer}
        orderId={guide}
        target={{ type: 'PRODUCT', id: guide, name: 'Other purchase' }}
        enabled={true}
      />,
    );
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(response));
    expect(
      screen.queryByText('Your review was submitted. Thank you!'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Rating')).toHaveValue('');
  });
  it('provides Amharic form labels', async () => {
    await i18n.changeLanguage('am');
    form();
    expect(screen.getByLabelText('ደረጃ')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ግምገማ ያስገቡ' }),
    ).toBeInTheDocument();
  });
});
describe('purchase review eligibility', () => {
  it.each(['PLACED', 'PAID', 'PACKED', 'IN_TRANSIT', 'CANCELLED'] as const)(
    'does not offer order reviews for %s',
    (status) => {
      render(<OrderReviews order={{ ...order, status }} enabled={true} />);
      expect(screen.queryByLabelText('Rating')).not.toBeInTheDocument();
    },
  );
  it('renders one form per delivered product even across duplicate lines', () => {
    render(
      <OrderReviews
        order={{ ...order, items: [...order.items!, ...order.items!] }}
        enabled={true}
      />,
    );
    expect(screen.getAllByLabelText('Rating')).toHaveLength(1);
  });
  it('does not expose forms from another buyer order', () => {
    render(
      <OrderReviews order={{ ...order, buyerId: guide }} enabled={true} />,
    );
    expect(screen.queryByLabelText('Rating')).not.toBeInTheDocument();
  });
  it('waits for a fresh owned completed booking and submits package and guide targets', async () => {
    vi.mocked(bookingService.getBookingById).mockResolvedValue({
      ...booking,
      assignedGuideId: guide,
      assignedGuideName: 'Local guide',
      items: [
        ...booking.items!,
        { itemType: 'GUIDE', itemId: guide, itemNameSnapshot: 'Local guide' },
        { itemType: 'HOTEL', itemId: buyer },
      ],
    });
    bookingView();
    await waitFor(() =>
      expect(screen.getAllByLabelText('Rating')).toHaveLength(2),
    );
    fireEvent.change(screen.getAllByLabelText('Rating')[0], {
      target: { value: '4' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Submit review' })[0],
    );
    await screen.findByText('Your review was submitted. Thank you!');
    expect(reviewService.createReview).toHaveBeenCalledWith(
      { targetType: 'EXPERIENCE', targetId: target, bookingId: id, rating: 4 },
      buyer,
      expect.any(AbortSignal),
    );
  });
  it.each(['REQUESTED', 'CONFIRMED', 'PAID', 'DECLINED', 'CANCELLED'] as const)(
    'does not offer reviews for %s bookings',
    async (status) => {
      vi.mocked(bookingService.getBookingById).mockResolvedValue({
        ...booking,
        status,
      });
      bookingView();
      await waitFor(() =>
        expect(
          screen.queryByText('Checking review eligibility…'),
        ).not.toBeInTheDocument(),
      );
      expect(screen.queryByLabelText('Rating')).not.toBeInTheDocument();
    },
  );
  it('ignores a late completed booking after the account changes', async () => {
    let resolve!: (value: BookingResponse) => void;
    vi.mocked(bookingService.getBookingById).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    bookingView();
    await waitFor(() =>
      expect(bookingService.getBookingById).toHaveBeenCalled(),
    );
    act(() =>
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      }),
    );
    await act(async () => resolve(booking));
    expect(screen.queryByLabelText('Rating')).not.toBeInTheDocument();
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });
  it('rejects a foreign booking response and supports explicit eligibility refresh', async () => {
    vi.mocked(bookingService.getBookingById).mockResolvedValueOnce({
      ...booking,
      buyerId: guide,
    });
    bookingView();
    await screen.findByText('We could not check review eligibility.');
    expect(screen.queryByLabelText('Rating')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check eligibility again' }),
    );
    expect(await screen.findByLabelText('Rating')).toBeInTheDocument();
  });
});
