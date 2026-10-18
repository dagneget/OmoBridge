import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReservationCountdown } from '../features/checkout';
import i18n from '../i18n';
beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe('Reservation countdown', () => {
  it('counts a supplied deadline down without announcing every second', () => {
    render(<ReservationCountdown expiresAt="2026-10-18T12:02:00Z" />);
    expect(screen.getByRole('timer')).toHaveTextContent('2:00');
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('timer')).toHaveTextContent('1:59');
  });
  it('treats local deadline passage as needing server confirmation', () => {
    render(<ReservationCountdown expiresAt="2026-10-18T12:00:01Z" />);
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole('status')).toHaveTextContent(
      'elapsed on this device',
    );
    expect(
      screen.queryByText(/server reports that this reservation expired/),
    ).not.toBeInTheDocument();
  });
  it('uses absolute time after a suspended tab or clock change', () => {
    render(<ReservationCountdown expiresAt="2026-10-18T12:30:00Z" />);
    act(() => {
      vi.setSystemTime(new Date('2026-10-18T12:45:00Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'elapsed on this device',
    );
  });
  it.each([undefined, 'bad-date', '2026-10-18T12:10:00'])(
    'does not invent a deadline for %s',
    (expiresAt) => {
      render(<ReservationCountdown expiresAt={expiresAt} />);
      expect(
        screen.getByText(/Reservation deadline is unavailable/),
      ).toBeInTheDocument();
      expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    },
  );
  it('shows confirmed server expiry even with a future local deadline', () => {
    render(<ReservationCountdown expiresAt="2026-10-18T12:30:00Z" expired />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'server reports that this reservation expired',
    );
  });
  it('stops timers when unmounted', () => {
    const view = render(
      <ReservationCountdown expiresAt="2026-10-18T12:30:00Z" />,
    );
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
