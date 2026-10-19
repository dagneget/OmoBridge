import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MapComponent } from '../components/common/Map';
import * as networkHook from '../hooks/useNetworkStatus';

// Mock LeafletMapInner in tests to avoid jsdom Canvas/SVG renderer limitations
vi.mock('../components/common/Map/LeafletMapInner', () => {
  return {
    default: ({ latitude, longitude, title }: { latitude: number; longitude: number; title?: string }) => (
      <div data-testid="leaflet-map-inner">
        <span>Mocked Leaflet Map at {latitude}, {longitude}</span>
        {title && <span>{title}</span>}
      </div>
    ),
  };
});

describe('Map Component (F-304)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders offline fallback with coordinates, address, and directions link when network is offline', () => {
    vi.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isOnline: false,
      wasOffline: false,
    });

    render(
      <MapComponent
        latitude={5.12345}
        longitude={36.56789}
        title="Dimeka Cultural Center"
        address="Dimeka Sacred Grounds, South Omo"
      />
    );

    // Fallback card
    expect(screen.getByTestId('map-offline-fallback')).toBeInTheDocument();
    expect(screen.getByText('Interactive Map Offline')).toBeInTheDocument();
    expect(
      screen.getByText(/map tiles cannot load without an internet connection/i)
    ).toBeInTheDocument();

    // Coordinates displayed accurately
    expect(screen.getByText(/5\.12345° N, 36\.56789° E/)).toBeInTheDocument();
    expect(screen.getByText('Dimeka Sacred Grounds, South Omo')).toBeInTheDocument();

    // Open directions navigation link
    const directionsLink = screen.getByRole('link', { name: /open in device navigation/i });
    expect(directionsLink).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=5.12345,36.56789'
    );
    expect(directionsLink).toHaveAttribute('target', '_blank');
  });

  it('renders lazy-loaded map and external directions link when network is online', async () => {
    vi.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isOnline: true,
      wasOffline: false,
    });

    render(
      <MapComponent
        latitude={5.12345}
        longitude={36.56789}
        title="Dimeka Sacred Grounds"
      />
    );

    // Should load the lazy Leaflet map component
    await waitFor(() => {
      expect(screen.getByTestId('leaflet-map-inner')).toBeInTheDocument();
      expect(screen.getByText(/mocked leaflet map at 5\.12345, 36\.56789/i)).toBeInTheDocument();
    });

    // Check Open Directions link in footer
    const directionsLink = screen.getByTestId('map-open-directions');
    expect(directionsLink).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=5.12345,36.56789'
    );
    expect(screen.getByText(/5\.1235° N, 36\.5679° E/)).toBeInTheDocument();
  });

  it('hides directions button when showDirectionsButton is set to false', () => {
    vi.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isOnline: false,
      wasOffline: false,
    });

    render(
      <MapComponent
        latitude={5.12345}
        longitude={36.56789}
        showDirectionsButton={false}
      />
    );

    expect(screen.getByTestId('map-offline-fallback')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open in device navigation/i })).not.toBeInTheDocument();
  });
});
