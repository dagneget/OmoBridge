import { useAuthStore } from '../../features/auth/authStore';
import { normalizeRole, getDefaultDashboardRoute, Roles } from '../../features/auth/roleHelpers';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  [Roles.MICRO_ENTERPRISE]: 'Micro Enterprise',
  [Roles.PRODUCER_FARMER]: 'Producer / Farmer',
  [Roles.DELIVERY_PROVIDER]: 'Delivery Provider',
  [Roles.TOUR_GUIDE]: 'Tour Guide',
  [Roles.SYSTEM_ADMIN]: 'System Admin',
  [Roles.TOURISM_AUTHORITY]: 'Tourism Authority',
  [Roles.BUYER_VISITOR]: 'Buyer / Visitor',
};

export default function RoleSwitcher() {
  const { user, activeRole, setActiveRole } = useAuthStore();
  const navigate = useNavigate();

  if (!user || !user.roles || user.roles.length <= 1) {
    return null;
  }

  const normalizedUserRoles = user.roles.map(normalizeRole);
  const currentRole = activeRole ? normalizeRole(activeRole) : normalizedUserRoles[0];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setActiveRole(selected);
    const destination = getDefaultDashboardRoute(selected);
    navigate(destination);
  };

  return (
    <div className="flex max-w-full min-w-0 items-center gap-1.5 bg-muted/60 hover:bg-muted focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 border border-border px-2.5 py-1 rounded-lg text-xs transition-colors">
      <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
      <label htmlFor="role-switcher-select" className="sr-only">
        Switch Active Role
      </label>
      <select
        id="role-switcher-select"
        value={currentRole}
        onChange={handleRoleChange}
        className="min-h-[44px] min-w-0 max-w-full bg-transparent font-medium text-foreground focus:outline-none cursor-pointer pr-1"
        aria-label="Switch Active Role"
      >
        {normalizedUserRoles.map((role) => (
          <option key={role} value={role} className="bg-background text-foreground">
            {ROLE_DISPLAY_NAMES[role] || role.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
