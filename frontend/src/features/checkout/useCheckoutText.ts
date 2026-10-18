import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import en from './locales/en.json';
import am from './locales/am.json';
i18n.addResourceBundle('en', 'checkout', en, true, true);
i18n.addResourceBundle('am', 'checkout', am, true, true);
export function useCheckoutText() {
  const { t } = useTranslation('checkout');
  return (key: keyof typeof en, values: Record<string, string | number> = {}) =>
    t(key, { ...values, fallbackLng: ['am', 'en'] });
}
