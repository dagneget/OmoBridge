import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { formatETB } from '../../utils/formatters';
import { cartStore, useCartStore } from './cartState';
import { selectCartGroups, selectCartReady } from './cartStore';
import type { CartLine, CartCheck } from './cartStore';
import { cartControl, useCartText } from './useCartText';
import { getProductImage } from '../products/productImages';
import {
  ShoppingBag,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  HeartHandshake,
  Lock,
} from 'lucide-react';

function CartRow({
  line,
  check,
  checking,
  isOnline,
  quantity,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  check?: CartCheck;
  checking: boolean;
  isOnline: boolean;
  quantity: string;
  onQuantityChange: (quantity: string | undefined) => void;
  onRemove: (id: string, name: string) => void;
}) {
  const text = useCartText();
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  const [saved, setSaved] = useState(false);
  const product = check?.product;
  const name = product?.name || text('unknownProduct', { id: line.productId });
  const price =
    typeof product?.unitPrice === 'number' &&
    Number.isFinite(product.unitPrice) &&
    product.currency?.trim()
      ? formatETB(product.unitPrice, { currencyCode: product.currency })
      : text('unknownPrice');
  const status = !check ? 'unchecked' : check.status;
  const imageUrl = getProductImage(product);

  return (
    <article
      aria-labelledby={`${id}-title`}
      className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-shadow hover:shadow-md [overflow-wrap:anywhere]"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Product Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shrink-0">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Details */}
        <div className="space-y-2 flex-1 min-w-0">
          <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {product ? (
              <Link
                className="inline-flex min-h-[44px] items-center underline hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-700"
                to={`/products/${line.productId}`}
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </h3>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <p className="font-bold text-emerald-700 dark:text-emerald-400">
              {text('unitPrice', { price })}
            </p>
            {product?.unit && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {text('unit', { unit: product.unit })}
              </p>
            )}
          </div>

          {/* Verification Status */}
          <div className="text-xs pt-1">
            {status === 'available' && (
              <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{text(status)}</span>
              </p>
            )}
            {status === 'insufficient-stock' && (
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-800">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{text(status)}</span>
                </p>
                {product?.availableStock !== undefined && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {text('availableQuantity', { quantity: product.availableStock })}
                  </p>
                )}
              </div>
            )}
            {status === 'unavailable' && (
              <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{text(status)}</span>
              </p>
            )}
            {status === 'error' && (
              <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{text(status)}</span>
              </p>
            )}
            {status === 'unchecked' && (
              <p className="text-slate-500 font-medium">{text(status)}</p>
            )}
          </div>

          {/* Price Change Acknowledgement */}
          {check?.priceChanged && (
            <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/30 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {text('priceChanged')}
              </p>
              <button
                type="button"
                className={`${cartControl} rounded-xl font-semibold text-xs`}
                disabled={checking || !isOnline}
                onClick={() =>
                  cartStore.getState().acknowledgePriceChange(line.productId)
                }
              >
                {text('acceptPrice')}
              </button>
            </div>
          )}

          {/* Quantity Edit & Removal Form */}
          <form
            noValidate
            className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80"
            onSubmit={(event) => {
              event.preventDefault();
              const success = cartStore
                .getState()
                .setQuantity(line.productId, Number(quantity));
              setInvalid(!success);
              setSaved(success);
              if (success) onQuantityChange(undefined);
            }}
          >
            <label className="grid gap-1.5 font-semibold text-xs text-slate-700 dark:text-slate-300" htmlFor={`${id}-quantity`}>
              <span>{text('quantityFor', { name })}</span>
              <input
                id={`${id}-quantity`}
                type="number"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                className={`${cartControl} w-28 rounded-xl font-normal text-sm`}
                value={quantity}
                aria-invalid={invalid || undefined}
                aria-describedby={`${id}-help${invalid ? ` ${id}-error` : ''}`}
                onChange={(event) => {
                  onQuantityChange(event.target.value);
                  setInvalid(false);
                  setSaved(false);
                }}
              />
            </label>
            <button
              type="submit"
              className={`${cartControl} rounded-xl font-semibold text-xs sm:text-sm cursor-pointer`}
            >
              {text('update')}
            </button>
            <button
              type="button"
              className={`${cartControl} rounded-xl font-semibold text-xs sm:text-sm cursor-pointer hover:text-rose-600 dark:hover:text-rose-400`}
              aria-label={text('removeFor', { name })}
              onClick={() => onRemove(line.productId, name)}
            >
              {text('remove')}
            </button>
          </form>

          <p id={`${id}-help`} className="text-[11px] text-slate-500">
            {text('quantityHelp')}
          </p>
          {invalid && (
            <p id={`${id}-error`} role="alert" className="text-xs text-destructive font-medium">
              {text('invalidQuantity')}
            </p>
          )}
          {saved && (
            <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{text('updated')}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function CartView() {
  const text = useCartText();
  const state = useCartStore((current) => current);
  const { isOnline } = useNetworkStatus();
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const { items, revalidate } = state;

  useEffect(() => {
    if (items.length > 0 && isOnline) void revalidate();
  }, [items, isOnline, revalidate]);

  const checking = state.phase === 'checking';
  const groups = selectCartGroups(state);
  const hasDraftChanges = items.some(
    (line) =>
      drafts[line.productId] !== undefined &&
      Number(drafts[line.productId]) !== line.quantity,
  );
  const ready = isOnline && !hasDraftChanges && selectCartReady(state);

  return (
    <section
      aria-labelledby={titleId}
      className="mx-auto min-w-0 max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-900 dark:text-slate-100"
    >
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <Link
          className={`${cartControl} rounded-xl inline-flex items-center gap-2`}
          to="/products"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{text('browse')}</span>
        </Link>

        {items.length > 0 && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className={`${cartControl} rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer`}
              disabled={!isOnline || checking}
              onClick={() => void revalidate()}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 ${checking ? 'animate-spin text-emerald-600' : ''}`}
                aria-hidden="true"
              />
              <span>{text('refresh')}</span>
            </button>

            <button
              type="button"
              className={`${cartControl} rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:text-rose-600`}
              onClick={() => {
                state.clear();
                setDrafts({});
                setMessage(text('cleared'));
                heading.current?.focus();
              }}
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>{text('clear')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Title & Introduction */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>South Omo Marketplace</span>
        </div>
        <h1
          ref={heading}
          id={titleId}
          tabIndex={-1}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight focus:outline-none"
        >
          {text('title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
          {text('priceNote')}
        </p>
      </div>

      {!state.storageAvailable && (
        <p role="status" className="rounded-xl border border-amber-600/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs font-medium text-amber-900 dark:text-amber-200">
          {text('storageUnavailable')}
        </p>
      )}

      {!isOnline && (
        <p
          role="status"
          className="rounded-xl border border-amber-600/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs font-medium text-amber-900 dark:text-amber-200"
        >
          {text('offline')}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </p>
      )}

      {/* Cart Content or Empty State */}
      {items.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <p role="status" className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {text('empty')}
          </p>
          <p className="text-xs text-slate-500">
            Explore authentic honey, woven shawls, and artisan crafts directly from indigenous producers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Grouped Items */}
          <div className="lg:col-span-8 space-y-8">
            {checking && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p role="status" aria-busy="true">
                  {text('checking')}
                </p>
              </div>
            )}

            <div className="space-y-8">
              {groups.map((group) => (
                <section
                  key={group.enterpriseId ?? 'unresolved'}
                  className="min-w-0 space-y-4"
                  aria-label={group.enterpriseName || text('unknownSeller')}
                >
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h2 className="break-words text-xl font-bold text-slate-900 dark:text-slate-100">
                      {group.enterpriseName || text('unknownSeller')}
                    </h2>
                  </div>

                  <ul className="space-y-4">
                    {group.items.map(({ line, check }) => (
                      <li key={line.productId} className="min-w-0">
                        <CartRow
                          line={line}
                          check={check}
                          checking={checking}
                          isOnline={isOnline}
                          quantity={drafts[line.productId] ?? String(line.quantity)}
                          onQuantityChange={(value) => {
                            setDrafts((previous) => {
                              const next = { ...previous };
                              if (value === undefined) delete next[line.productId];
                              else next[line.productId] = value;
                              return next;
                            });
                          }}
                          onRemove={(id, name) => {
                            state.remove(id);
                            setDrafts((previous) => {
                              const next = { ...previous };
                              delete next[id];
                              return next;
                            });
                            setMessage(text('removed', { name }));
                            heading.current?.focus();
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          {/* Right Column (4 cols): Sticky Checkout Action Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Order Readiness
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  Checkout Action
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Lock verified item stock and confirm final shipping breakdown at checkout.
                </p>
              </div>

              {/* Guarantees */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>70%+ Direct Producer Wage Escrow</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified South Omo Indigenous Harvest</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Secure Telebirr & CBE Payment Gateways</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-3 pt-2">
                {ready ? (
                  <Link
                    className="w-full inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base shadow-md transition-all cursor-pointer"
                    to="/checkout"
                  >
                    {text('checkout')}
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-base cursor-not-allowed opacity-60"
                      disabled
                      aria-describedby={`${titleId}-blocked`}
                    >
                      {text('checkout')}
                    </button>
                    <p
                      id={`${titleId}-blocked`}
                      className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed text-center"
                    >
                      {text(hasDraftChanges ? 'saveChanges' : 'checkoutBlocked')}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
export default CartView;
