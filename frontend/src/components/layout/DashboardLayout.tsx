import { useState, Suspense } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Layers,
  Sprout,
  Truck,
  Compass,
  ShieldAlert,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Users,
  Home,
  CheckCircle,
} from 'lucide-react';
import { OfflineBanner } from '../common/OfflineBanner';
import RoleSwitcher from '../common/RoleSwitcher';
import { useAuthStore } from '../../features/auth/authStore';
import { normalizeRole, Roles } from '../../features/auth/roleHelpers';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, activeRole, logout } = useAuthStore();

  const userRoles = (
    user?.roles || ((user as any)?.role ? [(user as any).role] : [])
  ).map(normalizeRole);
  const currentRole = activeRole
    ? normalizeRole(activeRole)
    : userRoles[0] || normalizeRole((user as any)?.role || '') || Roles.MICRO_ENTERPRISE;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav menus by role
  const getNavItems = () => {
    switch (currentRole) {
      case Roles.PRODUCER_FARMER:
      case 'PRODUCER':
        return [
          { to: '/dashboard/farmer', label: 'Farmer Overview', icon: Sprout },
          { to: '/dashboard/farmer/deliveries', label: 'My Crop Deliveries', icon: Package },
          { to: '/dashboard/farmer/payables', label: 'Earnings & Balances', icon: DollarSign },
          { to: '/dashboard/farmer/ussd', label: 'USSD Fast Access (*844#)', icon: FileText },
        ];
      case Roles.DELIVERY_PROVIDER:
        return [
          { to: '/dashboard/delivery', label: 'Delivery Jobs', icon: Truck },
          { to: '/dashboard/delivery/active', label: 'Active Route & GPS', icon: Compass },
          { to: '/dashboard/delivery/sync', label: 'Offline Sync Queue', icon: CheckCircle },
        ];
      case Roles.TOUR_GUIDE:
        return [
          { to: '/dashboard/guide', label: 'Assigned Tours', icon: Compass },
          { to: '/dashboard/guide/sessions', label: 'Availability Calendar', icon: Calendar },
        ];
      case Roles.SYSTEM_ADMIN:
      case Roles.TOURISM_AUTHORITY:
      case 'ADMIN':
        return [
          { to: '/dashboard/admin', label: 'Admin Oversight', icon: ShieldAlert },
          { to: '/dashboard/admin/approvals', label: 'Provider Approvals', icon: CheckCircle },
          { to: '/dashboard/admin/users', label: 'User Directory', icon: Users },
        ];
      case Roles.MICRO_ENTERPRISE:
      case 'ENTERPRISE':
      default:
        return [
          { to: '/dashboard/enterprise', label: 'Enterprise Hub', icon: Layers },
          { to: '/dashboard/enterprise/farmers', label: 'Registered Farmers', icon: Users },
          { to: '/dashboard/enterprise/supply', label: 'Supply Intake', icon: Package },
          { to: '/dashboard/enterprise/inventory', label: 'Inventory Lots', icon: Home },
          { to: '/dashboard/enterprise/production', label: 'Production Batches', icon: Layers },
          { to: '/dashboard/enterprise/products', label: 'Catalog Products', icon: Package },
          { to: '/dashboard/enterprise/payments', label: 'Farmer Disbursements', icon: DollarSign },
          { to: '/dashboard/enterprise/reports', label: 'AI Impact Reports', icon: FileText },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold">
              O
            </div>
            <div>
              <span className="font-bold text-base text-emerald-950 dark:text-emerald-300 block leading-tight">
                OmoBridge
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                {currentRole.replace(/_/g, ' ')}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden touch-target p-1 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === `/dashboard/${currentRole.toLowerCase()}` || to === '/dashboard/enterprise'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `touch-target flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {user && (
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block">Signed in as:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                {user.fullName || user.phoneNumber}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="touch-target w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar menu"
              className="md:hidden touch-target p-2 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold capitalize text-slate-800 dark:text-slate-100">
              {currentRole.replace(/_/g, ' ').toLowerCase()} Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <RoleSwitcher />
            <Link
              to="/"
              className="touch-target text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Storefront
            </Link>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
