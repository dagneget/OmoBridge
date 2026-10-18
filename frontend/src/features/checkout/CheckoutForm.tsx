import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartStore, useCartStore } from '../cart';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import {
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from '../../utils/phone';
import { useCheckoutStore } from './checkoutStore';
import { useCheckoutText } from './useCheckoutText';
const DeliveryMap = lazy(() => import('./DeliveryMap'));
const control =
  'min-h-[44px] min-w-[44px] rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100';

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
      className="mx-auto max-w-2xl space-y-5 px-4 py-6 text-slate-900 dark:text-slate-100"
      aria-labelledby="checkout-title"
    >
      <h1 id="checkout-title" className="text-2xl font-bold">
        {t('title')}
      </h1>
      {result ? (
        <div role="status" className="space-y-3">
          <h2 className="text-xl font-semibold">{t('success')}</h2>
          <p>{t('group', { reference: result.groupNo! })}</p>
          <p>
            {t('total', {
              total: `${result.totalAmount!.toFixed(2)} ${result.currency}`,
            })}
          </p>
          <h3 className="font-semibold">{t('orders')}</h3>
          <ul className="space-y-2">
            {result.orders!.map((order) => (
              <li key={order.orderId}>
                {order.enterpriseName ?? t('unknown')} · {order.orderNo} ·{' '}
                {order.totalAmount!.toFixed(2)} {order.currency}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={control}
            onClick={() => checkout.reset()}
          >
            {t('newOrder')}
          </button>
        </div>
      ) : (
        <>
          <p>{t('intro')}</p>
          {!locked && (
            <Link className={`${control} inline-flex items-center`} to="/cart">
              {t('cart')}
            </Link>
          )}
          {cart.phase === 'checking' && !busy && (
            <p role="status">{t('checkingItems')}</p>
          )}
          {!isOnline && <p role="status">{t('offline')}</p>}
          {!cart.items.length && !locked ? (
            <p>{t('empty')}</p>
          ) : (
            <>
              <ul className="space-y-3">
                {cart.items.map((line) => {
                  const check = cart.checks[line.productId];
                  return (
                    <li
                      key={line.productId}
                      className="break-words rounded-lg border border-slate-300 p-3"
                    >
                      <p className="font-semibold">
                        {check?.product?.name ??
                          t('item', { id: line.productId })}
                      </p>
                      <p>{t('quantity', { quantity: line.quantity })}</p>
                      {check?.status === 'insufficient-stock' && (
                        <p role="alert">{t('shortage')}</p>
                      )}
                      {check?.status === 'unavailable' && (
                        <p role="alert">{t('unavailable')}</p>
                      )}
                      {check?.status === 'error' && (
                        <p role="alert">{t('checkError')}</p>
                      )}
                      {check?.priceChanged && (
                        <p role="alert">{t('priceChanged')}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <form
                noValidate
                className="space-y-4"
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
                <fieldset disabled={locked} className="min-w-0 space-y-4">
                  <label className="grid gap-1">
                    {t('address')}
                    <textarea
                      required
                      autoComplete="street-address"
                      className={control}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    {t('phone')}
                    <input
                      required
                      type="tel"
                      autoComplete="tel"
                      className={control}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    {t('notes')}
                    <textarea
                      className={control}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                  <p>{t('pinHelp')}</p>
                  <label className="grid gap-1">
                    {t('latitude')}
                    <input
                      type="number"
                      min={-90}
                      max={90}
                      step="any"
                      className={control}
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    {t('longitude')}
                    <input
                      type="number"
                      min={-180}
                      max={180}
                      step="any"
                      className={control}
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={control}
                    disabled={!isOnline}
                    onClick={() => setMapOpen(true)}
                  >
                    {t('showMap')}
                  </button>
                  {mapOpen && isOnline && !locked && (
                    <Suspense fallback={<p role="status">{t('loadingMap')}</p>}>
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
                  )}
                </fieldset>
                {invalid && <p role="alert">{t('invalid')}</p>}
                {checkout.phase === 'rejected' && (
                  <p role="alert">{t('rejected')}</p>
                )}
                {checkout.phase === 'retry' && (
                  <p role="alert">{t('uncertain')}</p>
                )}
                {busy && <p role="status">{t('loading')}</p>}
                <button
                  type="submit"
                  disabled={busy || !isOnline}
                  className={control}
                >
                  {t(checkout.phase === 'retry' ? 'retry' : 'place')}
                </button>
              </form>
            </>
          )}
        </>
      )}
    </section>
  );
}
