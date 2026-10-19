import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProductResponse } from '../../types/api';
import { useCartStore } from './cartState';
import { cartControl, useCartText } from './useCartText';

export function AddToCart({ product }: { product: ProductResponse }) {
  const text = useCartText();
  const add = useCartStore((state) => state.add);
  const id = useId();
  const [quantity, setQuantity] = useState('1');
  const [feedback, setFeedback] = useState<'added' | 'invalid' | null>(null);
  const available = product.published === true && !!product.id &&
    typeof product.availableStock === 'number' && Number.isFinite(product.availableStock) && product.availableStock > 0;
  return (
    <section aria-label={text('addTitle')} className="space-y-3 rounded-xl border border-slate-300 p-4 dark:border-slate-700">
      <form noValidate className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault();
        if (!available) return;
        setFeedback(add(product.id!, Number(quantity)) ? 'added' : 'invalid');
      }}>
        <label className="grid gap-1" htmlFor={id}>
          {text('quantity')}
          <input id={id} type="number" inputMode="decimal" min="0.001" step="0.001"
            className={`${cartControl} w-28`} value={quantity} disabled={!available}
            aria-invalid={feedback === 'invalid' || undefined}
            aria-describedby={`${id}-help${feedback === 'invalid' ? ` ${id}-error` : ''}`}
            onChange={(event) => { setQuantity(event.target.value); setFeedback(null); }} />
        </label>
        <button type="submit" className={cartControl} disabled={!available}>{text('add')}</button>
        <Link className={cartControl} to="/cart">{text('view')}</Link>
      </form>
      <p id={`${id}-help`} className="text-sm">{text('quantityHelp')}</p>
      {!available && <p>{text('cannotAdd')}</p>}
      {feedback === 'invalid' && <p id={`${id}-error`} role="alert">{text('invalidQuantity')}</p>}
      {feedback === 'added' && <p role="status">{text('added')}</p>}
    </section>
  );
}
