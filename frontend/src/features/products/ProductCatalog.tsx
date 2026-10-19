import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import { productService } from './productService';
import { getProductImage } from './productImages';
import {
  Search,
  Filter,
  Sparkles,
  Building2,
  QrCode,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import en from './locales/en.json';
import am from './locales/am.json';

i18n.addResourceBundle('en', 'products', en, true, true);
i18n.addResourceBundle('am', 'products', am, true, true);

const PAGE_SIZE = 12;

const control =
  'min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors';

export function ProductCatalog() {
  const { t } = useTranslation('products');
  const text = (key: keyof typeof en, values: Record<string, string | number> = {}) =>
    t(key, { ...values, fallbackLng: ['am', 'en'] });
  const { isOnline } = useNetworkStatus();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: ({ signal }) => productService.getProducts(signal),
  });

  // The public endpoint returns an array, not a server page. Slice only for display.
  const published = (query.data ?? []).filter(
    (product) => product.published === true && product.id
  );

  const categories = [
    ...new Set(
      published
        .map((product) => product.category)
        .filter((value): value is string => Boolean(value))
    ),
  ].sort();

  const term = search.trim().toLocaleLowerCase();
  const filtered = published.filter(
    (product) =>
      (!category || product.category === category) &&
      (!term ||
        `${product.name ?? ''} ${product.description ?? ''} ${product.enterpriseName ?? ''}`
          .toLocaleLowerCase()
          .includes(term))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8 py-8 text-slate-900 dark:text-slate-100">
      {/* Hero Header */}
      <header className="relative rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-6 sm:p-10 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/60 border border-emerald-500/30 text-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Fair Trade · Direct from Producers · 100% Traceable</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {text('title')}
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            {text('intro')}
          </p>
        </div>
      </header>

      {/* Search and Filters Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {text('search')}
            <div className="relative">
              <input
                type="search"
                className={`${control} w-full pl-9 font-normal text-sm normal-case`}
                placeholder="e.g. White Honey, Forest Coffee, Handwoven Shawl..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {text('category')}
            <div className="relative">
              <select
                className={`${control} w-full pl-9 font-normal text-sm normal-case appearance-none`}
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">{text('all')}</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </label>
        </div>

        {/* Quick Category Filter Pills */}
        {categories.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1">Quick Filter:</span>
            <button
              type="button"
              onClick={() => {
                setCategory('');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                category === ''
                  ? 'bg-emerald-700 text-white border-emerald-700 font-semibold shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {text('all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-emerald-700 text-white border-emerald-700 font-semibold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Network & Loading States */}
      {!isOnline && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-600/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>{text('offline')}</span>
        </div>
      )}

      {!isOnline && !query.data ? (
        <div
          role="status"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-600 dark:text-slate-400"
        >
          <p>{text('offlineEmpty')}</p>
        </div>
      ) : query.isPending ? (
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center p-12 space-y-3"
        >
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">{text('loading')}</p>
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-4 max-w-md mx-auto"
        >
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <p className="text-sm font-semibold text-destructive">{text('error')}</p>
          <button
            type="button"
            className={`${control} inline-flex items-center gap-2 text-sm font-medium`}
            onClick={() => void query.refetch()}
            disabled={!isOnline}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>{text('retry')}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <p role="status" className="font-medium">
              {text('results', { count: filtered.length })}
            </p>
            {category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                Category: {category}
              </span>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-2">
              <p className="text-slate-500 font-medium">{text('empty')}</p>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((product) => {
                const imageUrl = getProductImage(product);
                const hasStock =
                  typeof product.availableStock === 'number' &&
                  Number.isFinite(product.availableStock) &&
                  product.availableStock > 0;

                return (
                  <li
                    key={product.id}
                    className="group min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    <article className="flex h-full min-w-0 flex-col">
                      {/* Product Visual Header */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={imageUrl}
                          alt={product.name || text('unnamed')}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                        {/* Category Badge */}
                        {product.category && (
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-black/60 backdrop-blur-md text-white shadow-sm border border-white/10 uppercase tracking-wide">
                              {product.category}
                            </span>
                          </div>
                        )}

                        {/* Stock Badge Overlay */}
                        <div className="absolute top-3 right-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-md shadow-sm ${
                              hasStock
                                ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/30'
                                : 'bg-rose-950/80 text-rose-200 border border-rose-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                hasStock ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                              }`}
                              aria-hidden="true"
                            />
                            {typeof product.availableStock !== 'number' ||
                            !Number.isFinite(product.availableStock)
                              ? text('unknownStock')
                              : hasStock
                                ? text('inStock')
                                : text('outOfStock')}
                          </span>
                        </div>

                        {/* Origin QR Trace Indicator */}
                        {product.traceToken && (
                          <div className="absolute bottom-2.5 left-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-900/80 backdrop-blur-md text-emerald-200 text-[11px] font-medium border border-emerald-500/30">
                              <QrCode className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                              <span>Verified Batch</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content Body */}
                      <div className="flex flex-1 flex-col p-5 gap-3">
                        <div className="space-y-1">
                          <h2 className="break-words text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors [overflow-wrap:anywhere] line-clamp-2">
                            {product.name || text('unnamed')}
                          </h2>
                          {product.enterpriseName && (
                            <p className="break-words text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{product.enterpriseName}</span>
                            </p>
                          )}
                        </div>

                        {product.description && (
                          <p className="break-words text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}

                        {/* Price & Availability Section */}
                        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between gap-2">
                          <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {typeof product.unitPrice === 'number' &&
                            Number.isFinite(product.unitPrice) &&
                            product.currency
                              ? formatETB(product.unitPrice, { currencyCode: product.currency })
                              : text('unknownPrice')}
                          </p>
                          {product.unit && (
                            <span className="text-xs text-slate-400 font-medium">
                              / {product.unit}
                            </span>
                          )}
                        </div>

                        {/* Action CTA Link */}
                        <Link
                          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                          to={`/products/${product.id}`}
                          aria-label={text('detailsFor', { name: product.name || text('unnamed') })}
                        >
                          <span>{text('details')}</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label={text('pagination')}
              className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-800"
            >
              <button
                type="button"
                className={control}
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                {text('previous')}
              </button>
              <span aria-live="polite" className="text-sm font-medium px-2">
                {text('page', { current: currentPage, total: totalPages })}
              </span>
              <button
                type="button"
                className={control}
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                {text('next')}
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
export default ProductCatalog;
