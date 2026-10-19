import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, normalizeLanguage } from '../../i18n/languages';
import { changeLanguage } from '../../i18n/changeLanguage';

export interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className = '', compact = false }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const currentLang = normalizeLanguage(i18n.language);
  if (compact) {
    return (
      <div className={`inline-flex min-w-0 items-center gap-1 ${className}`} data-testid="language-switcher">
        <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
        <select
          aria-label={t('common.language', 'Language')}
          value={currentLang}
          onChange={(event) => void changeLanguage(event.target.value)}
          className="min-h-11 w-24 max-w-full rounded-lg border border-slate-300 bg-white px-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {SUPPORTED_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.native}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div className={`inline-flex flex-wrap items-center rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold ${className}`} data-testid="language-switcher">
      <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" aria-hidden="true" />
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => void changeLanguage(language.code)}
          className={`px-2 py-1 rounded-lg transition-all touch-target cursor-pointer ${language.code === 'am' ? 'font-ethiopic' : ''} ${currentLang === language.code ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          aria-label={`${t('common.switchLanguage', 'Switch to')} ${language.name} (${language.native})`}
          aria-pressed={currentLang === language.code}
          data-testid={`lang-btn-${language.code}`}
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
