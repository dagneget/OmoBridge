import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GuideDashboardPage from '../pages/dashboard/GuideDashboardPage';
import { guideService } from '../features/guide/guideService';
import { MOCK_GUIDE_ID, mockAssignedBookings, mockGuideProfile, mockGuideReviews } from '../mocks/fixtures/guide';

const renderPage = (path = '/dashboard/guide/profile') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <GuideDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Guide Dashboard — F-1201 profile, F-1202 bookings, F-1203 reviews', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('F-1201 guide profile', () => {
    it('renders bio, languages, expertise, rate and availability from the API', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);

      renderPage('/dashboard/guide/profile');

      expect(await screen.findByTestId('guide-profile')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Bio$/)).toHaveValue(mockGuideProfile.bio);
      expect(screen.getByLabelText(/^Languages$/)).toHaveValue('Amharic, English, Hamer');
      expect(screen.getByLabelText(/^Expertise$/)).toHaveValue(mockGuideProfile.specialties);
      expect(screen.getByLabelText(/^Daily rate \(ETB\)$/)).toHaveValue(1800);
      expect(screen.getByLabelText(/Available for new bookings/)).toBeChecked();
      expect(screen.getByText(/Demeke Tolossa/)).toBeInTheDocument();
    });

    it('submits against the guide id returned by /me, never a value from the route', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      const update = vi
        .spyOn(guideService, 'updateProfile')
        .mockResolvedValue({ ...mockGuideProfile, bio: 'Updated bio' });

      renderPage('/dashboard/guide/profile');
      await screen.findByTestId('guide-profile');

      fireEvent.change(screen.getByLabelText(/^Bio$/), { target: { value: 'Updated bio' } });
      fireEvent.click(screen.getByTestId('guide-profile-save'));

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      // The id comes from the /me response, so a guide cannot address another
      // guide's record even before the server refuses the request.
      expect(update).toHaveBeenCalledWith(MOCK_GUIDE_ID, expect.objectContaining({ bio: 'Updated bio' }));
    });

    it('sends languages as the list the API expects', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      const update = vi.spyOn(guideService, 'updateProfile').mockResolvedValue(mockGuideProfile);

      renderPage('/dashboard/guide/profile');
      await screen.findByTestId('guide-profile');

      fireEvent.change(screen.getByLabelText(/^Languages$/), {
        target: { value: 'Amharic,  English ,, Hamer ' },
      });
      fireEvent.click(screen.getByTestId('guide-profile-save'));

      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][1].languages).toEqual(['Amharic', 'English', 'Hamer']);
    });

    it('surfaces a refusal when another guide record is addressed', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'updateProfile').mockRejectedValue(
        new Error('You do not have permission to update this guide profile')
      );

      renderPage('/dashboard/guide/profile');
      await screen.findByTestId('guide-profile');

      fireEvent.change(screen.getByLabelText(/^Bio$/), { target: { value: 'Changed' } });
      fireEvent.click(screen.getByTestId('guide-profile-save'));

      expect(await screen.findByTestId('guide-profile-save-error')).toHaveTextContent(
        /do not have permission/i
      );
    });

    it('renders the error state when the profile cannot be loaded', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockRejectedValue(new Error('Profile unavailable'));

      renderPage('/dashboard/guide/profile');

      expect(await screen.findByTestId('guide-profile-error')).toBeInTheDocument();
    });

    it('explains rather than renders an edit form when no guide profile is linked', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockRejectedValue(new Error('Guide profile not found'));

      renderPage('/dashboard/guide/profile');

      expect(await screen.findByTestId('guide-profile-error')).toBeInTheDocument();
      expect(screen.queryByTestId('guide-profile-save')).not.toBeInTheDocument();
    });
  });

  describe('F-1202 assigned bookings', () => {
    it('lists only bookings assigned to this guide', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getAssignedBookings').mockResolvedValue(mockAssignedBookings);

      renderPage('/dashboard/guide');

      expect(await screen.findByTestId('guide-bookings')).toBeInTheDocument();
      expect(screen.getByText('BK-2041')).toBeInTheDocument();
      expect(screen.getByText('BK-2033')).toBeInTheDocument();
      // Proves the guide-scoped endpoint was used, not the buyer-scoped /my.
      expect(guideService.getAssignedBookings).toHaveBeenCalledWith(MOCK_GUIDE_ID);
    });

    it('offers accept and decline only for a pending request', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getAssignedBookings').mockResolvedValue(mockAssignedBookings);

      renderPage('/dashboard/guide');
      await screen.findByTestId('guide-bookings');

      // One REQUESTED booking -> exactly one accept control.
      expect(screen.getAllByTestId('guide-booking-accept')).toHaveLength(1);
      expect(screen.getAllByTestId('guide-booking-decline')).toHaveLength(1);
      expect(screen.getByText('No action needed')).toBeInTheDocument();
    });

    it('accepts a booking by sending CONFIRMED', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getAssignedBookings').mockResolvedValue(mockAssignedBookings);
      const update = vi.spyOn(guideService, 'updateBookingStatus').mockResolvedValue({
        ...mockAssignedBookings[0],
        status: 'CONFIRMED',
      });

      renderPage('/dashboard/guide');
      await screen.findByTestId('guide-bookings');

      fireEvent.click(screen.getByTestId('guide-booking-accept'));

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      expect(update).toHaveBeenCalledWith(mockAssignedBookings[0].id, 'CONFIRMED');
    });

    it('declines a booking by sending DECLINED', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getAssignedBookings').mockResolvedValue(mockAssignedBookings);
      const update = vi.spyOn(guideService, 'updateBookingStatus').mockResolvedValue({
        ...mockAssignedBookings[0],
        status: 'DECLINED',
      });

      renderPage('/dashboard/guide');
      await screen.findByTestId('guide-bookings');

      fireEvent.click(screen.getByTestId('guide-booking-decline'));

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      expect(update).toHaveBeenCalledWith(mockAssignedBookings[0].id, 'DECLINED');
    });

    it('shows a failed action without changing the list', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getAssignedBookings').mockResolvedValue(mockAssignedBookings);
      vi.spyOn(guideService, 'updateBookingStatus').mockRejectedValue(new Error('Permission denied'));

      renderPage('/dashboard/guide');
      await screen.findByTestId('guide-bookings');

      fireEvent.click(screen.getByTestId('guide-booking-accept'));

      expect(await screen.findByTestId('guide-bookings-action-error')).toHaveTextContent(/permission denied/i);
      expect(screen.getByText('BK-2041')).toBeInTheDocument();
    });

    it('renders an empty state when nothing is assigned', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getAssignedBookings').mockResolvedValue([]);

      renderPage('/dashboard/guide');

      expect(await screen.findByTestId('guide-bookings-none')).toBeInTheDocument();
    });
  });

  describe('F-1203 reviews and payments', () => {
    it('renders the aggregate rating and reviews from the API', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getMyReviews').mockResolvedValue(mockGuideReviews);

      renderPage('/dashboard/guide/reviews');

      expect(await screen.findByTestId('guide-reviews')).toBeInTheDocument();
      expect(screen.getByTestId('guide-reviews-average')).toHaveTextContent('4.5');
      expect(screen.getByTestId('guide-reviews-total')).toHaveTextContent('2');
      expect(screen.getByText(/Demeke explained every ceremony/i)).toBeInTheDocument();
      expect(guideService.getMyReviews).toHaveBeenCalledWith(MOCK_GUIDE_ID);
    });

    it('states that payments are unavailable instead of inventing amounts', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getMyReviews').mockResolvedValue(mockGuideReviews);

      renderPage('/dashboard/guide/reviews');

      expect(await screen.findByTestId('guide-payments-unavailable')).toBeInTheDocument();
      expect(screen.getByTestId('guide-payments-unavailable')).toHaveTextContent(/does not expose a guide payments endpoint/i);
    });

    it('renders the error state when reviews cannot be loaded', async () => {
      vi.spyOn(guideService, 'getMyProfile').mockResolvedValue(mockGuideProfile);
      vi.spyOn(guideService, 'getMyReviews').mockRejectedValue(new Error('Reviews unavailable'));

      renderPage('/dashboard/guide/reviews');

      expect(await screen.findByTestId('guide-reviews-error')).toBeInTheDocument();
    });
  });
});
