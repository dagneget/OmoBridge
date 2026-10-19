import useShellText from '../../i18n/useShellText';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { OfflineBanner } from '../common/OfflineBanner';

export default function AuthLayout() {
  const shellText = useShellText();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <OfflineBanner />
      {/* Top Header */}
      <header className="gap-2 flex-wrap p-4 sm:p-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          to="/"
          className="touch-target inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{shellText("Back to Home")}</span>
        </Link>
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/kinka-logo.png"
            alt="Kinka Logo"
            className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-amber-700/20"
          />
          <span className="font-bold text-base text-emerald-950 dark:text-emerald-300">
            Kinka
          </span>
          <span className="text-xs text-amber-700 dark:text-amber-400 font-ethiopic font-semibold">
            ኪንካ
          </span>
        </Link>
        <LanguageSwitcher compact />
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
        {shellText("\u00a9 2026 Kinka. Secure authentication with Ethiopian identity standards.")}
      </footer>
    </div>
  );
}
