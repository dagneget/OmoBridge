import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Star, UserCircle } from 'lucide-react';
import GuideBookingsPage from './guide/GuideBookingsPage';
import GuideProfilePage from './guide/GuideProfilePage';
import GuideReviewsPage from './guide/GuideReviewsPage';

/**
 * F-1201..F-1203 guide dashboard.
 *
 * The shared router already maps both `/dashboard/guide` and `/dashboard/guide/*`
 * to this component behind a TOUR_GUIDE RoleGuard, so the sections are selected
 * from the current path here. That keeps `routes/index.tsx` and the shared
 * layout untouched — Codex owns both; see docs/handoffs/F-1201.md.
 */
type Section = 'bookings' | 'profile' | 'reviews' | 'calendar' | 'unknown';

const resolveSection = (pathname: string): Section => {
  if (/^\/dashboard\/guide\/?$/.test(pathname) || pathname.endsWith('/bookings')) return 'bookings';
  if (pathname.endsWith('/profile')) return 'profile';
  if (pathname.endsWith('/reviews')) return 'reviews';
  if (pathname.endsWith('/sessions')) return 'calendar';
  return 'unknown';
};

const SECTIONS = [
  { key: 'bookings', label: 'Assigned Tours', to: '/dashboard/guide', icon: CalendarDays },
  { key: 'profile', label: 'My Profile', to: '/dashboard/guide/profile', icon: UserCircle },
  { key: 'reviews', label: 'Reviews', to: '/dashboard/guide/reviews', icon: Star },
] as const;

export default function GuideDashboardPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const section = resolveSection(pathname);
  const activeKey = section === 'calendar' || section === 'unknown' ? 'bookings' : section;

  return (
    <div className="space-y-6" data-testid="guide-dashboard">
      <div>
        <h1 className="text-2xl font-bold">Tour Guide Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review booked cultural excursions, client counts, and maintain your guide profile.
        </p>
      </div>

      <nav
        aria-label="Guide dashboard sections"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {SECTIONS.map(({ key, label, to, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(to)}
            aria-current={activeKey === key ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeKey === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`guide-tab-${key}`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {section === 'bookings' && <GuideBookingsPage />}
      {section === 'profile' && <GuideProfilePage />}
      {section === 'reviews' && <GuideReviewsPage />}

      {section === 'calendar' && (
        <div className="p-8 text-center border border-dashed border-border rounded-xl" data-testid="guide-calendar-placeholder">
          <CalendarDays className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground mt-3">Availability calendar</p>
          <p className="text-sm text-muted-foreground mt-1">
            Managing working days is not part of this release. Set your availability from My Profile.
          </p>
        </div>
      )}

      {section === 'unknown' && (
        <div className="p-8 text-center border border-dashed border-border rounded-xl" data-testid="guide-unknown-section">
          <p className="text-sm font-medium text-foreground">Section not found</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/guide')}
            className="touch-target mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Back to assigned tours
          </button>
        </div>
      )}
    </div>
  );
}
