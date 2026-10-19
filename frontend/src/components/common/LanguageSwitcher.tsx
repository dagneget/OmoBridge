import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import defaultI18n from '../../i18n';
import { LANG_STORAGE_KEY } from '../../services/httpClient';
import { queryClient } from '../../services/queryClient';

export interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;

  const currentLang = activeI18n.language?.startsWith('am') ? 'am' : 'en';

  const toggleLanguage = async (newLang: 'en' | 'am') => {
    if (newLang === currentLang) return;

    // Update i18next
    await activeI18n.changeLanguage(newLang);

    // Save preference to localStorage so httpClient picks it up in Accept-Language
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    }

    // Refetch server state with the new Accept-Language header
    queryClient.invalidateQueries();
  };

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs text-xs font-semibold ${className}`}
      data-testid="language-switcher"
    >
      <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" aria-hidden="true" />
      <button
        type="button"
        onClick={() => toggleLanguage('en')}
        className={`px-2 py-1 rounded-lg transition-all touch-target cursor-pointer ${
          currentLang === 'en'
            ? 'bg-emerald-700 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        aria-label="Switch to English"
        data-testid="lang-btn-en"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage('am')}
        className={`px-2 py-1 rounded-lg transition-all touch-target font-ethiopic cursor-pointer ${
          currentLang === 'am'
            ? 'bg-emerald-700 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        aria-label="Switch to Amharic"
        data-testid="lang-btn-am"
      >
        አማ
      </button>
    </div>
  );
}

export default LanguageSwitcher;
