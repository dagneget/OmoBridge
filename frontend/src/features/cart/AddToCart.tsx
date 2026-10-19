import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ProductResponse } from '../../types/api';
import { useCartStore } from './cartState';
import { cartControl, useCartText } from './useCartText';
import { ShoppingBag, Zap, CheckCircle2 } from 'lucide-react';

export function AddToCart({ product }: { product: ProductResponse }) {
  const text = useCartText();
  const navigate = useNavigate();
  const add = useCartStore((state) => state.add);
  const id = useId();
  const [quantity, setQuantity] = useState('1');
  const [feedback, setFeedback] = useState<'added' | 'invalid' | null>(null);
  const available =
    product.published === true &&
    !!product.id &&
    typeof product.availableStock === 'number' &&
    Number.isFinite(product.availableStock) &&
    product.availableStock > 0;

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!available) return;
    const ok = add(product.id!, Number(quantity));
    if (ok) {
      navigate('/checkout');
    } else {
      setFeedback('invalid');
    }
  };

  return (
    <section aria-label={text('addTitle')} className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-5 shadow-sm">
      <form
        noValidate
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!available) return;
          setFeedback(add(product.id!, Number(quantity)) ? 'added' : 'invalid');
        }}
      >
        <label className="grid gap-1.5 font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor={id}>
          {text('quantity')}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
            className={`${cartControl} w-28 rounded-xl font-normal text-sm normal-case`}
            value={quantity}
            disabled={!available}
            aria-invalid={feedback === 'invalid' || undefined}
            aria-describedby={`${id}-help${feedback === 'invalid' ? ` ${id}-error` : ''}`}
            onChange={(event) => {
              setQuantity(event.target.value);
              setFeedback(null);
            }}
          />
        </label>
        <button
          type="submit"
          className={`${cartControl} rounded-xl inline-flex items-center gap-1.5 font-semibold text-sm cursor-pointer`}
          disabled={!available}
        >
          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
          <span>{text('add')}</span>
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className={`${cartControl} rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 font-semibold text-sm inline-flex items-center gap-1.5 shadow-sm cursor-pointer`}
          disabled={!available}
        >
          <Zap className="w-4 h-4 text-amber-300" aria-hidden="true" />
          <span>Buy Now</span>
        </button>
        <Link
          className={`${cartControl} rounded-xl inline-flex items-center font-medium text-sm text-slate-600 dark:text-slate-300`}
          to="/cart"
        >
          {text('view')}
        </Link>
      </form>
      <p id={`${id}-help`} className="text-xs text-slate-500">
        {text('quantityHelp')}
      </p>
      {!available && <p className="text-xs text-rose-600 font-medium">{text('cannotAdd')}</p>}
      {feedback === 'invalid' && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive font-medium">
          {text('invalidQuantity')}
        </p>
      )}
      {feedback === 'added' && (
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{text('added')}</span>
        </p>
      )}
    </section>
  );
}
export default AddToCart;
