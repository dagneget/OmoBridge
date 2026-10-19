import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import { productService } from './productService';
import en from './locales/en.json';
import am from './locales/am.json';

i18n.addResourceBundle('en', 'products', en, true, true);
i18n.addResourceBundle('am', 'products', am, true, true);

const PAGE_SIZE = 12;
const control =
  'min-h-[44px] rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-slate-900 dark:text-slate-100';

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
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-slate-900 dark:text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{text('title')}</h1>
        <p>{text('intro')}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          {text('search')}
          <input
            type="search"
            className={control}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="grid gap-1">
          {text('category')}
          <select
            className={control}
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
        </label>
      </div>
      {!isOnline && (
        <p role="status" className="rounded-lg border border-amber-600 p-3">
          {text('offline')}
        </p>
      )}
      {!isOnline && !query.data ? (
        <p role="status">{text('offlineEmpty')}</p>
      ) : query.isPending ? (
        <p role="status" aria-busy="true">
          {text('loading')}
        </p>
      ) : query.isError ? (
        <div role="alert" className="space-y-3">
          <p>{text('error')}</p>
          <button
            type="button"
            className={control}
            onClick={() => void query.refetch()}
            disabled={!isOnline}
          >
            {text('retry')}
          </button>
        </div>
      ) : (
        <>
          <p role="status">{text('results', { count: filtered.length })}</p>
          {visible.length === 0 ? (
            <p>{text('empty')}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((product) => (
                <li
                  key={product.id}
                  className="min-w-0 rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <article className="flex h-full min-w-0 flex-col gap-3">
                    <h2 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">
                      {product.name || text('unnamed')}
                    </h2>
                    {product.enterpriseName && (
                      <p className="break-words">{product.enterpriseName}</p>
                    )}
                    {product.description && <p className="break-words">{product.description}</p>}
                    <p className="font-semibold tabular-nums">
                      {typeof product.unitPrice === 'number' &&
                      Number.isFinite(product.unitPrice) &&
                      product.currency
                        ? formatETB(product.unitPrice, { currencyCode: product.currency })
                        : text('unknownPrice')}
                    </p>
                    <p>
                      {typeof product.availableStock !== 'number' ||
                      !Number.isFinite(product.availableStock)
                        ? text('unknownStock')
                        : product.availableStock > 0
                          ? text('inStock')
                          : text('outOfStock')}
                    </p>
                    <Link
                      className={`${control} mt-auto inline-flex items-center justify-center`}
                      to={`/products/${product.id}`}
                      aria-label={text('detailsFor', { name: product.name || text('unnamed') })}
                    >
                      {text('details')}
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
            <nav
              aria-label={text('pagination')}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <button
                type="button"
                className={control}
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                {text('previous')}
              </button>
              <span aria-live="polite">
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
