import { useTranslation } from 'react-i18next';
import i18n from './index';
import am from './locales/shell.am.json';

i18n.addResourceBundle('en', 'shell', Object.fromEntries(Object.keys(am).map((text) => [text, text])), true, true);
i18n.addResourceBundle('am', 'shell', am, true, true);

export default function useShellText() {
  const { t } = useTranslation('shell');
  return (text: string) => t(text, { defaultValue: text, keySeparator: false, nsSeparator: false });
}
