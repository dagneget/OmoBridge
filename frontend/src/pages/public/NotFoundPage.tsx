import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6" data-testid="not-found-page">
      <div className="text-7xl font-extrabold text-emerald-800 dark:text-emerald-400 mb-2">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        Page Not Found / ገጹ አልተገኘም
      </h1>
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mb-8">
        The route you are trying to access does not exist or has been moved. Explore South Omo tourism and products below.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          to="/"
          className="touch-target inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl shadow-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          to="/tourism"
          className="touch-target inline-flex items-center gap-2 px-6 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium rounded-xl transition-colors"
        >
          <Compass className="w-4 h-4" />
          <span>Explore Tourism</span>
        </Link>
      </div>
    </div>
  );
}
