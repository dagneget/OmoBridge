import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPreferredLanguage, persistLanguage } from './languages';
import enTranslation from '../../public/locales/en/translation.json';
import amTranslation from '../../public/locales/am/translation.json';
import amfTranslation from '../../public/locales/amf/translation.json';
import kxhTranslation from '../../public/locales/kxh/translation.json';
import dshTranslation from '../../public/locales/dsh/translation.json';
import tsmTranslation from '../../public/locales/tsm/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      am: { translation: amTranslation },
      amf: { translation: amfTranslation },
      kxh: { translation: kxhTranslation },
      dsh: { translation: dshTranslation },
      tsm: { translation: tsmTranslation },
    },
    lng: getPreferredLanguage(),
    fallbackLng: { en: ['en'], default: ['am', 'en'] },
    interpolation: {
      escapeValue: false,
    },
  });

if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;
i18n.on('languageChanged', persistLanguage);

export default i18n;
