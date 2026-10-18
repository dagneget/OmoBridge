import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import en from './locales/result.en.json';
import am from './locales/result.am.json';
i18n.addResourceBundle('en', 'checkoutResult', en, true, true);
i18n.addResourceBundle('am', 'checkoutResult', am, true, true);
export function useCheckoutResultText() {
  const { t } = useTranslation('checkoutResult');
  return (key: keyof typeof en, values: Record<string, string | number> = {}) =>
    t(key, { ...values, fallbackLng: ['am', 'en'] });
}
