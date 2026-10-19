export const LANG_STORAGE_KEY = 'omobridge_lang';
const LEGACY_LANGUAGE_KEY = 'omobridge_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', short: 'EN' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ', short: 'አማ' },
  { code: 'amf', name: 'Hamer', native: 'Hamer', short: 'Hamer' },
  { code: 'kxh', name: 'Karo', native: 'Karo', short: 'Karo' },
  { code: 'dsh', name: 'Dasenech (Lower Omo)', native: 'Daasanach', short: 'DSH' },
  { code: 'tsm', name: 'Tsamai (Woito Valley)', native: 'Tsamai', short: 'TSM' },
] as const;

export function normalizeLanguage(language: string | null | undefined): string {
  const code = language?.trim().toLowerCase().split('-')[0];
  if (code === 'hbr') return 'amf'; // Migrate the previous Hamer preference.
  return SUPPORTED_LANGUAGES.some((language) => language.code === code) ? code! : 'en';
}

export function getPreferredLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    return normalizeLanguage(localStorage.getItem(LANG_STORAGE_KEY) || localStorage.getItem(LEGACY_LANGUAGE_KEY));
  } catch {
    return sessionLanguage;
  }
}

let sessionLanguage = 'en';

export function persistLanguage(language: string): void {
  if (typeof window === 'undefined') return;
  sessionLanguage = normalizeLanguage(language);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, language);
  } catch {
    // Private browsing can disable storage; switching still works in this tab.
  }
  document.documentElement.lang = language;
}

export const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map(({ code, native, name }) => ({
  value: code,
  label: native === name ? name : `${native} (${name})`,
}));
