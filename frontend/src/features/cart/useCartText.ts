import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import en from './locales/en.json';
import am from './locales/am.json';

i18n.addResourceBundle('en', 'cart', en, true, true);
i18n.addResourceBundle('am', 'cart', am, true, true);

export function useCartText() {
  const { t } = useTranslation('cart');
  return (key: keyof typeof en, values: Record<string, string | number> = {}) =>
    t(key, { ...values, fallbackLng: ['am', 'en'] });
}
export const cartControl = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100';
