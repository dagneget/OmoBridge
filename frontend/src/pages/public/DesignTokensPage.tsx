import { useState, useEffect } from 'react';

export default function DesignTokensPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8" data-testid="design-tokens-page">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kinka Design Tokens</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Foundation styling tokens for mobile-first PWA, dark/light themes, and Ethiopic script.
          </p>
        </div>
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme"
          className="touch-target px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center"
        >
          Theme: <span className="ml-1 capitalize font-bold">{theme}</span>
        </button>
      </header>

      {/* Colors Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-800 pb-2">
          Color Palette
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-emerald-700 text-white shadow-sm">
            <p className="font-semibold">Brand Primary</p>
            <p className="text-xs opacity-90 mt-1">#047857 (Emerald)</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-amber-600 text-white shadow-sm">
            <p className="font-semibold">Brand Accent</p>
            <p className="text-xs opacity-90 mt-1">#d97706 (Amber)</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100 shadow-sm">
            <p className="font-semibold">Surface Light</p>
            <p className="text-xs opacity-80 mt-1">Subtle Emerald</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-red-600 text-white shadow-sm">
            <p className="font-semibold">Status Error</p>
            <p className="text-xs opacity-90 mt-1">#dc2626</p>
          </div>
        </div>
      </section>

      {/* Typography & Amharic / Ethiopic Script Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-800 pb-2">
          Typography & Script Support
        </h2>
        <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Heading 1 (English)</span>
            <p className="text-2xl font-bold">Connecting South Omo to Global Markets</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Heading 1 (Amharic / አማርኛ)</span>
            <p className="text-2xl font-bold font-ethiopic" data-testid="amharic-heading">
              ኦሞብሪጅ - የደቡብ ኦሞ ግብርና እና ቱሪዝም ዲጂታል ድልድይ
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Body Text (Amharic / አማርኛ)</span>
            <p className="text-base font-ethiopic text-gray-700 dark:text-gray-300" data-testid="amharic-body">
              የአርሶ አደሮች ምርት፣ የቱሪዝም አገልግሎቶች እና የትራንስፖርት ቅንጅት በአንድ ቦታ።
            </p>
          </div>
        </div>
      </section>

      {/* Touch Targets Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-800 pb-2">
          Touch Targets (WCAG 2.1 AA - Min 44px)
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            type="button"
            className="touch-target px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Action Button (44px+)
          </button>
          <button
            type="button"
            className="touch-target px-6 border-2 border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Secondary Action
          </button>
          <input
            type="checkbox"
            id="sample-checkbox"
            aria-label="Sample touch checkbox"
            className="touch-target w-7 h-7 accent-emerald-700 rounded cursor-pointer"
          />
        </div>
      </section>
    </div>
  );
}
