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

  const query = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: ({ signal }) => productService.getProduct(id, signal),
    enabled: validId,
    retry: false,
  });

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

    content = (
      <article className="min-w-0 space-y-8 [overflow-wrap:anywhere]">
        {/* Main Product Overview: Image + Purchase Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Product Showcase Image */}
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-md">
            <img
              src={imageUrl}
              alt={product.name || text('unnamed')}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

            {product.category && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
                  {product.category}
                </span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Verified South Omo Origin</span>
              </span>
            </div>
          </div>

          {/* Right: Title, Enterprise, Price, Stock & Add to Cart */}
          <div className="space-y-6">
            <header className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {product.name || text('unnamed')}
              </h1>
              {product.enterpriseName && (
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" aria-hidden="true" />
                  <span>{product.enterpriseName}</span>
                </p>
              )}
            </header>

            {/* Price & Stock Grid */}
            <dl className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-5 sm:grid-cols-2 text-sm shadow-sm">
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
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
              <AddToCart product={product} />
            </div>
          </div>
        </div>

        {/* Product Details, Story, and Provenance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="lg:col-span-2 space-y-6">
            <section className="space-y-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>{text('description')}</span>
              </h2>
              <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {product.description || text('noDescription')}
              </p>
            </section>

            <section className="space-y-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <span>{text('story')}</span>
              </h2>
              <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {product.story || text('noStory')}
              </p>
            </section>

            {/* Traceability Link Card */}
            <section className="space-y-3 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>{text('origin')}</span>
              </h2>
              {product.traceToken?.trim() ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
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
          </div>

          {/* Price Breakdown Sidebar */}
          <div className="space-y-4">
            <PriceBreakdown
              kind="product"
              data={product.priceBreakdown ?? null}
              currency={product.currency ?? ''}
              isOffline={!isOnline}
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8 py-8 text-slate-900 dark:text-slate-100">
      <Link className={`${control} inline-flex items-center gap-2`} to="/products">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>{text('back')}</span>
      </Link>
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
