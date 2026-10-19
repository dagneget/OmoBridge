import { useState, Suspense } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ShoppingBag,
  Compass,
  MapPin,
  ShieldCheck,
  User,
  Truck,
  Sun,
  Moon,
} from 'lucide-react';
import { TOKEN_STORAGE_KEY } from '../../services/httpClient';
import { OfflineBanner } from '../common/OfflineBanner';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
  };

  const navLinks = [
    { to: '/tourism', label: 'Tourism', icon: Compass },
    { to: '/products', label: 'Products', icon: ShoppingBag },
    { to: '/hotels', label: 'Hotels', icon: MapPin },
    { to: '/guides', label: 'Guides', icon: User },
    { to: '/transport', label: 'Transport', icon: Truck },
    { to: '/safety-guidelines', label: 'Safety', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Top Notification / Banner */}
      <div className="bg-emerald-900 text-emerald-100 text-xs py-1.5 px-4 text-center font-medium">
        Connecting South Omo agricultural producers and community eco-tourism directly to markets
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 touch-target focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg"
          >
            <img
              src="/kinka-logo.png"
              alt="Kinka Logo"
              className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-amber-700/20"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-none text-emerald-950 dark:text-emerald-300">
                Kinka
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-ethiopic font-semibold tracking-wider">
                ኪንካ
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `touch-target px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              type="button"
              aria-label="Toggle Dark Mode"
              className="touch-target p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Cart Link */}
            <Link
              to="/cart"
              aria-label="Shopping Cart"
              className="touch-target p-2 relative text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ShoppingBag className="w-5 h-5" />
            </Link>

            {/* Sign in / Dashboard */}
            {token ? (
              <button
                onClick={() => navigate('/dashboard')}
                type="button"
                className="touch-target hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                Dashboard
              </button>
            ) : (
              <Link
                to="/login"
                className="touch-target hidden sm:inline-flex items-center justify-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open mobile menu"
              className="touch-target md:hidden p-2 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className="touch-target flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-slate-500">Language / ቋንቋ</span>
                <LanguageSwitcher />
              </div>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="touch-target w-full flex items-center justify-center px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-base shadow-sm"
              >
                Sign In / Register
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 mt-auto" data-testid="public-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/kinka-logo.png"
                  alt="Kinka Logo"
                  className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-amber-700/20"
                />
                <span className="font-bold text-lg text-emerald-950 dark:text-emerald-300">
                  Kinka
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-ethiopic font-semibold">
                  ኪንካ
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-ethiopic">
                የደቡብ ኦሞ አርሶ አደሮች፣ የቱሪዝም ድርጅቶች እና የሸማቾች ዲጂታል ድልድይ።
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Promoting ethical trade, community consent, and sustainable eco-tourism in South Omo, Ethiopia.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Eco-Tourism
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li><Link to="/tourism" className="hover:text-emerald-700">Tour Packages</Link></li>
                <li><Link to="/hotels" className="hover:text-emerald-700">Resorts & Lodges</Link></li>
                <li><Link to="/guides" className="hover:text-emerald-700">Local Certified Guides</Link></li>
                <li><Link to="/transport" className="hover:text-emerald-700">4WD Transport Services</Link></li>
                <li><Link to="/testimonials" className="hover:text-emerald-700">Visitor Stories & Reviews</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Local Products
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li><Link to="/products" className="hover:text-emerald-700">Wild Forest Honey</Link></li>
                <li><Link to="/products" className="hover:text-emerald-700">Organic Sesame & Grains</Link></li>
                <li><Link to="/products" className="hover:text-emerald-700">Handcrafted Beadwork</Link></li>
                <li><Link to="/trace/TRACE-HONEY-001" className="hover:text-emerald-700">Scan QR Traceability</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Community & Safety
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li><Link to="/safety-guidelines" className="hover:text-emerald-700">Cultural Etiquette & Photos</Link></li>
                <li><Link to="/about" className="hover:text-emerald-700">About Kinka</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-700">Contact & Support Desks</Link></li>
                <li><Link to="/design-tokens" className="hover:text-emerald-700">Design System & Amharic</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
            <p>© 2026 Kinka Platform. Built for South Omo Zone, Ethiopia.</p>
            <div className="flex gap-4">
              <span>English / አማርኛ</span>
              <span>USSD: *844#</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
