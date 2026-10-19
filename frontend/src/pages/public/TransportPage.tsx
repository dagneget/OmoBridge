import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Car,
  MapPin,
  Phone,
  Search,
  Users,
  Compass,
  ArrowRight,
  AlertCircle,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Skeleton,
  EmptyState,
  Modal,
  StatusChip,
} from '../../components/common';
import { tourismService } from '../../features/tourism/tourismService';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import { formatEthiopianPhoneDisplay } from '../../utils/phone';
import type { TransportService } from '../../types/api';

const VEHICLE_TYPES = ['All', '4WD', 'Minibus', 'Boat', 'Motorbike'] as const;

function getVehicleCapacityEstimate(vehicleType?: string): string {
  if (!vehicleType) return '1-4 passengers';
  const lower = vehicleType.toLowerCase();
  if (lower.includes('4wd') || lower.includes('cruiser') || lower.includes('patrol')) {
    return '4 - 6 passengers';
  }
  if (lower.includes('minibus') || lower.includes('van') || lower.includes('hiace')) {
    return '10 - 14 passengers';
  }
  if (lower.includes('boat') || lower.includes('canoe')) {
    return '4 - 8 passengers';
  }
  if (lower.includes('motorbike') || lower.includes('bajaj') || lower.includes('tuk')) {
    return '1 - 3 passengers';
  }
  return '1 - 4 passengers';
}

export default function TransportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedTransport, setSelectedTransport] = useState<TransportService | null>(null);

  const {
    data: transports = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.transport.list(),
    queryFn: () => tourismService.getTransportServices(),
  });

  const filteredTransports = useMemo(() => {
    return transports.filter((item) => {
      // Filter by vehicle type
      if (selectedType !== 'All') {
        const matchesType = item.vehicleType
          ?.toLowerCase()
          .includes(selectedType.toLowerCase());
        if (!matchesType) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          item.serviceName?.toLowerCase().includes(query) ||
          item.routeDescription?.toLowerCase().includes(query) ||
          item.vehicleType?.toLowerCase().includes(query) ||
          item.enterprise?.name?.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [transports, selectedType, searchQuery]);

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in"
      data-testid="transport-page"
    >
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Car className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Local Logistics & Inter-Valley Transfers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Transport & Shuttles in South Omo
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Reliable 4WD land cruisers, airport shuttles from Jinka, and river transfers operated by verified community cooperatives and regional logistics partners.
        </p>
      </div>

      {/* Controls: Search and Vehicle Type Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Input
              type="text"
              placeholder="Search routes (e.g. Jinka, Turmi, Dimeka)..."
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

          {/* Vehicle Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {VEHICLE_TYPES.map((type) => {
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-target ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                  }`}
                  data-testid={`filter-vehicle-${type.toLowerCase()}`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="transport-loading">
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
        <div
          className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3"
          role="alert"
          data-testid="transport-error"
        >
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">Could Not Load Transport Services</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredTransports.length === 0 && (
        <div data-testid="transport-empty">
          <EmptyState
            title="No transport services found"
            description={
              searchQuery || selectedType !== 'All'
                ? 'No transport options match your current route or vehicle filter.'
                : 'Verified local transport providers and shuttles will be listed here.'
            }
            action={
              searchQuery || selectedType !== 'All' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('All');
                  }}
                  data-testid="reset-transport-filter"
                >
                  Reset Filters
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Transport Cards Grid */}
      {!isLoading && !isError && filteredTransports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="transport-grid">
          {filteredTransports.map((transport) => {
            const capacity = getVehicleCapacityEstimate(transport.vehicleType);
            const cardId = transport.id || transport.serviceName || 'service';

            return (
              <Card
                key={cardId}
                className="flex flex-col justify-between p-6 hover:shadow-lg hover:border-primary/50 transition-all group"
                data-testid={`transport-card-${cardId}`}
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        <Car className="w-3 h-3" aria-hidden="true" />
                        <span>{transport.vehicleType || 'Vehicle'}</span>
                      </span>
                      {transport.active !== false ? (
                        <StatusChip status="ACTIVE" className="text-[10px]" />
                      ) : (
                        <StatusChip status="DEACTIVATED" className="text-[10px]" />
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {transport.serviceName}
                    </h2>
                    {transport.enterprise?.name && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        Operated by {transport.enterprise.name}
                      </p>
                    )}
                  </div>

                  {/* Route Description */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <span className="font-semibold text-foreground">Route:</span>{' '}
                        <span className="text-muted-foreground">{transport.routeDescription}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border/40">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span>Capacity: <strong className="text-foreground">{capacity}</strong></span>
                    </div>
                  </div>

                  {/* Phone contact snippet */}
                  {transport.contactPhone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <a
                        href={`tel:${transport.contactPhone}`}
                        className="hover:text-foreground font-mono"
                        data-testid={`phone-link-${cardId}`}
                      >
                        {formatEthiopianPhoneDisplay(transport.contactPhone)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Price and Details Action */}
                <div className="pt-5 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
                      Standard Rate
                    </span>
                    <span className="text-lg font-extrabold text-foreground" data-testid={`price-${cardId}`}>
                      {formatETB(transport.priceAmount || 0)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {transport.currency || 'ETB'}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTransport(transport)}
                    className="flex items-center gap-1.5 touch-target"
                    data-testid={`view-transport-btn-${cardId}`}
                  >
                    <span>Details & Contact</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transport Detail Modal */}
      {selectedTransport && (
        <Modal
          isOpen={Boolean(selectedTransport)}
          onClose={() => setSelectedTransport(null)}
          title={selectedTransport.serviceName || 'Transport Details'}
          size="md"
        >
          <div className="space-y-6" data-testid="transport-detail-modal">
            {/* Header badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {selectedTransport.vehicleType || 'Vehicle'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Est. {getVehicleCapacityEstimate(selectedTransport.vehicleType)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-primary">
                  {formatETB(selectedTransport.priceAmount || 0)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedTransport.currency || 'ETB'} per route/vehicle
                </span>
              </div>
            </div>

            {/* Route description card */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Compass className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Travel Corridor & Route</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {selectedTransport.routeDescription}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Inspected 4WD capability for regional road conditions</span>
              </div>
            </div>

            {/* Operator and Contact */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3 text-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Operator Contact & Dispatch
              </div>
              {selectedTransport.enterprise?.name && (
                <div>
                  <span className="text-muted-foreground">Service Provider:</span>{' '}
                  <strong className="text-foreground">{selectedTransport.enterprise.name}</strong>
                </div>
              )}
              {selectedTransport.contactPhone ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span className="font-mono text-sm font-bold text-foreground">
                      {formatEthiopianPhoneDisplay(selectedTransport.contactPhone)}
                    </span>
                  </div>
                  <a
                    href={`tel:${selectedTransport.contactPhone}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors touch-target"
                  >
                    Call Driver
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground">Direct phone inquiry is available through the local cooperative station.</p>
              )}
            </div>

            {/* Travel notice */}
            <div className="p-3.5 rounded-xl border border-border bg-card text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>South Omo Travel Advice</span>
              </div>
              <p>
                During rainy periods, road conditions between Jinka, Key Afer, and Turmi can fluctuate. All registered drivers carry spare tires and recovery gear.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
