import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '../../i18n/languages';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  Search,
  MapPin,
  Clock,
  Users,
  Camera,
  Tent,
  Music,
  Footprints,
  Flame,
  Home,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { Card, Button, Input, Skeleton, EmptyState } from '../../components/common';
import { tourismService } from '../../features/tourism/tourismService';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Experiences', icon: Compass },
  { id: 'CULTURAL_EVENT', label: 'Ceremonies & Rituals', icon: Flame },
  { id: 'VILLAGE_EXPERIENCE', label: 'Village Visits', icon: Home },
  { id: 'CAMPING', label: 'Eco-Camping', icon: Tent },
  { id: 'DANCE_MUSIC', label: 'Dance & Music', icon: Music },
  { id: 'TREKKING', label: 'Trekking & Hiking', icon: Footprints },
  { id: 'PHOTOGRAPHY', label: 'Photography Tours', icon: Camera },
];

function getCategoryIcon(category?: string) {
  switch (category) {
    case 'CULTURAL_EVENT':
      return Flame;
    case 'VILLAGE_EXPERIENCE':
      return Home;
    case 'CAMPING':
      return Tent;
    case 'DANCE_MUSIC':
      return Music;
    case 'TREKKING':
      return Footprints;
    case 'PHOTOGRAPHY':
      return Camera;
    default:
      return Sparkles;
  }
}

export default function TourismPage() {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const {
    data: packages = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.packages.list(undefined, language),
    queryFn: () => tourismService.getPackages(language),
  });

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Category filter
      if (selectedCategory !== 'ALL' && pkg.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = pkg.name?.toLowerCase().includes(query);
        const matchesOverview = pkg.overview?.toLowerCase().includes(query);
        const matchesLocation = pkg.locationText?.toLowerCase().includes(query);
        const matchesStory = pkg.story?.toLowerCase().includes(query);
        return matchesName || matchesOverview || matchesLocation || matchesStory;
      }
      return true;
    });
  }, [packages, selectedCategory, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in" data-testid="tourism-page">
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Compass className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ethical Community-Consented Tourism</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          South Omo Cultural & Eco-Tour Experiences
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Discover certified community rituals, trekking expeditions, and village visits. All packages guarantee fair local compensation, cultural integrity, and community consent.
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ceremonies, hikes, villages..."
            leftIcon={<Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-1 hover:text-foreground text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist" aria-label="Filter packages by category">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(tab.id)}
                className={`touch-target px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="packages-loading">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <div className="pt-4 flex justify-between items-center border-t border-border">
                <Skeleton className="h-6 w-28 rounded-md" />
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
          <h2 className="text-lg font-bold text-foreground">Could Not Load Tour Packages</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredPackages.length === 0 && (
        <EmptyState
          title="No packages match your search"
          description={
            searchQuery || selectedCategory !== 'ALL'
              ? 'Try adjusting your search keywords or switching category filters.'
              : 'Tour offerings will appear here once scheduled by local enterprises.'
          }
          action={
            (searchQuery || selectedCategory !== 'ALL') ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
              >
                Reset Filters
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Packages Grid */}
      {!isLoading && !isError && filteredPackages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="packages-grid">
          {filteredPackages.map((pkg) => {
            const CategoryIcon = getCategoryIcon(pkg.category);
            return (
              <Card
                key={pkg.id}
                className="flex flex-col justify-between p-6 hover:shadow-lg hover:border-primary/50 transition-all group"
                data-testid={`package-card-${pkg.id}`}
              >
                <div className="space-y-4">
                  {/* Category Pill & Location */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      <CategoryIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{pkg.category?.replace(/_/g, ' ') || 'Experience'}</span>
                    </span>

                    {pkg.locationText && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate max-w-[130px]">{pkg.locationText}</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {pkg.name}
                  </h2>

                  {/* Overview Text */}
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {pkg.overview || pkg.story || 'Authentic community eco-tourism experience.'}
                  </p>

                  {/* Key Metadata Badges */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                    {pkg.durationHours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {pkg.durationHours} hrs
                      </span>
                    )}
                    {pkg.maxGroupSize && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        Max {pkg.maxGroupSize} guests
                      </span>
                    )}
                  </div>
                </div>

                {/* Price and Details CTA */}
                <div className="pt-6 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
                      Price
                    </span>
                    <span className="text-lg font-extrabold text-foreground">
                      {formatETB(pkg.priceAmount || 0)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1 font-normal">
                      /{pkg.priceUnit?.toLowerCase().replace('per_', '') || 'person'}
                    </span>
                  </div>

                  <Link to={`/experiences/${pkg.id}`}>
                    <Button variant="primary" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
