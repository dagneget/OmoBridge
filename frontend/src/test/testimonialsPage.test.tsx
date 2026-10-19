import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestimonialsPage from '../pages/public/TestimonialsPage';
import { reviewService } from '../features/reviews/reviewService';
import type { ReviewResponse } from '../types/api';

const mockReviews: ReviewResponse[] = [
  {
    id: 'rev-1',
    reviewerName: 'Marcus Lindqvist',
    rating: 5,
    comment: 'The Ukuli Bula ceremony was an extraordinary cultural event handled with complete respect.',
    targetType: 'EXPERIENCE',
    createdAt: '2026-10-10T12:00:00Z',
  },
  {
    id: 'rev-2',
    reviewerName: 'Elena Rostova',
    rating: 4,
    comment: 'Our guide Arsho was deeply knowledgeable and introduced us warmly to village elders.',
    targetType: 'GUIDE',
    createdAt: '2026-10-12T14:30:00Z',
  },
  {
    id: 'rev-3',
    reviewerName: 'David Chen',
    rating: 5,
    comment: 'The handwoven cotton scarf arrived promptly and the artisan craft quality is outstanding.',
    targetType: 'PRODUCT',
    createdAt: '2026-10-14T09:15:00Z',
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderTestimonialsPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TestimonialsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Testimonials and public reviews (F-309)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders public reviews with averages summary banner', async () => {
    vi.spyOn(reviewService, 'getTestimonials').mockResolvedValue(mockReviews);

    renderTestimonialsPage();

    await waitFor(() => {
      expect(screen.getByText('Marcus Lindqvist')).toBeInTheDocument();
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      expect(screen.getByText('David Chen')).toBeInTheDocument();
    });

    // Average: (5 + 4 + 5) / 3 = 4.7
    expect(screen.getByTestId('average-rating')).toHaveTextContent('4.7');
    expect(screen.getByTestId('total-reviews')).toHaveTextContent('3');
    expect(screen.getByText(/100% post-trip verified community reviews/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The Ukuli Bula ceremony was an extraordinary cultural event/i)
    ).toBeInTheDocument();
  });

  it('handles an empty list cleanly without errors or NaN', async () => {
    vi.spyOn(reviewService, 'getTestimonials').mockResolvedValue([]);

    renderTestimonialsPage();

    await waitFor(() => {
      expect(screen.getByTestId('testimonials-empty')).toBeInTheDocument();
      expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('testimonials-summary')).not.toBeInTheDocument();
  });

  it('filters reviews by target category', async () => {
    vi.spyOn(reviewService, 'getTestimonials').mockResolvedValue(mockReviews);

    renderTestimonialsPage();

    await waitFor(() => {
      expect(screen.getByText('Marcus Lindqvist')).toBeInTheDocument();
    });

    // Filter by Guides
    fireEvent.click(screen.getByTestId('filter-category-guide'));

    expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    expect(screen.queryByText('Marcus Lindqvist')).not.toBeInTheDocument();
    expect(screen.queryByText('David Chen')).not.toBeInTheDocument();

    // Filter by Artisan Goods (Product)
    fireEvent.click(screen.getByTestId('filter-category-product'));

    expect(screen.getByText('David Chen')).toBeInTheDocument();
    expect(screen.queryByText('Elena Rostova')).not.toBeInTheDocument();
  });

  it('filters reviews by minimum star rating', async () => {
    vi.spyOn(reviewService, 'getTestimonials').mockResolvedValue(mockReviews);

    renderTestimonialsPage();

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Filter for 5 stars only
    fireEvent.click(screen.getByTestId('filter-rating-5'));

    expect(screen.getByText('Marcus Lindqvist')).toBeInTheDocument();
    expect(screen.getByText('David Chen')).toBeInTheDocument();
    expect(screen.queryByText('Elena Rostova')).not.toBeInTheDocument();
  });

  it('searches reviews by traveler name or comment keyword', async () => {
    vi.spyOn(reviewService, 'getTestimonials').mockResolvedValue(mockReviews);

    renderTestimonialsPage();

    await waitFor(() => {
      expect(screen.getByText('Marcus Lindqvist')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search comments or traveler names/i);
    fireEvent.change(searchInput, { target: { value: 'cotton' } });

    expect(screen.getByText('David Chen')).toBeInTheDocument();
    expect(screen.queryByText('Marcus Lindqvist')).not.toBeInTheDocument();
  });

  it('renders loading skeleton when fetching', () => {
    vi.spyOn(reviewService, 'getTestimonials').mockReturnValue(new Promise(() => {}));

    renderTestimonialsPage();

    expect(screen.getByTestId('testimonials-loading')).toBeInTheDocument();
  });

  it('renders error state and permits retry', async () => {
    const errorSpy = vi
      .spyOn(reviewService, 'getTestimonials')
      .mockRejectedValueOnce(new Error('Connection timed out'))
      .mockResolvedValueOnce(mockReviews);

    renderTestimonialsPage();

    await waitFor(() => {
      expect(screen.getByTestId('testimonials-error')).toBeInTheDocument();
      expect(screen.getByText(/Connection timed out/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Retry Loading/i));

    await waitFor(() => {
      expect(screen.getByText('Marcus Lindqvist')).toBeInTheDocument();
    });

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});
