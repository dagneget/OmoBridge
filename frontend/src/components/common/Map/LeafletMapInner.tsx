import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon problem with Vite
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LeafletMapInnerProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  zoom?: number;
  className?: string;
  onTileError?: () => void;
  /**
   * Optional path already travelled, oldest first. Rendered as a polyline under the marker.
   * Only supplied where there is a real route to draw (F-604 live tracking); every existing
   * caller passes nothing and gets exactly the single-marker map it had before.
   */
  trail?: Array<[number, number]>;
}

export default function LeafletMapInner({
  latitude,
  longitude,
  title,
  address,
  zoom = 13,
  className = 'h-72 w-full rounded-2xl',
  onTileError,
  trail,
}: LeafletMapInnerProps) {
  useEffect(() => {
    L.Marker.prototype.options.icon = defaultIcon;
  }, []);

  return (
    <div className={`overflow-hidden relative ${className}`} data-testid="leaflet-map-container">
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => {
              if (onTileError) {
                onTileError();
              }
            },
          }}
        />
        {trail && trail.length > 1 && (
          <Polyline
            positions={trail}
            pathOptions={{ color: '#0d9488', weight: 3, opacity: 0.75, lineJoin: 'round' }}
          />
        )}

        <Marker position={[latitude, longitude]} icon={defaultIcon}>
          {(title || address) && (
            <Popup>
              <div className="text-xs p-1">
                {title && <p className="font-bold text-foreground">{title}</p>}
                {address && <p className="text-muted-foreground mt-0.5">{address}</p>}
              </div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
