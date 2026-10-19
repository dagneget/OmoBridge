import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ProductResponse } from '../../types/api';
import { useCartStore } from './cartState';
import { useCartText } from './useCartText';
import { ShoppingBag, Zap, CheckCircle2, ShoppingCart } from 'lucide-react';

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
    <section aria-label={text('addTitle')} className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-5 shadow-xs">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!available) return;
          setFeedback(add(product.id!, Number(quantity)) ? 'added' : 'invalid');
        }}
      >
        {/* Quantity Field */}
        <div className="space-y-1.5">
          <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor={id}>
            {text('quantity')}
          </label>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
            className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 py-2 font-semibold text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            value={quantity}
            disabled={!available}
            aria-invalid={feedback === 'invalid' || undefined}
            aria-describedby={`${id}-help${feedback === 'invalid' ? ` ${id}-error` : ''}`}
            onChange={(event) => {
              setQuantity(event.target.value);
              setFeedback(null);
            }}
          />
          <p id={`${id}-help`} className="text-[11px] text-slate-500">
            {text('quantityHelp')}
          </p>
        </div>

        {/* Primary CTA: Buy Now Button */}
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!available}
          className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-amber-300 text-amber-300" aria-hidden="true" />
          <span>{text('buyNow')}</span>
        </button>

        {/* Secondary Row: Add to Cart + View Cart */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="submit"
            disabled={!available}
            className="w-full min-h-[44px] rounded-xl border-2 border-emerald-600/30 hover:border-emerald-600/60 bg-emerald-50/60 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>{text('add')}</span>
          </button>

          <Link
            to="/cart"
            className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShoppingCart className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>{text('view')}</span>
          </Link>
        </div>
      </form>

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
