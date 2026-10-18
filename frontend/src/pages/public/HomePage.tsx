import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Sprout,
  Truck,
  Layers,
  PhoneCall,
  MapPin,
  Clock,
  Sparkles,
  Globe2,
} from 'lucide-react';
import { Button, Card, Skeleton, EmptyState } from '../../components/common';
import { tourismService } from '../../features/tourism';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import { LANGUAGE_STORAGE_KEY } from '../account/AccountPage';
import { useAuthStore } from '../../features/auth/authStore';

export default function HomePage() {
  const { user, setUser } = useAuthStore();
  const [currentLang, setCurrentLang] = useState<string>(() => {
    return (
      (typeof window !== 'undefined' && localStorage.getItem(LANGUAGE_STORAGE_KEY)) ||
      user?.preferredLanguage ||
      'en'
    );
  });

  const handleLanguageToggle = (lang: string) => {
    setCurrentLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
    if (user) {
      setUser({ ...user, preferredLanguage: lang });
    }
  };

  const {
    data: packages = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.packages.list(),
    queryFn: () => tourismService.getPackages(),
  });

  const featuredPackages = packages.slice(0, 3);

  return (
    <div className="w-full space-y-16 pb-16 animate-in fade-in" data-testid="home-page">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-b from-primary/10 via-primary/5 to-background border border-border/60 px-6 py-12 sm:px-12 sm:py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Platform Badge & Language Selector */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Digital Platform for South Omo, Ethiopia</span>
            </div>

            <div className="inline-flex items-center gap-1 bg-muted/60 p-0.5 rounded-full border border-border text-xs">
              <Globe2 className="w-3.5 h-3.5 ml-2 text-muted-foreground" aria-hidden="true" />
              <button
                type="button"
                onClick={() => handleLanguageToggle('en')}
                className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                  currentLang === 'en'
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageToggle('am')}
                className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                  currentLang === 'am'
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                አማርኛ
              </button>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-tight">
            Connecting Rural Producers & Ethical Travelers in{' '}
            <span className="text-primary">South Omo</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Empowering smallholder farmers, local processing cooperatives, licensed couriers, and certified guides across the Lower Omo Valley through batch traceability, transparent pricing, and dual-channel access.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/tourism" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Explore Tourism Experiences</span>
              </Button>
            </Link>

            <Link to="/products" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>Shop Agricultural Goods</span>
              </Button>
            </Link>

            <Link to="/join" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Join OmoBridge</span>
              </Button>
            </Link>
          </div>

          {/* Dual-Channel Highlight Badge */}
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <PhoneCall className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Feature phone users connect via USSD <strong className="text-foreground">*844#</strong> without internet</span>
          </div>
        </div>
      </section>

      {/* 2. Featured Tourism Packages Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              Ethical Community Tourism
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Featured Cultural Experiences
            </h2>
          </div>
          <Link to="/tourism">
            <Button variant="ghost" className="gap-1.5 text-primary hover:text-primary">
              <span>View All Experiences</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="packages-loading">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-5 space-y-4">
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <div className="pt-4 flex justify-between items-center">
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3">
            <p className="text-sm text-destructive font-medium">
              Could not load featured packages from the server.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && featuredPackages.length === 0 && (
          <EmptyState
            title="No featured packages active"
            description="Cultural tour packages will be listed here once scheduled."
            action={
              <Link to="/tourism">
                <Button size="sm">View Tourism Overview</Button>
              </Link>
            }
          />
        )}

        {/* Packages Cards Grid */}
        {!isLoading && !isError && featuredPackages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="packages-list">
            {featuredPackages.map((pkg) => (
              <Card
                key={pkg.id}
                className="flex flex-col justify-between p-6 hover:shadow-md hover:border-primary/40 transition-all group"
                data-testid={`package-card-${pkg.id}`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {pkg.category?.replace(/_/g, ' ') || 'Experience'}
                    </span>
                    {pkg.locationText && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="truncate max-w-[120px]">{pkg.locationText}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {pkg.name}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {pkg.overview || pkg.story || 'Authentic community eco-tourism experience.'}
                  </p>

                  {pkg.durationHours && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{pkg.durationHours} hours duration</span>
                    </div>
                  )}
                </div>

                <div className="pt-5 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block">Price from</span>
                    <span className="text-base font-bold text-foreground">
                      {formatETB(pkg.priceAmount || 0)}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-1">
                      /{pkg.priceUnit?.toLowerCase().replace('per_', '') || 'person'}
                    </span>
                  </div>

                  <Link to={`/experiences/${pkg.id}`}>
                    <Button variant="primary" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 3. Join OmoBridge Platform Roles */}
      <section className="space-y-6 pt-4">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            Participation & Roles
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Get Started on OmoBridge
          </h2>
          <p className="text-sm text-muted-foreground">
            Join thousands of smallholder producers, cooperative enterprises, dispatch couriers, and travelers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/register/producer" className="block group">
            <Card className="p-5 h-full space-y-3 group-hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Sprout className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Producers & Farmers
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Register crops, record harvest deliveries, check balances, and receive Telebirr payments.
              </p>
            </Card>
          </Link>

          <Link to="/register/enterprise" className="block group">
            <Card className="p-5 h-full space-y-3 group-hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Layers className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Micro-Enterprises
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Manage lot intake, track production batches, catalog SKUs, and manage tour offerings.
              </p>
            </Card>
          </Link>

          <Link to="/register/delivery" className="block group">
            <Card className="p-5 h-full space-y-3 group-hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Truck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Delivery Couriers
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accept delivery jobs, log route GPS checkpoints offline, and receive mobile payouts.
              </p>
            </Card>
          </Link>

          <Link to="/register/guide" className="block group">
            <Card className="p-5 h-full space-y-3 group-hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Compass className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                Certified Tour Guides
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Manage tourist calendar sessions, set daily fees, and host authorized cultural tours.
              </p>
            </Card>
          </Link>
        </div>
      </section>

      {/* 4. Traceability & Fair Trade Callout Banner */}
      <section className="p-8 sm:p-10 rounded-3xl border border-border bg-muted/40 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Verified Single-Origin & Community Traceability
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every bottle of honey and sack of grains on OmoBridge is linked to verified smallholder lots with transparent farmer earnings and public QR verification.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/products">
            <Button variant="primary">Explore Catalog</Button>
          </Link>
          <Link to="/about">
            <Button variant="outline">Learn More</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
