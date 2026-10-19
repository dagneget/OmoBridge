import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
i18n.addResourceBundle(
  'en',
  'pageError',
  {
    title: 'Something went wrong',
    detail:
      'An unexpected error prevented this page from loading. Reload to try again.',
    reload: 'Reload page',
  },
  true,
  true,
);
i18n.addResourceBundle(
  'am',
  'pageError',
  {
    title: 'አንድ ችግር ተፈጥሯል',
    detail: 'ባልተጠበቀ ስህተት ምክንያት ገጹ አልተጫነም። እንደገና ለመሞከር ገጹን ያድሱ።',
    reload: 'ገጹን እንደገና ይጫኑ',
  },
  true,
  true,
);
export default function ErrorFallback({ onReload }: { onReload: () => void }) {
  const { t } = useTranslation('pageError');
  return (
    <div
      role="alert"
      data-testid="error-boundary-fallback"
      className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {t('title')}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {t('detail')}
      </p>
      <button
        type="button"
        onClick={onReload}
        className="touch-target px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
      >
        {t('reload')}
      </button>
    </div>
  );
}
