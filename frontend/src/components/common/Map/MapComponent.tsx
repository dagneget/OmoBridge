import { lazy, Suspense, useState } from 'react';
import { MapPin, Navigation, WifiOff, ExternalLink } from 'lucide-react';
import { Skeleton } from '../Skeleton';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

// Lazy load the Leaflet map so Leaflet is never bundled into the main entry bundle
const LazyLeafletMap = lazy(() => import('./LeafletMapInner'));

export interface MapComponentProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  zoom?: number;
  className?: string;
  showDirectionsButton?: boolean;
}

export function MapComponent({
  latitude,
  longitude,
  title,
  address,
  zoom = 13,
  className = 'h-72 w-full',
  showDirectionsButton = true,
}: MapComponentProps) {
  const { isOnline } = useNetworkStatus();
  const [tileError, setTileError] = useState(false);

  // Fallback to coordinates directions link (Google Maps / geo URI)
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  const shouldShowOfflineFallback = !isOnline || tileError;

  return (
    <div className="space-y-3" data-testid="map-component">
      {shouldShowOfflineFallback ? (
        <div
          className={`flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border bg-muted/40 text-center relative overflow-hidden ${className}`}
          data-testid="map-offline-fallback"
        >
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3 shadow-xs">
            <WifiOff className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          </div>

          <h3 className="text-sm font-bold text-foreground">
            Interactive Map Offline
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-3">
            Map tiles cannot load without an internet connection. Coordinates and offline directions are preserved below.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono text-foreground mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>
              {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E
            </span>
          </div>

          {address && (
            <p className="text-xs text-muted-foreground max-w-md line-clamp-2 mb-3">
              {address}
            </p>
          )}

          {showDirectionsButton && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline touch-target"
            >
              <span>Open in device navigation</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <Suspense
            fallback={
              <div className={`w-full flex items-center justify-center bg-muted/30 ${className}`}>
                <Skeleton className="w-full h-full rounded-2xl" />
              </div>
            }
          >
            <LazyLeafletMap
              latitude={latitude}
              longitude={longitude}
              title={title}
              address={address}
              zoom={zoom}
              className={className}
              onTileError={() => setTileError(true)}
            />
          </Suspense>
        </div>
      )}

      {/* Directions & Coordinate Footer Link */}
      {showDirectionsButton && !shouldShowOfflineFallback && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span className="font-mono">
              {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
            </span>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors touch-target"
            data-testid="map-open-directions"
          >
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Directions</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}

export default MapComponent;
