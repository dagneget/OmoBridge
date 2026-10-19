import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartStore, useCartStore } from '../cart';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import {
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from '../../utils/phone';
import { useCheckoutStore } from './checkoutStore';
import { CheckoutResult } from './CheckoutResult';
import { useCheckoutText } from './useCheckoutText';
import { getProductImage } from '../products/productImages';
import {
  Truck,
  MapPin,
  Map,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  WifiOff,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const DeliveryMap = lazy(() => import('./DeliveryMap'));

const control =
  'w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60 transition-colors text-sm';

const btnSecondary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60';

const btnPrimary =
  'w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-bold text-base shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700';

export function CheckoutForm() {
  const t = useCheckoutText();
  const cart = useCartStore((state) => state);
  const checkout = useCheckoutStore();
  const { isOnline } = useNetworkStatus();
  const [address, setAddress] = useState(
    checkout.payload?.deliveryAddress ?? '',
  );
  const [phone, setPhone] = useState(checkout.payload?.deliveryPhone ?? '');
  const [notes, setNotes] = useState(checkout.payload?.notes ?? '');
  const [lat, setLat] = useState(
    checkout.payload?.deliveryLatitude?.toString() ?? '',
  );
  const [lng, setLng] = useState(
    checkout.payload?.deliveryLongitude?.toString() ?? '',
  );
  const [invalid, setInvalid] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const busy = checkout.phase === 'checking' || checkout.phase === 'submitting';
  const locked = busy || checkout.phase === 'retry';
  const validPoint =
    lat.trim() !== '' &&
    lng.trim() !== '' &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180;

  useEffect(() => {
    if (
      cart.items.length &&
      isOnline &&
      !locked &&
      checkout.phase !== 'success'
    )
      void cartStore.getState().revalidate();
  }, [cart.items, isOnline, locked, checkout.phase]);

  useEffect(() => {
    if (!locked) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [locked]);

  const result = checkout.result;

  return (
    <section
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-slate-900 dark:text-slate-100"
      aria-labelledby="checkout-title"
    >
      {/* Top Navigation & Title */}
      <div className="space-y-4 mb-8">
        {!locked && !result && (
          <div>
            <Link
              className={btnSecondary}
              to="/cart"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t('cart')}
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 id="checkout-title" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t('title')}
            </h1>
            {!result && (
              <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
                {t('intro')}
              </p>
            )}
          </div>
          {!result && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Direct Fair-Trade Checkout</span>
            </div>
          )}
        </div>

        {cart.phase === 'checking' && !busy && (
          <div role="status" className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-sm font-medium">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>{t('checkingItems')}</span>
          </div>
        )}

        {!isOnline && (
          <div role="status" className="flex items-center gap-2 p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-2xl border border-amber-200 dark:border-amber-800 text-sm font-medium">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t('offline')}</span>
          </div>
        )}
      </div>

      {result ? (
        <CheckoutResult
          result={result}
          onNewCheckout={() => checkout.reset()}
        />
      ) : (
        <>
          {!cart.items.length && !locked ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{t('empty')}</p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-700/20"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <form
              noValidate
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              onSubmit={(event) => {
                event.preventDefault();
                if (busy || !isOnline) return;
                if (
                  !checkout.payload &&
                  (!address.trim() ||
                    !isValidEthiopianPhone(phone) ||
                    ((lat.trim() !== '' || lng.trim() !== '') && !validPoint))
                ) {
                  setInvalid(true);
                  return;
                }
                setInvalid(false);
                void checkout.place({
                  deliveryAddress: address.trim(),
                  deliveryPhone: normalizeEthiopianPhone(phone),
                  notes: notes.trim() || undefined,
                  ...(validPoint
                    ? {
                        deliveryLatitude: Number(lat),
                        deliveryLongitude: Number(lng),
                      }
                    : {}),
                });
              }}
            >
              {/* Left Column: Delivery & Coordinates (8 cols on xl) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                <fieldset disabled={locked} className="min-w-0 space-y-6">
                  {/* Card 1: Delivery Address and Contact */}
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Truck className="w-4 h-4" />
                        </div>
                        <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                          Delivery Destination
                        </h2>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Step 1 of 2</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {t('address')}
                          <textarea
                            required
                            rows={3}
                            autoComplete="street-address"
                            className={control}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="e.g. Jinka market, Turmi center, or kebele/house number..."
                          />
                        </label>
                        {/* Quick preset destination buttons for rapid demo */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quick fill:</span>
                          {['Jinka Market', 'Turmi Center', 'Dimeka', 'Addis Ababa'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={locked}
                              onClick={() => setAddress(preset)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {t('phone')}
                          <input
                            required
                            type="tel"
                            autoComplete="tel"
                            className={control}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0911000001 or +251911000001"
                          />
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Ethiopian mobile starting with 09, 07, or +251
                        </p>
                      </div>

                      <label className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t('notes')}
                        <textarea
                          rows={2}
                          className={control}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Special delivery instructions, gate code, or landmark..."
                        />
                      </label>
                    </div>
                  </div>

                  {/* Card 2: Precise GPS Pin & Map */}
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                          GPS Coordinates
                        </h2>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Optional</span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t('pinHelp')}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t('latitude')}
                        <input
                          type="number"
                          min={-90}
                          max={90}
                          step="any"
                          className={control}
                          value={lat}
                          onChange={(e) => setLat(e.target.value)}
                          placeholder="e.g. 5.7834"
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t('longitude')}
                        <input
                          type="number"
                          min={-180}
                          max={180}
                          step="any"
                          className={control}
                          value={lng}
                          onChange={(e) => setLng(e.target.value)}
                          placeholder="e.g. 36.5667"
                        />
                      </label>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={!isOnline}
                        onClick={() => setMapOpen((prev) => !prev)}
                      >
                        <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        {t('showMap')}
                      </button>
                    </div>

                    {mapOpen && isOnline && !locked && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <Suspense fallback={<p role="status" className="p-4 text-sm text-slate-500">{t('loadingMap')}</p>}>
                          <DeliveryMap
                            point={
                              validPoint ? [Number(lat), Number(lng)] : undefined
                            }
                            onPick={(latitude, longitude) => {
                              setLat(latitude.toFixed(6));
                              setLng(longitude.toFixed(6));
                            }}
                          />
                        </Suspense>
                      </div>
                    )}
                  </div>
                </fieldset>

                {/* Status & Error Alerts */}
                {invalid && (
                  <div role="alert" className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{t('invalid')}</span>
                  </div>
                )}
                {checkout.phase === 'rejected' && (
                  <div role="alert" className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{t('rejected')}</span>
                  </div>
                )}
                {checkout.phase === 'retry' && (
                  <div role="alert" className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{t('uncertain')}</span>
                  </div>
                )}
                {busy && (
                  <div role="status" className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin flex-shrink-0" />
                    <span>{t('loading')}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Order Summary & Review (4 cols on xl) */}
              <aside className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-6">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                        Order Items
                      </h2>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto pr-1">
                    {cart.items.map((line) => {
                      const check = cart.checks[line.productId];
                      return (
                        <li
                          key={line.productId}
                          className="py-3.5 first:pt-0 last:pb-0 break-words flex gap-3.5 items-center"
                        >
                          <img
                            src={getProductImage(check?.product)}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0 bg-slate-100 dark:bg-slate-800"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">
                              {check?.product?.name ??
                                t('item', { id: line.productId })}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {t('quantity', { quantity: line.quantity })}
                            </p>
                            {check?.status === 'insufficient-stock' && (
                              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                                {t('shortage')}
                              </p>
                            )}
                            {check?.status === 'unavailable' && (
                              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                                {t('unavailable')}
                              </p>
                            )}
                            {check?.status === 'error' && (
                              <p role="alert" className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                                {t('checkError')}
                              </p>
                            )}
                            {check?.priceChanged && (
                              <p role="alert" className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                                {t('priceChanged')}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Community Fair Trade Benefit Card */}
                  <div className="rounded-2xl p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Fair-Trade Direct Producer Share</span>
                    </div>
                    <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                      Every order directly supports local South Omo beekeepers, shade-grown coffee farmers, and artisanal craft women.
                    </p>
                  </div>

                  {/* Primary Checkout Button */}
                  <button
                    type="submit"
                    disabled={busy || !isOnline}
                    className={btnPrimary}
                  >
                    <span>{t(checkout.phase === 'retry' ? 'retry' : 'place')}</span>
                  </button>

                  <div className="pt-1 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Telebirr & CBE Birr enabled upon confirmation</span>
                  </div>
                </div>
              </aside>
            </form>
          )}
        </>
      )}
    </section>
  );
}

export default CheckoutForm;
