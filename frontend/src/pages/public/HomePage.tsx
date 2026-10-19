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
  CheckCircle2,
  Award,
  TrendingUp,
  HeartHandshake,
} from 'lucide-react';
import { Button, Card, Skeleton, EmptyState } from '../../components/common';
import { tourismService } from '../../features/tourism';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import { LANGUAGE_STORAGE_KEY } from '../account/AccountPage';
import { useAuthStore } from '../../features/auth/authStore';
import southOmoHeroImg from '../../assets/south_omo_hero.jpg';
import culturalTourismImg from '../../assets/cultural_tourism.jpg';
import honeyCoffeeImg from '../../assets/honey_coffee_product.jpg';

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
      {/* 1. Hero Section with Split Layout & Photographic Showcase */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/10 via-amber-500/5 to-slate-50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-950 border border-emerald-900/15 dark:border-slate-800 p-6 sm:p-10 lg:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Narrative & Action */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Platform Badge & Language Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>Digital Platform for South Omo, Ethiopia</span>
              </div>

              <div className="inline-flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
                <Globe2 className="w-3.5 h-3.5 ml-2 text-slate-500" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => handleLanguageToggle('en')}
                  className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                    currentLang === 'en'
                      ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageToggle('am')}
                  className={`px-2.5 py-0.5 rounded-full font-medium font-ethiopic transition-colors ${
                    currentLang === 'am'
                      ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  አማርኛ
                </button>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              Connecting Rural Producers & Ethical Travelers in{' '}
              <span className="text-emerald-700 dark:text-emerald-400 underline decoration-amber-500/50 decoration-wavy">
                South Omo
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Empowering smallholder farmers, local processing cooperatives, licensed couriers, and certified guides across the Lower Omo Valley through batch traceability, transparent pricing, and dual-channel access.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link to="/tourism" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-md">
                  <Compass className="w-4 h-4" aria-hidden="true" />
                  <span>Explore Tourism Experiences</span>
                </Button>
              </Link>

              <Link to="/products" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 border-slate-300 dark:border-slate-700 hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-400">
                  <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  <span>Shop Agricultural Goods</span>
                </Button>
              </Link>

              <Link to="/join" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-600" aria-hidden="true" />
                  <span>Join OmoBridge</span>
                </Button>
              </Link>
            </div>

            {/* Dual-Channel Highlight Badge */}
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <span>
                Feature phone users connect via USSD <strong className="text-slate-900 dark:text-slate-100 font-bold">*844#</strong> without internet
              </span>
            </div>
          </div>

          {/* Right Column: High-Impact Visual Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 group">
              <img
                src={southOmoHeroImg}
                alt="South Omo Valley landscape with authentic honey jars and mountain terraces"
                className="w-full h-80 sm:h-96 object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

              {/* Floating Verified Chips on Image */}
              <div className="absolute bottom-4 left-4 right-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600/90 text-white backdrop-blur-md shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    100% Single-Origin Verified
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-600/90 text-white backdrop-blur-md shadow-sm">
                    <Award className="w-3 h-3" />
                    Elders Council Approved
                  </span>
                </div>
                <p className="text-xs text-white/90 font-medium line-clamp-1 drop-shadow-sm">
                  Turmi & Keske Valley Organic Harvest · Fair-Trade Cooperative Network
                </p>
              </div>
            </div>

            {/* Accent Floating Metric Pill */}
            <div className="absolute -top-3 -right-3 sm:-right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-lg flex items-center gap-2 text-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                76%
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">Farmer Price Share</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+14% above middlemen</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Cooperative Trust & Impact Stats Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="trust-stats-strip">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">48+</div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Producer Cooperatives</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Dimeka, Turmi & Jinka Woredas</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">345,000 ETB</div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Direct Farmer Payouts</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Disbursed via Telebirr gateway</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">100%</div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Batch-Level Traceability</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Conservation of mass audited</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">3% Reserved</div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Community Fund</div>
            <p className="text-[11px] text-slate-500 mt-0.5">For local elders & watershed care</p>
          </div>
        </div>
      </section>

      {/* 3. Featured Tourism Experiences Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>Ethical Community Tourism</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Featured Cultural Experiences
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Respectful, community-led cultural immersion backed by local elders council resolutions.
            </p>
          </div>
          <Link to="/tourism">
            <Button variant="ghost" className="gap-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
              <span>View All Experiences</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="packages-loading">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-5 space-y-4 rounded-2xl">
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-md" />
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
          <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 text-center space-y-3">
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
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

        {/* Packages Cards Grid with Visual Image Headers */}
        {!isLoading && !isError && featuredPackages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="packages-list">
            {featuredPackages.map((pkg) => (
              <Card
                key={pkg.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl hover:shadow-lg hover:border-emerald-500/40 transition-all group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                data-testid={`package-card-${pkg.id}`}
              >
                <div>
                  {/* Card Visual Header */}
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={culturalTourismImg}
                      alt={pkg.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-md">
                        {pkg.category?.replace(/_/g, ' ') || 'Cultural Tour'}
                      </span>
                    </div>
                    {pkg.locationText && (
                      <div className="absolute bottom-3 left-3 right-3 text-white text-xs flex items-center gap-1 drop-shadow-md">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                        <span className="truncate font-medium">{pkg.locationText}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {pkg.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {pkg.overview || pkg.story || 'Authentic community eco-tourism experience.'}
                    </p>

                    {pkg.durationHours && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>{pkg.durationHours} hours duration · Certified Local Guide</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Price from</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatETB(pkg.priceAmount || 0)}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1">
                      /{pkg.priceUnit?.toLowerCase().replace('per_', '') || 'person'}
                    </span>
                  </div>

                  <Link to={`/experiences/${pkg.id}`}>
                    <Button variant="primary" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium">
                      Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 4. Agricultural Goods & Origin Showcase Banner */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-6 sm:p-10">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800">
              <img
                src={honeyCoffeeImg}
                alt="Organic Raw White Honey and Forest Coffee"
                className="w-full h-64 sm:h-72 object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Certified Single-Origin Fair Trade</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Pure White Honey, Forest Coffee & Beeswax
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every jar on OmoBridge is harvested by agro-pastoralist beekeepers in the pristine forests of Turmi and Dimeka. With transparent pricing, you see the exact breakdown of producer earnings, cooperative margins, and local conservation dividends.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Conservation of Mass Audited</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Printable QR Trace Certificate</span>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/products">
                <Button size="md" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold">
                  Explore Fair-Trade Catalog
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Join OmoBridge Platform Roles */}
      <section className="space-y-6 pt-2">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Participation & Roles
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Get Started on OmoBridge
          </h2>
          <p className="text-sm text-slate-500">
            Join thousands of smallholder producers, cooperative enterprises, dispatch couriers, and travelers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/register/producer" className="block group">
            <Card className="p-6 h-full space-y-3 rounded-2xl group-hover:border-emerald-500/50 group-hover:shadow-md transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Sprout className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                Producers & Farmers
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Register crops, record harvest deliveries, check balances, and receive Telebirr payments.
              </p>
            </Card>
          </Link>

          <Link to="/register/enterprise" className="block group">
            <Card className="p-6 h-full space-y-3 rounded-2xl group-hover:border-blue-500/50 group-hover:shadow-md transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <Layers className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                Community Hubs
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Manage lot intake, track production batches, catalog SKUs, and manage tour offerings.
              </p>
            </Card>
          </Link>

          <Link to="/register/delivery" className="block group">
            <Card className="p-6 h-full space-y-3 rounded-2xl group-hover:border-amber-500/50 group-hover:shadow-md transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Truck className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                Delivery Couriers
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accept delivery jobs, log route GPS checkpoints offline, and receive mobile payouts.
              </p>
            </Card>
          </Link>

          <Link to="/register/guide" className="block group">
            <Card className="p-6 h-full space-y-3 rounded-2xl group-hover:border-purple-500/50 group-hover:shadow-md transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                <Compass className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                Certified Tour Guides
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Manage tourist calendar sessions, set daily fees, and host authorized cultural tours.
              </p>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
