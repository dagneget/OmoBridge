import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  FileCheck,
  Flame,
  Footprints,
  HeartHandshake,
  Home,
  Info,
  MapPin,
  Music,
  Navigation,
  PartyPopper,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tent,
  Camera,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, Skeleton } from '../../components/common';
import { tourismService } from '../../features/tourism/tourismService';
import { queryKeys } from '../../services/queryKeys';
import { formatETB, formatDateTime } from '../../utils/formatters';

function CategoryBadgeIcon({ category, className }: { category?: string; className?: string }) {
  switch (category) {
    case 'CULTURAL_EVENT':
      return <Flame className={className} aria-hidden="true" />;
    case 'VILLAGE_EXPERIENCE':
      return <Home className={className} aria-hidden="true" />;
    case 'CAMPING':
      return <Tent className={className} aria-hidden="true" />;
    case 'DANCE_MUSIC':
      return <Music className={className} aria-hidden="true" />;
    case 'TREKKING':
      return <Footprints className={className} aria-hidden="true" />;
    case 'PHOTOGRAPHY':
      return <Camera className={className} aria-hidden="true" />;
    default:
      return <Sparkles className={className} aria-hidden="true" />;
  }
}

export default function ExperienceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: pkg,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.packages.detail(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Package ID is required');
      return tourismService.getPackageById(id);
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in" data-testid="experience-loading">
        <Skeleton className="h-6 w-32 rounded-md" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-6 w-1/2 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !pkg) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-16 text-center space-y-6" role="alert" data-testid="experience-error">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Experience Not Found</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'The requested tour package could not be retrieved or does not exist.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate('/tourism')}>
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Back to Experiences
          </Button>
          <Button variant="primary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const formattedPriceUnit = pkg.priceUnit ? pkg.priceUnit.toLowerCase().replace('per_', '') : 'person';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-10 animate-in fade-in" data-testid="experience-details-page">
      {/* Top Navigation */}
      <div>
        <Link
          to="/tourism"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
          Back to all experiences
        </Link>

        {/* Title and Badge Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              <CategoryBadgeIcon category={pkg.category} className="w-3.5 h-3.5" />
              <span>{pkg.category?.replace(/_/g, ' ') || 'Experience'}</span>
            </span>

            {pkg.enterpriseName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <HeartHandshake className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Offered by {pkg.enterpriseName}</span>
              </span>
            )}

            {pkg.communityApprovalRef && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Community Certified</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
            {pkg.name}
          </h1>

          {pkg.locationText && (
            <p className="flex items-center text-sm sm:text-base text-muted-foreground gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span>{pkg.locationText}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 items-start">
        {/* Left Column: Details, Cultural Rules, Story */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key Facts Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-card border border-border">
            {pkg.durationHours && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  Duration
                </span>
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  {pkg.durationHours} Hours
                </p>
              </div>
            )}

            {pkg.maxGroupSize && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  Group Size
                </span>
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  Max {pkg.maxGroupSize} Guests
                </p>
              </div>
            )}

            {pkg.openingHours && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  Operating Hours
                </span>
                <p className="text-sm sm:text-base font-semibold text-foreground truncate" title={pkg.openingHours}>
                  {pkg.openingHours}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <PartyPopper className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                Channel
              </span>
              <p className="text-sm sm:text-base font-semibold text-foreground">
                App & USSD
              </p>
            </div>
          </div>

          {/* PROMINENT MANDATORY CULTURAL RULES SECTION */}
          {pkg.culturalRules && (
            <div
              className="p-6 rounded-2xl border-2 border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100 space-y-4 shadow-xs"
              data-testid="cultural-rules-section"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-amber-900 dark:text-amber-200">
                    Mandatory Cultural Rules & Protocol
                  </h2>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 font-medium">
                    Please read and adhere to community traditions before booking
                  </p>
                </div>
              </div>

              <div className="pl-1 text-sm sm:text-base leading-relaxed bg-background/50 dark:bg-background/20 p-4 rounded-xl border border-amber-500/20 font-medium">
                {pkg.culturalRules}
              </div>

              <div className="flex items-start gap-2 text-xs text-amber-800/90 dark:text-amber-300/90">
                <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  All visitors are expected to maintain utmost dignity, respect sacred grounds, and honor elders. Photography of ceremonies without explicit elder guidance is strictly prohibited.
                </span>
              </div>
            </div>
          )}

          {/* Overview */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Experience Overview
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {pkg.overview || 'Authentic community-led cultural immersion experience in South Omo.'}
            </p>
          </div>

          {/* Cultural Story & Heritage */}
          {pkg.story && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Heritage & Narrative</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                The Cultural Story
              </h2>
              <div className="prose dark:prose-invert max-w-none text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {pkg.story}
              </div>
            </div>
          )}

          {/* Safety Notes */}
          {pkg.safetyNotes && (
            <div className="space-y-3 pt-4 border-t border-border" data-testid="safety-notes-section">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Safety & Practical Notes
              </h2>
              <div className="p-4 rounded-xl bg-card border border-border text-sm text-muted-foreground leading-relaxed">
                {pkg.safetyNotes}
              </div>
            </div>
          )}

          {/* Location and Directions */}
          {(pkg.locationText || pkg.directions) && (
            <div className="space-y-3 pt-4 border-t border-border" data-testid="location-directions-section">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" aria-hidden="true" />
                Location & Directions
              </h2>
              <div className="p-5 rounded-2xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
                {pkg.locationText && (
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>{pkg.locationText}</span>
                  </p>
                )}
                {pkg.directions ? (
                  <p className="leading-relaxed">{pkg.directions}</p>
                ) : (
                  <p className="leading-relaxed italic">
                    Meeting point coordinates and local certified guide dispatch details are provided upon booking confirmation. Local guides meet visitors at the central community entrance.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Community Approval & Ethical Tourism Charter */}
          <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-3" data-testid="community-approval-section">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" aria-hidden="true" />
              Community Approval & Fair Compensation
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              This experience is fully sanctioned by community elders and registered under OmoBridge's ethical tourism covenant. Every ticket contributes directly to local village development funds and certified guide livelihoods.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
              {pkg.communityApprovalRef && (
                <span>
                  Approval Ref:{' '}
                  <strong className="text-foreground font-semibold">
                    {pkg.communityApprovalRef}
                  </strong>
                </span>
              )}
              {pkg.communityApprovalDate && (
                <span>
                  Approval Date:{' '}
                  <strong className="text-foreground font-semibold">
                    {formatDateTime(pkg.communityApprovalDate, 'dateOnly')}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Booking Action Card */}
        <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
          <Card className="p-6 sm:p-7 space-y-6 shadow-md border-border/80">
            {/* Price Box */}
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Standard Experience Fee
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                  {formatETB(pkg.priceAmount || 0)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  /{formattedPriceUnit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Authoritative breakdown calculated by server upon booking.
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Certified South Omo Tour Guide included</span>
              </div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Direct community compensation contribution</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Cultural protocol briefing included</span>
              </div>
            </div>

            {/* Book Now Button */}
            <Link
              to={`/booking?packageId=${pkg.id}`}
              className="block w-full"
              data-testid="book-experience-button"
            >
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center text-base py-3.5 shadow-sm"
              >
                Book Experience
              </Button>
            </Link>

            <p className="text-[11px] text-center text-muted-foreground leading-normal">
              Bookings require acknowledging cultural rules and selecting an available time session.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
