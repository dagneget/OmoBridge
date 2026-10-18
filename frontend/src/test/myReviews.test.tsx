import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MyReviewsPage from '../pages/account/MyReviewsPage';
import {
  reviewHistoryService,
  type ReviewPage,
} from '../features/reviews/reviewHistoryService';
import { useAuthStore } from '../features/auth';
import { NormalizedApiError } from '../services/apiError';
import i18n from '../i18n';
const buyer = '22222222-2222-4222-8222-000000000001';
const id = '11111111-1111-4111-8111-000000000001';
const page: ReviewPage = {
  content: [
    {
      id,
      reviewerUserId: buyer,
      targetId: id,
      targetType: 'PRODUCT',
      rating: 4,
      comment: 'Own review text',
      createdAt: '2026-10-19T10:00:00Z',
    },
  ],
  pageNumber: 0,
  pageSize: 20,
  totalElements: 1,
  totalPages: 1,
  isFirst: true,
  isLast: true,
};
let client: QueryClient;
function show() {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/account/reviews']}>
        <Routes>
          <Route path="/account/reviews" element={<MyReviewsPage />} />
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route path="/account" element={<h1>Account screen</h1>} />
        </Routes>
      </MemoryRouter>
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
  vi.spyOn(reviewHistoryService, 'list').mockResolvedValue(page);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});
describe('F-1402 My reviews', () => {
  it('renders the owned rating, text, date, and target reference', async () => {
    show();
    await screen.findByText('Own review text');
    expect(screen.getByText('4 out of 5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View product' })).toHaveAttribute(
      'href',
      `/products/${id}`,
    );
    expect(
      screen.getByRole('heading', { name: 'Product review' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My reviews' })).toHaveFocus();
    expect(reviewHistoryService.list).toHaveBeenCalledWith(
      buyer,
      0,
      expect.any(AbortSignal),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Back to account' }));
    expect(
      screen.getByRole('heading', { name: 'Account screen' }),
    ).toBeInTheDocument();
  });
  it('shows an empty state and disables both page controls', async () => {
    vi.mocked(reviewHistoryService.list).mockResolvedValue({
      ...page,
      content: [],
      totalElements: 0,
      totalPages: 0,
    });
    show();
    await screen.findByText('You have not submitted any reviews yet.');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
  });
  it('shows a missing comment without inventing one', async () => {
    vi.mocked(reviewHistoryService.list).mockResolvedValue({
      ...page,
      content: [{ ...page.content![0], comment: '' }],
    });
    show();
    await screen.findByText('No comment provided.');
  });
  it('shows loading and recovers an error with an explicit refresh', async () => {
    vi.mocked(reviewHistoryService.list).mockRejectedValueOnce(
      new Error('Network failure'),
    );
    show();
    expect(screen.getByText('Loading your reviews…')).toBeInTheDocument();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh reviews' }));
    await screen.findByText('Own review text');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each([401, 403, 404])(
    'handles authorization status %s without showing private records',
    async (status) => {
      vi.mocked(reviewHistoryService.list).mockRejectedValue(
        new NormalizedApiError({ status, message: 'Unavailable' }),
      );
      show();
      await screen.findByText(
        'Your reviews are unavailable. Sign in again to verify your account.',
      );
      expect(screen.queryByText('Own review text')).not.toBeInTheDocument();
    },
  );
  it('pages using server metadata and resets private data between pages', async () => {
    vi.mocked(reviewHistoryService.list)
      .mockResolvedValueOnce({
        ...page,
        totalElements: 21,
        totalPages: 2,
        isLast: false,
      })
      .mockResolvedValueOnce({
        ...page,
        content: [{ ...page.content![0], comment: 'Second page review' }],
        pageNumber: 1,
        totalElements: 21,
        totalPages: 2,
        isFirst: false,
      });
    show();
    await screen.findByText('Own review text');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Second page review');
    expect(screen.queryByText('Own review text')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(reviewHistoryService.list).toHaveBeenLastCalledWith(
      buyer,
      1,
      expect.any(AbortSignal),
    );
  });
  it('makes no offline read and refreshes after reconnect', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    show();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh reviews' }),
    ).toBeDisabled();
    expect(reviewHistoryService.list).not.toHaveBeenCalled();
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    await screen.findByText('Own review text');
  });
  it('ignores a late response and removes the previous account cache on switch', async () => {
    let resolve!: (value: ReviewPage) => void;
    vi.mocked(reviewHistoryService.list)
      .mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValue({
        ...page,
        content: [],
        totalElements: 0,
        totalPages: 0,
      });
    show();
    await waitFor(() => expect(reviewHistoryService.list).toHaveBeenCalled());
    act(() => useAuthStore.setState({ token: 'other-token', user: { id } }));
    await act(async () => resolve(page));
    await screen.findByText('You have not submitted any reviews yet.');
    expect(screen.queryByText('Own review text')).not.toBeInTheDocument();
    expect(
      client.getQueryCache().findAll({ queryKey: ['buyer-reviews', buyer] }),
    ).toHaveLength(0);
  });
  it('redirects signed-out visitors and makes no request', async () => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    show();
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(reviewHistoryService.list).not.toHaveBeenCalled();
  });
  it('provides Amharic navigation and heading', async () => {
    await i18n.changeLanguage('am');
    show();
    await screen.findByText('Own review text');
    expect(
      screen.getByRole('heading', { name: 'የእኔ ግምገማዎች' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ግምገማዎችን ያድሱ' }),
    ).toBeInTheDocument();
  });
});
