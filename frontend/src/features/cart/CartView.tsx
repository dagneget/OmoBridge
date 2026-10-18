import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { formatETB } from '../../utils/formatters';
import { cartStore, useCartStore } from './cartState';
import { selectCartGroups, selectCartReady } from './cartStore';
import type { CartLine, CartCheck } from './cartStore';
import { cartControl, useCartText } from './useCartText';

function CartRow({ line, check, checking, isOnline, quantity, onQuantityChange, onRemove }: {
  line: CartLine; check?: CartCheck; checking: boolean; isOnline: boolean;
  quantity: string; onQuantityChange: (quantity: string | undefined) => void;
  onRemove: (id: string, name: string) => void;
}) {
  const text = useCartText();
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  const [saved, setSaved] = useState(false);
  const product = check?.product;
  const name = product?.name || text('unknownProduct', { id: line.productId });
  const price = typeof product?.unitPrice === 'number' && Number.isFinite(product.unitPrice) && product.currency?.trim()
    ? formatETB(product.unitPrice, { currencyCode: product.currency }) : text('unknownPrice');
  const status = !check ? 'unchecked' : check.status;
  return (
    <article aria-labelledby={`${id}-title`} className="min-w-0 space-y-3 rounded-xl border border-slate-300 bg-white p-4 [overflow-wrap:anywhere] dark:border-slate-700 dark:bg-slate-900">
      <h3 id={`${id}-title`} className="text-lg font-semibold">
        {product ? <Link className="inline-flex min-h-[44px] items-center underline focus-visible:outline-2 focus-visible:outline-emerald-700" to={`/products/${line.productId}`}>{name}</Link> : name}
      </h3>
      <p>{text('unitPrice', { price })}</p>
      {product?.unit && <p>{text('unit', { unit: product.unit })}</p>}
      <p>{text(status)}</p>
      {status === 'insufficient-stock' && product?.availableStock !== undefined && <p>{text('availableQuantity', { quantity: product.availableStock })}</p>}
      {check?.priceChanged && <div className="space-y-2 rounded-lg border border-amber-700 p-3">
        <p>{text('priceChanged')}</p>
        <button type="button" className={cartControl} disabled={checking || !isOnline}
          onClick={() => cartStore.getState().acknowledgePriceChange(line.productId)}>{text('acceptPrice')}</button>
      </div>}
      <form noValidate className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault();
        const success = cartStore.getState().setQuantity(line.productId, Number(quantity));
        setInvalid(!success); setSaved(success);
        if (success) onQuantityChange(undefined);
      }}>
        <label className="grid gap-1" htmlFor={`${id}-quantity`}>
          {text('quantityFor', { name })}
          <input id={`${id}-quantity`} type="number" inputMode="decimal" min="0.001" step="0.001"
            className={`${cartControl} w-28`} value={quantity} aria-invalid={invalid || undefined}
            aria-describedby={`${id}-help${invalid ? ` ${id}-error` : ''}`}
            onChange={(event) => { onQuantityChange(event.target.value); setInvalid(false); setSaved(false); }} />
        </label>
        <button type="submit" className={cartControl}>{text('update')}</button>
        <button type="button" className={cartControl} aria-label={text('removeFor', { name })}
          onClick={() => onRemove(line.productId, name)}>{text('remove')}</button>
      </form>
      <p id={`${id}-help`} className="text-sm">{text('quantityHelp')}</p>
      {invalid && <p id={`${id}-error`} role="alert">{text('invalidQuantity')}</p>}
      {saved && <p role="status">{text('updated')}</p>}
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
  const hasDraftChanges = items.some((line) => drafts[line.productId] !== undefined && Number(drafts[line.productId]) !== line.quantity);
  const ready = isOnline && !hasDraftChanges && selectCartReady(state);
  return (
    <section aria-labelledby={titleId} className="mx-auto min-w-0 max-w-4xl space-y-6 text-slate-900 dark:text-slate-100">
      <h1 ref={heading} id={titleId} tabIndex={-1} className="text-3xl font-bold focus:outline-none">{text('title')}</h1>
      <p>{text('priceNote')}</p>
      <Link className={cartControl} to="/products">{text('browse')}</Link>
      {!state.storageAvailable && <p role="status">{text('storageUnavailable')}</p>}
      {!isOnline && <p role="status" className="rounded-lg border border-amber-700 p-3">{text('offline')}</p>}
      {message && <p role="status">{message}</p>}
      {items.length === 0 ? <p role="status">{text('empty')}</p> : <>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={cartControl} disabled={!isOnline || checking} onClick={() => void revalidate()}>{text('refresh')}</button>
          <button type="button" className={cartControl} onClick={() => {
            state.clear(); setDrafts({}); setMessage(text('cleared')); heading.current?.focus();
          }}>{text('clear')}</button>
        </div>
        {checking && <p role="status" aria-busy="true">{text('checking')}</p>}
        <div className="space-y-6">
          {groups.map((group) => <section key={group.enterpriseId ?? 'unresolved'} className="min-w-0 space-y-3" aria-label={group.enterpriseName || text('unknownSeller')}>
            <h2 className="break-words text-xl font-semibold">{group.enterpriseName || text('unknownSeller')}</h2>
            <ul className="space-y-4">
              {group.items.map(({ line, check }) => <li key={line.productId} className="min-w-0">
                <CartRow line={line} check={check} checking={checking} isOnline={isOnline}
                  quantity={drafts[line.productId] ?? String(line.quantity)} onQuantityChange={(value) => {
                    setDrafts((previous) => {
                      const next = { ...previous };
                      if (value === undefined) delete next[line.productId]; else next[line.productId] = value;
                      return next;
                    });
                  }} onRemove={(id, name) => {
                  state.remove(id);
                  setDrafts((previous) => { const next = { ...previous }; delete next[id]; return next; });
                  setMessage(text('removed', { name })); heading.current?.focus();
                }} />
              </li>)}
            </ul>
          </section>)}
        </div>
        <div className="space-y-3">
          {ready ? <Link className={cartControl} to="/checkout">{text('checkout')}</Link>
            : <><button type="button" className={cartControl} disabled aria-describedby={`${titleId}-blocked`}>{text('checkout')}</button>
              <p id={`${titleId}-blocked`}>{text(hasDraftChanges ? 'saveChanges' : 'checkoutBlocked')}</p></>}
        </div>
      </>}
    </section>
  );
}
