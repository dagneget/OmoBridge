import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '../../i18n/languages';
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
  Share2,
  Bookmark,
  Check,
  Star,
  CheckCircle2,
  Minus,
  Plus,
} from 'lucide-react';
import { Button, Card, Skeleton, MapComponent } from '../../components/common';
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
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [guests, setGuests] = useState(1);
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: pkg,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.packages.detail(id || '', language),
    queryFn: () => {
      if (!id) throw new Error('Package ID is required');
      return tourismService.getPackageById(id, language);
    },
    enabled: Boolean(id),
  });

  const handleShare = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleSave = () => {
    setIsSaved((prev) => !prev);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in" data-testid="experience-loading">
        <Skeleton className="h-6 w-36 rounded-md" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-6 w-1/2 rounded-md" />
        </div>
        <div className="h-[400px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-80 w-full rounded-3xl" />
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
  const unitPrice = pkg.priceAmount || 0;
  const totalPrice = unitPrice * guests;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-in fade-in" data-testid="experience-details-page">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Link
            to="/tourism"
            className="inline-flex items-center font-medium hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            Back to all experiences
          </Link>
          <span>/</span>
          <span className="uppercase tracking-wider font-semibold text-foreground/80 truncate max-w-[200px] sm:max-w-xs">
            {pkg.category?.replace(/_/g, ' ') || 'Experiences'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
            aria-label="Share experience"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied Link</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Share</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-colors shadow-2xs ${
              isSaved
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                : 'border-border bg-card hover:bg-muted text-foreground'
            }`}
            aria-label={isSaved ? 'Saved to bookmarks' : 'Save experience'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Header Info Block */}
      <div className="space-y-4">
        {/* Badges strip */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            <CategoryBadgeIcon category={pkg.category} className="w-3.5 h-3.5" />
            <span>{pkg.category?.replace(/_/g, ' ') || 'Experience'}</span>
          </span>

          {pkg.enterpriseName && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
              <HeartHandshake className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Offered by {pkg.enterpriseName}</span>
            </span>
          )}

          {pkg.communityApprovalRef && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Community Certified</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Elder Sanctioned</span>
          </span>
        </div>

        {/* H1 Main Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
          {pkg.name}
        </h1>

        {/* Sub-header Metadata Row */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1 text-foreground font-semibold">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>4.96</span>
            <span className="text-muted-foreground font-normal">(48 reviews)</span>
          </div>
          <span>•</span>
          {pkg.locationText && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span>{pkg.locationText}</span>
            </div>
          )}
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>Half-Day Cultural Immersion</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>Small Group Intimacy</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="hidden sm:flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>Bilingual Indigenous Guide</span>
          </div>
        </div>
      </div>

      {/* Photo Mosaic Hero (Stitch 3-Photo Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[340px] sm:h-[440px] lg:h-[480px] rounded-3xl overflow-hidden shadow-lg border border-border bg-muted/20">
        {/* Left Dominant Feature Tile */}
        <div className="relative md:col-span-8 h-full overflow-hidden group">
          <img
            src="/cultural_tourism.jpg"
            alt={pkg.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
              Featured Cultural Gathering
            </span>
          </div>
          <div className="absolute bottom-4 left-4 text-white">
            <p className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">Living Heritage</p>
            <p className="text-base sm:text-lg font-bold text-white drop-shadow-xs">South Omo Sacred Ancestral Grounds</p>
          </div>
        </div>

        {/* Right Stacked Tiles (2 Rows) */}
        <div className="hidden md:grid md:col-span-4 grid-rows-2 gap-4 h-full">
          <div className="relative h-full overflow-hidden group rounded-2xl">
            <img
              src="/south_omo_hero.jpg"
              alt="Community Sacred Grounds"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            <span className="absolute bottom-3 left-3 text-xs font-semibold text-white bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-md">
              Sacred Grounds & Elders
            </span>
          </div>
          <div className="relative h-full overflow-hidden group rounded-2xl">
            <img
              src="/artisan_crafts.jpg"
              alt="Ceremonial Regalia & Artifacts"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-md backdrop-blur-md border border-border">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span>5 Selected Photos</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Editorial Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-2">
        {/* Left Column (8 cols): Host Card, Transparent Impact, Stepped Journey, Protocol, Location & Reviews */}
        <div className="lg:col-span-8 space-y-10">
          {/* Key Facts Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
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

          {/* 1. Host / Producer Story Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0 overflow-hidden shadow-xs">
                  <img src="/south_omo_hero.jpg" alt={pkg.enterpriseName || 'Host'} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {pkg.enterpriseName || 'South Omo Cultural Custodians'}
                    </h3>
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-label="Verified Host" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Certified South Omo Host • {pkg.locationText || 'South Omo Valley'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Elder Sanctioned
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-sm italic text-foreground/90 leading-relaxed">
              “Our rituals are the living heartbeat of the Omo Valley, passed down through thirty-two generations. When you walk among us as an honored guest, you help sustain our sacred traditions, our youth initiatives, and our community autonomy.”
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/80 text-xs font-medium">
                <HeartHandshake className="w-4 h-4 text-primary shrink-0" />
                <span>100% Community-Led</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/80 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Elder Council Sanctioned</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/80 text-xs font-medium">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Direct Wage Guarantee</span>
              </div>
            </div>
          </div>

          {/* 2. Transparent Community Impact Breakdown Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-950 dark:bg-slate-900 text-white border border-emerald-500/20 shadow-lg space-y-5 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ethical Tourism Covenant
                </div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Transparent Community Impact
                </h3>
              </div>
              <span className="text-xs text-slate-400">Zero Middlemen Markup</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every gathering booking directly empowers local households. Our transparent revenue share ensures that tourism acts as an instrument of cultural preservation and economic sovereignty.
            </p>

            {/* Segmented Progress Bar */}
            <div className="space-y-2">
              <div className="h-3.5 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                <div className="bg-emerald-500 h-full w-[70%]" title="70% Direct Guide & Host Wages" />
                <div className="bg-amber-500 h-full w-[20%]" title="20% Village Health & Education Fund" />
                <div className="bg-sky-500 h-full w-[10%]" title="10% Platform & Logistics Operations" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>70% Direct Wage</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Paid directly to participating guides, elder hosts, and artisan families.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>20% Village Fund</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Community water well maintenance, healthcare clinic, and school books.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>10% Logistics & Taxes</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">USSD infrastructure, satellite sync, and emergency medical insurance.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Ritual Stages & Experiential Journey */}
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-1">
                <Compass className="w-3.5 h-3.5" />
                Curated Itinerary
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Ritual Stages & Experiential Journey
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Chronological progression guided respectfully with community elder oversight
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">
                  #1
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-foreground">
                      Morning Gathering & Elder Blessing
                    </h4>
                    <span className="text-xs font-mono font-medium text-muted-foreground">08:00 - 09:30</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Assemble at the sacred shade tree in Dimeka. Traditional greeting ceremony with village elders, sharing of heritage coffee and roasted grain blessings.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">
                  #2
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-foreground">
                      Ceremonial Adornment & Song
                    </h4>
                    <span className="text-xs font-mono font-medium text-muted-foreground">09:30 - 11:30</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Women elders prepare natural red ochre body adornments and lead rhythmic ceremonial polyphonic chanting, recounting ancestral lineage and courage.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">
                  #3
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-foreground">
                      The Main Rite & Transition
                    </h4>
                    <span className="text-xs font-mono font-medium text-muted-foreground">11:30 - 14:00</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    The central rite of passage where initiates demonstrate fortitude and balance, receiving blessings and official recognition from clan elders.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">
                  #4
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-foreground">
                      Evening Feast & Evangadi Celebration
                    </h4>
                    <span className="text-xs font-mono font-medium text-muted-foreground">14:00 - 17:00</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Communal feast sharing local organic fare and nocturnal Evangadi celebration dances illuminated by communal hearths under the open starlit sky.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. PROMINENT MANDATORY CULTURAL RULES SECTION */}
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

          {/* 5. Overview */}
          <div className="space-y-3 p-6 rounded-2xl bg-card border border-border shadow-xs">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Experience Overview
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {pkg.overview || 'Authentic community-led cultural immersion experience in South Omo.'}
            </p>
          </div>

          {/* 6. Cultural Story & Heritage */}
          {pkg.story && (
            <div className="space-y-3 p-6 rounded-2xl bg-card border border-border shadow-xs">
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

          {/* 7. What's Included (2x2 Grid) */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Gathering Inclusions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Certified Indigenous Guide</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Fluent local guide bridging language, custom, and elder protocol.</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Elder Council Sanction</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Formal guest authorization recognized across sacred village territories.</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Ceremonial Refreshments</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Authentic highland coffee ceremony and organic grain offerings.</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Village Development Levy</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Automated 20% allocation deposited into community escrow fund.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 8. The Gathering Sanctum: Location and Directions */}
          {(pkg.locationText || pkg.directions) && (
            <div className="space-y-4 p-6 rounded-2xl bg-card border border-border shadow-xs" data-testid="location-directions-section">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-bold text-foreground">
                  The Gathering Sanctum
                </h2>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                {pkg.locationText && (
                  <p className="font-semibold text-foreground flex items-center gap-2 text-base">
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

                {pkg.latitude != null && pkg.longitude != null && (
                  <div className="pt-2">
                    <MapComponent
                      latitude={pkg.latitude}
                      longitude={pkg.longitude}
                      title={pkg.name}
                      address={pkg.locationText}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. Safety Notes */}
          {pkg.safetyNotes && (
            <div className="space-y-3 p-6 rounded-2xl bg-card border border-border shadow-xs" data-testid="safety-notes-section">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Safety & Practical Notes
              </h2>
              <div className="p-4 rounded-xl bg-muted/40 text-sm text-muted-foreground leading-relaxed">
                {pkg.safetyNotes}
              </div>
            </div>
          )}

          {/* 10. Community Approval & Ethical Tourism Charter */}
          <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-3" data-testid="community-approval-section">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" aria-hidden="true" />
              Community Approval & Fair Compensation
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              This experience is fully sanctioned by community elders and registered under Kinka's ethical tourism covenant. Every ticket contributes directly to local village development funds and certified guide livelihoods.
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

          {/* 11. Community Reverence & Reviews */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Community Reverence & Reviews</h3>
                <p className="text-xs text-muted-foreground">Verified traveler testimonials under elder supervision</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>4.96 / 5.0</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Elena M. (Anthropologist)</span>
                  <span className="text-muted-foreground">2 weeks ago</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  “A profoundly dignified and moving ceremony. The protocol briefing ensured we were mindful guests. Truly the gold standard for ethical travel in Ethiopia.”
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Marcus K.</span>
                  <span className="text-muted-foreground">1 month ago</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  “The coffee ceremony under the acacia tree and the warmth of the elders was unforgettable. Transparent pricing gave us complete confidence.”
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Booking & Pricing Action Card */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <Card className="p-6 sm:p-7 space-y-6 shadow-xl border-border/90 rounded-3xl bg-card">
            {/* Price Box */}
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
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

            {/* Session Time Picker */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Gathering Session
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSession('morning')}
                  className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-colors ${
                    selectedSession === 'morning'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <p className="font-semibold text-foreground">Morning Gathering</p>
                  <p className="text-[11px] text-muted-foreground">08:00 - 12:00</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSession('afternoon')}
                  className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-colors ${
                    selectedSession === 'afternoon'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <p className="font-semibold text-foreground">Afternoon Ceremony</p>
                  <p className="text-[11px] text-muted-foreground">14:00 - 18:00</p>
                </button>
              </div>
            </div>

            {/* Guest Counter */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Number of Guests
                </label>
                <span className="text-xs text-muted-foreground">Max {pkg.maxGroupSize || 15}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl border border-border bg-muted/30">
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  disabled={guests <= 1}
                  className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground disabled:opacity-40 hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Decrease guests"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold text-foreground">
                  {guests} {guests === 1 ? 'Guest' : 'Guests'}
                </span>
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.min(pkg.maxGroupSize || 15, g + 1))}
                  disabled={guests >= (pkg.maxGroupSize || 15)}
                  className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground disabled:opacity-40 hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Increase guests"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Price Preview Calculation for Multi-Guest */}
            {guests > 1 && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Group Rate ({guests} guests)</span>
                  <span>{formatETB(totalPrice)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/50">
                  <span>Estimated Total</span>
                  <span className="text-primary">{formatETB(totalPrice)}</span>
                </div>
              </div>
            )}

            {/* Trust and Guarantee list */}
            <div className="space-y-2.5 text-xs text-muted-foreground pt-1">
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
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Free cancellation up to 48 hours prior</span>
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
                className="w-full justify-center text-base py-4 font-bold shadow-md rounded-2xl"
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
