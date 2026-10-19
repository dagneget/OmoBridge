import { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useCheckoutText } from './useCheckoutText';
interface Props {
  point?: [number, number];
  onPick: (lat: number, lng: number) => void;
}
function Pick({ onPick }: Props) {
  useMapEvents({
    click: ({ latlng }) =>
      onPick(latlng.lat, ((((latlng.lng + 180) % 360) + 360) % 360) - 180),
  });
  return null;
}
function ZoomControls() {
  const map = useMap();
  const t = useCheckoutText();
  return (
    <div className="absolute right-2 top-2 z-[500] grid gap-2">
      <button
        type="button"
        className="min-h-[44px] min-w-[44px] rounded bg-white p-2 text-slate-900"
        onClick={() => map.zoomIn()}
      >
        {t('zoomIn')}
      </button>
      <button
        type="button"
        className="min-h-[44px] min-w-[44px] rounded bg-white p-2 text-slate-900"
        onClick={() => map.zoomOut()}
      >
        {t('zoomOut')}
      </button>
    </div>
  );
}
export default function DeliveryMap({ point, onPick }: Props) {
  const [failed, setFailed] = useState(false);
  const t = useCheckoutText();
  if (failed) return <p role="status">{t('mapError')}</p>;
  return (
    <div
      className="h-64 w-full overflow-hidden rounded-lg"
      aria-label={t('pin')}
    >
      <MapContainer
        center={point ?? [5.79, 36.57]}
        zoom={12}
        zoomControl={false}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setFailed(true) }}
        />
        <Pick onPick={onPick} />
        <ZoomControls />
        {point && (
          <CircleMarker
            center={point}
            radius={10}
            pathOptions={{ color: '#064e3b', fillOpacity: 0.8 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
