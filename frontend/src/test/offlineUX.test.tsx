import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { NetworkButton } from '../components/common/NetworkButton';
import { OfflinePage } from '../pages/public/OfflinePage';

describe('Offline UX (F-108)', () => {
  let onLineSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onLineSpy = vi.spyOn(navigator, 'onLine', 'get');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when navigator is online initially', () => {
    onLineSpy.mockReturnValue(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the offline banner when going offline', () => {
    onLineSpy.mockReturnValue(true);
    render(<OfflineBanner />);

    // Simulate going offline
    act(() => {
      onLineSpy.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/you are currently offline/i);
    expect(banner).toHaveTextContent(/online actions are disabled/i);
  });

  it('disables network-only buttons when offline with explanatory tooltip', () => {
    onLineSpy.mockReturnValue(true);
    const handleClick = vi.fn();

    const { rerender } = render(
      <NetworkButton onClick={handleClick}>Book Tour Now</NetworkButton>
    );

    const btn = screen.getByRole('button', { name: /book tour now/i });
    expect(btn).not.toBeDisabled();

    // Trigger offline
    act(() => {
      onLineSpy.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    rerender(<NetworkButton onClick={handleClick}>Book Tour Now</NetworkButton>);

    expect(btn).toBeDisabled();
    expect(screen.getByRole('tooltip')).toHaveTextContent(/connection required/i);
  });

  it('shows restored notice when transitioning from offline back to online', () => {
    onLineSpy.mockReturnValue(false);
    render(<OfflineBanner />);

    // First offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument();

    // Then restore online
    act(() => {
      onLineSpy.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByText(/internet connection restored/i)).toBeInTheDocument();
  });

  it('renders the OfflinePage fallback view with retry and return home actions', () => {
    render(
      <MemoryRouter>
        <OfflinePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/you are currently offline/i);
    expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument();
  });
});
