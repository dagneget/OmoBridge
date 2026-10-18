import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { PriceBreakdown } from '../../components/pricing';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { normalizeApiError } from '../../services/apiError';
import { queryKeys } from '../../services/queryKeys';
import { formatETB } from '../../utils/formatters';
import { productService } from './productService';
import en from './locales/detail.en.json';
import am from './locales/detail.am.json';

i18n.addResourceBundle('en', 'productDetail', en, true, true);
i18n.addResourceBundle('am', 'productDetail', am, true, true);

const control = 'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-400 px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60';
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
  const unavailable = !validId || status === 404 || (product && (
    product.published !== true || product.id?.toLowerCase() !== id.toLowerCase()
  ));
  const stock = product?.availableStock;
  const finiteStock = typeof stock === 'number' && Number.isFinite(stock);
  let content;
  if (unavailable) {
    content = <p role="status">{text('notFound')}</p>;
  } else if (!isOnline && !product) {
    content = <p role="status">{text('offlineEmpty')}</p>;
  } else if (query.isPending) {
    content = <p role="status" aria-busy="true">{text('loading')}</p>;
  } else if (query.isError && (isOnline || !product)) {
    content = (
      <div role="alert" className="space-y-3">
        <p>{text(status === 401 || status === 403 ? 'accessError' : 'error')}</p>
        <button className={control} type="button" onClick={() => void query.refetch()} disabled={!isOnline}>
          {text('retry')}
        </button>
      </div>
    );
  } else if (product) {
    content = (
      <article className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">{product.name || text('unnamed')}</h1>
          {product.enterpriseName && <p>{product.enterpriseName}</p>}
          {product.category && <p>{product.category}</p>}
        </header>
        <dl className="grid gap-4 rounded-xl border border-slate-300 p-4 sm:grid-cols-2 dark:border-slate-700">
          <div>
            <dt className="font-semibold">{text('unitPrice')}</dt>
            <dd className="tabular-nums">{typeof product.unitPrice === 'number' && Number.isFinite(product.unitPrice) && product.currency?.trim()
              ? formatETB(product.unitPrice, { currencyCode: product.currency }) : text('unknownPrice')}</dd>
          </div>
          <div>
            <dt className="font-semibold">{text('availability')}</dt>
            <dd>{!finiteStock ? text('unknownStock') : stock > 0 ? text('inStock') : text('outOfStock')}</dd>
          </div>
          {finiteStock && <div>
            <dt className="font-semibold">{text('availableQuantity')}</dt>
            <dd>{stock.toLocaleString(language.resolvedLanguage === 'am' ? 'am-ET' : 'en-ET', { maximumFractionDigits: 3 })}</dd>
          </div>}
          {product.unit && <div><dt className="font-semibold">{text('unit')}</dt><dd>{product.unit}</dd></div>}
        </dl>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">{text('description')}</h2>
          <p className="whitespace-pre-line">{product.description || text('noDescription')}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">{text('story')}</h2>
          <p className="whitespace-pre-line">{product.story || text('noStory')}</p>
        </section>
        <PriceBreakdown kind="product" data={product.priceBreakdown ?? null} currency={product.currency ?? ''} isOffline={!isOnline} />
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{text('origin')}</h2>
          {product.traceToken?.trim()
            ? <Link className={control} to={`/trace/${encodeURIComponent(product.traceToken)}`}>{text('trace')}</Link>
            : <p>{text('noTrace')}</p>}
        </section>
      </article>
    );
  }
  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6 text-slate-900 dark:text-slate-100">
      <Link className={control} to="/products">{text('back')}</Link>
      {!isOnline && <p role="status" className="rounded-lg border border-amber-600 p-3">{text('offline')}</p>}
      {content}
    </div>
  );
}
