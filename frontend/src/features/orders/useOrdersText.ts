import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import en from './locales/en.json';
import am from './locales/am.json';
i18n.addResourceBundle('en', 'orders', en, true, true);
i18n.addResourceBundle('am', 'orders', am, true, true);
export function useOrdersText() {
  const { t, i18n: language } = useTranslation('orders');
  return {
    text: (
      key: keyof typeof en,
      values: Record<string, string | number> = {},
    ) => t(key, { ...values, fallbackLng: ['am', 'en'] }),
    date: (value?: string) =>
      value && Number.isFinite(Date.parse(value))
        ? new Intl.DateTimeFormat(language.resolvedLanguage || 'en', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(value))
        : t('unknown', { fallbackLng: ['am', 'en'] }),
  };
}
export const orderControl =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100';
export const orderScreen =
  'mx-auto max-w-3xl space-y-5 px-4 py-6 text-slate-900 dark:text-slate-100';
export const orderAmount = (amount?: number, currency?: string) =>
  typeof amount === 'number' &&
  Number.isFinite(amount) &&
  amount >= 0 &&
  currency?.trim()
    ? `${amount.toFixed(2)} ${currency}`
    : undefined;
