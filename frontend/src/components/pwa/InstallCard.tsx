import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { usePwaInstall } from './usePwaInstall';
import en from './locales/en.json';
import am from './locales/am.json';

i18n.addResourceBundle('en', 'install', en, true, true);
i18n.addResourceBundle('am', 'install', am, true, true);

export function InstallCard() {
  const state = usePwaInstall();
  const headingId = useId();
  const { t } = useTranslation('install');
  const text = (key: keyof typeof en) => t(key, { fallbackLng: ['am', 'en'] });
  if (!state.isVisible) return null;
  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 space-y-3 rounded-xl border border-slate-300 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <h2 id={headingId} className="text-lg font-semibold">
        {text('title')}
      </h2>
      <p>{text('description')}</p>
      {state.isIos && !state.canPrompt && !state.hasError && (
        <ol className="list-decimal space-y-2 pl-5">
          <li>{text('iosOpen')}</li>
          <li>{text('iosShare')}</li>
          <li>{text('iosAdd')}</li>
        </ol>
      )}
      {state.hasError && <p role="alert">{text('error')}</p>}
      <div className="flex flex-wrap gap-3">
        {state.canPrompt && (
          <button
            type="button"
            disabled={state.isPrompting}
            onClick={() => void state.install()}
            className="min-h-[44px] rounded-lg bg-emerald-800 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-60"
          >
            {state.isPrompting ? text('installing') : text('install')}
          </button>
        )}
        <button
          type="button"
          disabled={state.isPrompting}
          onClick={state.dismiss}
          className="min-h-[44px] rounded-lg border border-slate-400 px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-60"
        >
          {text('dismiss')}
        </button>
      </div>
    </section>
  );
}
