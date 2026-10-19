import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import en from './locales/history.en.json';
import am from './locales/history.am.json';
i18n.addResourceBundle('en', 'paymentHistory', en, true, true);
i18n.addResourceBundle('am', 'paymentHistory', am, true, true);
export const paymentControl =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100';
export const paymentScreen =
  'mx-auto max-w-3xl space-y-4 px-4 py-6 text-slate-900 dark:text-slate-100';
export function usePaymentText() {
  const { t, i18n: language } = useTranslation('paymentHistory');
  return {
    t: (key: keyof typeof en, values: Record<string, string | number> = {}) =>
      t(key, { ...values, fallbackLng: ['am', 'en'] }),
    date: (value: string) =>
      new Intl.DateTimeFormat(
        language.resolvedLanguage?.startsWith('am') ? 'am-ET' : 'en-ET',
        { dateStyle: 'medium', timeStyle: 'short' },
      ).format(new Date(value)),
  };
}
