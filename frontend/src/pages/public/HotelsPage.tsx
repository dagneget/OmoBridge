import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button, Card, Input, Skeleton, EmptyState, Modal, MapComponent } from '../../components/common';
import { tourismService } from '../../features/tourism/tourismService';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import type { Hotel } from '../../types/api';

// Approximate coordinates for South Omo tourism hubs
const DEFAULT_HOTEL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Buska Hotel': { lat: 4.9701, lng: 36.4912 }, // Turmi
  'Green Resort': { lat: 5.7833, lng: 36.5667 }, // Jinka
  'Paradise Lodge': { lat: 6.0333, lng: 37.5500 }, // Arba Minch
  'Turmi Desert Lodge & Eco Resort': { lat: 4.9650, lng: 36.4850 }, // Turmi
};

export default function HotelsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const {
    data: hotels = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.hotels.list(),
    queryFn: () => tourismService.getHotels(),
  });

  const filteredHotels = useMemo(() => {
    if (!searchQuery.trim()) return hotels;
    const query = searchQuery.toLowerCase();
    return hotels.filter(
      (h) =>
        h.name?.toLowerCase().includes(query) ||
        h.locationText?.toLowerCase().includes(query) ||
        h.amenities?.toLowerCase().includes(query)
    );
  }, [hotels, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in" data-testid="hotels-page">
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Verified Accommodations & Lodges</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Hotels & Eco-Resorts in South Omo
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Book community-partnered lodges and certified eco-resorts across Turmi, Jinka, and Arba Minch. Transparent rates directly supporting regional hospitality workers.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Input
          type="text"
          placeholder="Search hotels, towns, amenities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          rightIcon={
            searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 hover:text-foreground text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : undefined
          }
        />
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="hotels-loading">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <div className="pt-4 flex justify-between items-center border-t border-border">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3" role="alert">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">Could Not Load Hotel Listings</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredHotels.length === 0 && (
        <EmptyState
          title="No accommodations found"
          description={
            searchQuery
              ? 'No lodges match your search keywords. Try adjusting your query.'
              : 'Registered lodges and resorts will appear here once approved.'
          }
          action={
            searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Reset Search
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Hotel Cards Grid */}
      {!isLoading && !isError && filteredHotels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="hotels-grid">
          {filteredHotels.map((hotel) => {
            const amenitiesList = hotel.amenities ? hotel.amenities.split(',').map((a) => a.trim()) : [];
            return (
              <Card
                key={hotel.id || hotel.name}
                className="flex flex-col justify-between p-6 hover:shadow-lg hover:border-primary/50 transition-all group"
                data-testid={`hotel-card-${hotel.id || hotel.name}`}
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {hotel.name}
                    </h2>
                    {hotel.locationText && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                        <span>{hotel.locationText}</span>
                      </p>
                    )}
                  </div>

                  {/* Amenities Pills */}
                  {amenitiesList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {amenitiesList.slice(0, 4).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
                        >
                          {amenity}
                        </span>
                      ))}
                      {amenitiesList.length > 4 && (
                        <span className="text-[11px] px-1.5 py-0.5 text-muted-foreground font-medium">
                          +{amenitiesList.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contact Snippets */}
                  <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs text-muted-foreground">
                    {hotel.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                        <a href={`tel:${hotel.contactPhone}`} className="hover:text-foreground">
                          {hotel.contactPhone}
                        </a>
                      </div>
                    )}
                    {hotel.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                        <a href={`mailto:${hotel.contactEmail}`} className="hover:text-foreground truncate">
                          {hotel.contactEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & View Detail Button */}
                <div className="pt-5 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
                      From
                    </span>
                    <span className="text-lg font-extrabold text-foreground">
                      {formatETB(hotel.priceFrom || 0)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">/night</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedHotel(hotel)}
                    data-testid={`view-hotel-button-${hotel.id || hotel.name}`}
                  >
                    View & Map
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Hotel Detail & Map Modal */}
      {selectedHotel && (
        <Modal
          isOpen={Boolean(selectedHotel)}
          onClose={() => setSelectedHotel(null)}
          title={selectedHotel.name || 'Hotel Details'}
          size="lg"
        >
          <div className="space-y-6" data-testid="hotel-detail-modal">
            {/* Header info */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>{selectedHotel.locationText || 'South Omo'}</span>
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">
                  {formatETB(selectedHotel.priceFrom || 0)}
                </span>
                <span className="text-sm text-muted-foreground font-normal">/night starting rate</span>
              </div>
            </div>

            {/* Amenities list */}
            {selectedHotel.amenities && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Amenities & Facilities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedHotel.amenities.split(',').map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{item.trim()}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Contact info */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-2 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Direct Inquiries & Reservation
              </h3>
              {selectedHotel.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" aria-hidden="true" />
                  <a href={`tel:${selectedHotel.contactPhone}`} className="text-primary font-medium hover:underline">
                    {selectedHotel.contactPhone}
                  </a>
                </div>
              )}
              {selectedHotel.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
                  <a href={`mailto:${selectedHotel.contactEmail}`} className="text-primary font-medium hover:underline">
                    {selectedHotel.contactEmail}
                  </a>
                </div>
              )}
            </div>

            {/* Interactive Map */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Location & Coordinates
              </h3>
              {(() => {
                const coords = DEFAULT_HOTEL_COORDINATES[selectedHotel.name || ''] || {
                  lat: 5.7833,
                  lng: 36.5667,
                };
                return (
                  <MapComponent
                    latitude={coords.lat}
                    longitude={coords.lng}
                    title={selectedHotel.name}
                    address={selectedHotel.locationText}
                    className="h-64 w-full"
                  />
                );
              })()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
