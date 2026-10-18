import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AvailabilityPicker } from '../features/bookings/components/AvailabilityPicker';
import { bookingService } from '../features/bookings/bookingService';
import type { SessionResponse } from '../types/api';

const mockSessions: SessionResponse[] = [
  {
    id: 'sess-open-1',
    packageId: 'pkg-123',
    sessionDate: '2026-11-01',
    startTime: { hour: 9, minute: 0 },
    capacity: 10,
    bookedCount: 4,
    availableCapacity: 6,
    status: 'OPEN',
  },
  {
    id: 'sess-full-2',
    packageId: 'pkg-123',
    sessionDate: '2026-11-01',
    startTime: { hour: 14, minute: 0 },
    capacity: 8,
    bookedCount: 8,
    availableCapacity: 0,
    status: 'OPEN',
  },
  {
    id: 'sess-closed-3',
    packageId: 'pkg-123',
    sessionDate: '2026-11-02',
    startTime: { hour: 10, minute: 0 },
    capacity: 12,
    bookedCount: 0,
    availableCapacity: 12,
    status: 'CLOSED',
  },
  {
    id: 'sess-limited-4',
    packageId: 'pkg-123',
    sessionDate: '2026-11-02',
    startTime: { hour: 15, minute: 0 },
    capacity: 10,
    bookedCount: 8,
    availableCapacity: 2,
    status: 'OPEN',
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

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('AvailabilityPicker (F-401)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders available sessions and permits selection of open session', async () => {
    vi.spyOn(bookingService, 'getSessions').mockResolvedValue(mockSessions);
    const handleSelect = vi.fn();

    renderWithClient(
      <AvailabilityPicker
        packageId="pkg-123"
        onSelectSession={handleSelect}
        partySize={2}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('availability-picker')).toBeInTheDocument();
    });

    const openBtn = screen.getByTestId('session-option-sess-open-1');
    expect(openBtn).not.toBeDisabled();
    expect(openBtn).toHaveTextContent('Available');
    expect(openBtn).toHaveTextContent('6 spots remaining');

    fireEvent.click(openBtn);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sess-open-1', status: 'OPEN' })
    );
  });

  it('disables full sessions and shows Full badge', async () => {
    vi.spyOn(bookingService, 'getSessions').mockResolvedValue(mockSessions);
    const handleSelect = vi.fn();

    renderWithClient(
      <AvailabilityPicker
        packageId="pkg-123"
        onSelectSession={handleSelect}
        partySize={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-option-sess-full-2')).toBeInTheDocument();
    });

    const fullBtn = screen.getByTestId('session-option-sess-full-2');
    expect(fullBtn).toBeDisabled();
    expect(fullBtn).toHaveTextContent('Full');

    fireEvent.click(fullBtn);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('disables closed sessions and shows Closed badge', async () => {
    vi.spyOn(bookingService, 'getSessions').mockResolvedValue(mockSessions);
    const handleSelect = vi.fn();

    renderWithClient(
      <AvailabilityPicker
        packageId="pkg-123"
        onSelectSession={handleSelect}
        partySize={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-option-sess-closed-3')).toBeInTheDocument();
    });

    const closedBtn = screen.getByTestId('session-option-sess-closed-3');
    expect(closedBtn).toBeDisabled();
    expect(closedBtn).toHaveTextContent('Closed');

    fireEvent.click(closedBtn);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('disables sessions where partySize exceeds availableCapacity', async () => {
    vi.spyOn(bookingService, 'getSessions').mockResolvedValue(mockSessions);
    const handleSelect = vi.fn();

    // partySize 4 is greater than sess-limited-4 availableCapacity (2)
    renderWithClient(
      <AvailabilityPicker
        packageId="pkg-123"
        onSelectSession={handleSelect}
        partySize={4}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-option-sess-limited-4')).toBeInTheDocument();
    });

    const limitedBtn = screen.getByTestId('session-option-sess-limited-4');
    expect(limitedBtn).toBeDisabled();
    expect(limitedBtn).toHaveTextContent('Only 2 left');

    fireEvent.click(limitedBtn);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('shows empty state when no sessions are scheduled', async () => {
    vi.spyOn(bookingService, 'getSessions').mockResolvedValue([]);

    renderWithClient(
      <AvailabilityPicker
        packageId="pkg-empty"
        onSelectSession={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No Sessions Scheduled')).toBeInTheDocument();
    });
  });

  it('shows error state with retry button on network error', async () => {
    vi.spyOn(bookingService, 'getSessions').mockRejectedValue(new Error('Network error'));

    renderWithClient(
      <AvailabilityPicker
        packageId="pkg-err"
        onSelectSession={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Could not load session availability')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry sessions/i })).toBeInTheDocument();
    });
  });
});
