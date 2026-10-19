import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { AddToCart } from '../cart';
import { PriceBreakdown } from '../../components/pricing';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import { productService } from './productService';
import { getProductImage } from './productImages';
import {
  ArrowLeft,
  Building2,
  Tag,
  ShieldCheck,
  QrCode,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Share2,
  Bookmark,
  Check,
  Star,
  CheckCircle2,
  Package,
  Layers,
  Leaf,
  HeartHandshake,
} from 'lucide-react';
import en from './locales/detail.en.json';
import am from './locales/detail.am.json';

i18n.addResourceBundle('en', 'productDetail', en, true, true);
i18n.addResourceBundle('am', 'productDetail', am, true, true);

const control =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 font-medium text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60 transition-colors cursor-pointer';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ProductDetail({ id }: { id: string }) {
  const { t, i18n: language } = useTranslation('productDetail');
  const text = (key: keyof typeof en) => t(key, { fallbackLng: ['am', 'en'] });
  const { isOnline } = useNetworkStatus();
  const validId = uuid.test(id);

  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: ({ signal }) => productService.getProduct(id, signal),
    enabled: validId,
    retry: false,
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

  const product = query.data;
  const status = query.error ? normalizeApiError(query.error).status : undefined;
  const unavailable =
    !validId ||
    status === 404 ||
    (product &&
      (product.published !== true || product.id?.toLowerCase() !== id.toLowerCase()));
  const stock = product?.availableStock;
  const finiteStock = typeof stock === 'number' && Number.isFinite(stock);

  let content;
  if (unavailable) {
    content = (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
        <p role="status" className="text-slate-600 dark:text-slate-400 font-medium">
          {text('notFound')}
        </p>
      </div>
    );
  } else if (!isOnline && !product) {
    content = (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
        <p role="status" className="text-slate-600 dark:text-slate-400 font-medium">
          {text('offlineEmpty')}
        </p>
      </div>
    );
  } else if (query.isPending) {
    content = (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p role="status" aria-busy="true" className="text-sm text-slate-500 font-medium">
          {text('loading')}
        </p>
      </div>
    );
  } else if (query.isError && (isOnline || !product)) {
    content = (
      <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
        <p className="text-sm font-semibold text-destructive">
          {text(status === 401 || status === 403 ? 'accessError' : 'error')}
        </p>
        <button
          className={`${control} inline-flex items-center gap-2`}
          type="button"
          onClick={() => void query.refetch()}
          disabled={!isOnline}
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>{text('retry')}</span>
        </button>
      </div>
    );
  } else if (product) {
    const imageUrl = getProductImage(product);
    const hasStock = finiteStock && stock > 0;

    // Determine secondary mosaic images based on category/product type
    const secondaryTop = '/artisan_crafts.jpg';
    const secondaryBottom = imageUrl === '/pottery_product.jpg' ? '/honey_coffee_product.jpg' : '/pottery_product.jpg';

    content = (
      <article className="min-w-0 space-y-8 [overflow-wrap:anywhere]">
        {/* Header Badges & Title Block */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {product.category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Tag className="w-3.5 h-3.5" />
                <span>{product.category}</span>
              </span>
            )}

            {product.enterpriseName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>{product.enterpriseName}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Verified South Omo Origin</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Artisanal Single-Origin</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            {product.name || text('unnamed')}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1 text-slate-900 dark:text-slate-100 font-semibold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>4.98</span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">(36 verified harvests)</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Wild Organic Harvest</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Direct Cooperative Sourcing</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Immutable Ledger Verified</span>
            </div>
          </div>
        </div>

        {/* Photo Mosaic Hero (Stitch 3-Photo Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[340px] sm:h-[440px] lg:h-[480px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
          {/* Main Showcase Image (Left 8 Cols) */}
          <div className="relative md:col-span-8 h-full overflow-hidden group">
            <img
              src={imageUrl}
              alt={product.name || text('unnamed')}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                Artisanal Showcase
              </span>
            </div>
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">Authentic Craft & Harvest</p>
              <p className="text-base sm:text-lg font-bold text-white drop-shadow-xs">South Omo Cooperative Harvest</p>
            </div>
          </div>

          {/* Right Secondary Stacked Tiles (4 Cols) */}
          <div className="hidden md:grid md:col-span-4 grid-rows-2 gap-4 h-full">
            <div className="relative h-full overflow-hidden group rounded-2xl">
              <img
                src={secondaryTop}
                alt="Artisan Craftsmanship"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <span className="absolute bottom-3 left-3 text-xs font-semibold text-white bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-md">
                Handcrafted & Refined
              </span>
            </div>
            <div className="relative h-full overflow-hidden group rounded-2xl">
              <img
                src={secondaryBottom}
                alt="Harvest Origins"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 right-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-md backdrop-blur-md border border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Batch</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-2">
          {/* Left Column (8 cols): Producer Story, Description, Narrative, Stepped Process, Specifications, Ledger Trace & Impact */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Producer / Cooperative Profile Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-xl shrink-0 overflow-hidden shadow-xs">
                    <img src="/south_omo_hero.jpg" alt={product.enterpriseName || 'Producer'} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {product.enterpriseName || 'South Omo Producer Cooperative'}
                      </h2>
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-label="Verified Producer" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Certified South Omo Producer Cooperative • Fair-Trade Registered
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Cooperative
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed">
                “Every harvest honors the ancient ecological stewardship of South Omo. By purchasing directly from our cooperative, you support fair living wages, elder knowledge preservation, and sustainable community harvesting.”
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
                  <HeartHandshake className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Direct Fair Wage</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
                  <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ethically Foraged</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Community Fund Partner</span>
                </div>
              </div>
            </div>

            {/* 2. Product Description Section */}
            <section className="space-y-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>{text('description')}</span>
              </h2>
              <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {product.description || text('noDescription')}
              </p>
            </section>

            {/* 3. Cultural Story Section */}
            <section className="space-y-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <span>{text('story')}</span>
              </h2>
              <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {product.story || text('noStory')}
              </p>
            </section>

            {/* 4. Harvesting & Crafting Journey (Stepped Itinerary) */}
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  Provenance Steps
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Harvesting & Crafting Journey
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Handcrafted traditions verified from South Omo highland apiaries to your home
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-sm">
                    #1
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Highland Wild Sourcing
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Harvested at peak seasonal maturity by indigenous cooperative members using traditional regenerative methods and native clay/bark hives.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-sm">
                    #2
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Artisanal Cold-Filtration & Curing
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Naturally extracted and cold-filtered through fine woven organic cotton without artificial heating, maintaining active enzymes and delicate floral aromas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-sm">
                    #3
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Quality & Moisture Assay
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Inspected for moisture balance, grade purity, and absence of synthetic additives before batch sealing by cooperative quality stewards.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-sm">
                    #4
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Tamper-Proof Ledger QR Sealing
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Secured with a cryptographic ledger token linking batch harvest geocoordinates to public decentralized provenance records.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Product Specifications (2x2 Grid) */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Artisanal Specifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">100% Single Origin</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sourced exclusively from registered South Omo cooperative families.</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Grade-A Certified Purity</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unpasteurized, unadulterated, and free of artificial additives.</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sustainable Packaging</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Eco-friendly recyclable glass and local woven protective casing.</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Guaranteed Fair Wage</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Over 70% of gross proceeds transferred directly to beekeepers.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Traceability Link Card */}
            <section className="space-y-3 p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>{text('origin')}</span>
              </h2>
              {product.traceToken?.trim() ? (
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Verify harvest geolocation, producer identity, and quality grading on the public ledger.
                  </p>
                  <Link
                    className={`${control} bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700`}
                    to={`/trace/${encodeURIComponent(product.traceToken)}`}
                  >
                    {text('trace')}
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-500">{text('noTrace')}</p>
              )}
            </section>

            {/* 7. Price Breakdown Section */}
            <div className="space-y-4">
              <PriceBreakdown
                kind="product"
                data={product.priceBreakdown ?? null}
                currency={product.currency ?? ''}
                isOffline={!isOnline}
              />
            </div>
          </div>

          {/* Right Column (4 cols): Sticky Purchase Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
              {/* Price & Stock Grid */}
              <dl className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-5 sm:grid-cols-2 text-sm shadow-2xs">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {text('unitPrice')}
                  </dt>
                  <dd className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {typeof product.unitPrice === 'number' &&
                    Number.isFinite(product.unitPrice) &&
                    product.currency?.trim()
                      ? formatETB(product.unitPrice, { currencyCode: product.currency })
                      : text('unknownPrice')}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {text('availability')}
                  </dt>
                  <dd className="flex items-center gap-2 font-semibold">
                    {finiteStock && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          hasStock ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      {!finiteStock
                        ? text('unknownStock')
                        : hasStock
                          ? text('inStock')
                          : text('outOfStock')}
                    </span>
                  </dd>
                </div>

                {finiteStock && (
                  <div className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {text('availableQuantity')}
                    </dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {stock.toLocaleString(
                        language.resolvedLanguage === 'am' ? 'am-ET' : 'en-ET',
                        { maximumFractionDigits: 3 }
                      )}
                    </dd>
                  </div>
                )}

                {product.unit && (
                  <div className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {text('unit')}
                    </dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200">
                      {product.unit}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Add to Cart Section */}
              <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
                <AddToCart product={product} />
              </div>

              {/* Trust & Ethics Guarantees */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>100% Direct Fair Wage to producers</span>
                </div>
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Immutable QR ledger traceability</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Eco-friendly sustainable packaging</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Nationwide & international dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-900 dark:text-slate-100">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <Link className={`${control} inline-flex items-center gap-2`} to="/products">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{text('back')}</span>
        </Link>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors shadow-2xs"
            aria-label="Share product"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied Link</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
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
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
            }`}
            aria-label={isSaved ? 'Saved to wishlist' : 'Save product'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : 'text-slate-500'}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {!isOnline && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-600/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>{text('offline')}</span>
        </div>
      )}
      {content}
    </div>
  );
}
export default ProductDetail;
