import { useTranslation } from 'react-i18next';
import i18n from './index';
import am from './locales/shell.am.json';
import amf from './locales/shell.amf.json';
import kxh from './locales/shell.kxh.json';
import dsh from './locales/shell.dsh.json';
import tsm from './locales/shell.tsm.json';

i18n.addResourceBundle('en', 'shell', Object.fromEntries(Object.keys(am).map((text) => [text, text])), true, true);
i18n.addResourceBundle('am', 'shell', am, true, true);
i18n.addResourceBundle('amf', 'shell', amf, true, true);
i18n.addResourceBundle('kxh', 'shell', kxh, true, true);
i18n.addResourceBundle('dsh', 'shell', dsh, true, true);
i18n.addResourceBundle('tsm', 'shell', tsm, true, true);

export default function useShellText() {
  const { t } = useTranslation('shell');
  return (text: string) => t(text, { defaultValue: text, keySeparator: false, nsSeparator: false });
}
