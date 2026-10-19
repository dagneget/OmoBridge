import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPreferredLanguage, persistLanguage } from './languages';
import enTranslation from '../../public/locales/en/translation.json';
import amTranslation from '../../public/locales/am/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      am: { translation: amTranslation }
    },
    lng: getPreferredLanguage(),
    fallbackLng: { en: ['en'], default: ['am', 'en'] },
    interpolation: {
      escapeValue: false
    }
  });

if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;
i18n.on('languageChanged', persistLanguage);

export default i18n;
