import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '../../components/common';
import { useAuthStore } from '../../features/auth/authStore';
import { getDefaultDashboardRoute, normalizeRole } from '../../features/auth/roleHelpers';

export default function ForbiddenPage() {
  const { user, activeRole, setActiveRole, logout } = useAuthStore();
  const navigate = useNavigate();

  const userRoles = (user?.roles || []).map(normalizeRole);
  const homeDashboard = getDefaultDashboardRoute(user?.roles);

  const handleSwitchRole = (role: string) => {
    setActiveRole(role);
    const targetRoute = getDefaultDashboardRoute(role);
    navigate(targetRoute);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in py-8">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>

        {/* Heading & Status */}
        <div className="space-y-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive uppercase tracking-wider">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You do not have the required role or permissions to view this section of OmoBridge.
          </p>
        </div>

        {/* User Context & Role Switcher if multi-role */}
        {user && (
          <div className="p-4 rounded-xl border border-border bg-muted/40 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Signed in as:</span>
              <span className="font-semibold text-foreground">{user.fullName || user.phoneNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Active Role:</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                {activeRole || userRoles[0] || 'BUYER_VISITOR'}
              </span>
            </div>

            {userRoles.length > 1 && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  Switch to an authorized role:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {userRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleSwitchRole(role)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        activeRole === role
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted text-foreground border-border'
                      }`}
                    >
                      {role.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {user ? (
            <Link to={homeDashboard} className="block w-full">
              <Button variant="primary" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Go to My Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login" className="block w-full">
              <Button variant="primary" className="w-full">
                Sign In to OmoBridge
              </Button>
            </Link>
          )}

          <div className="flex gap-2">
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Home
              </Button>
            </Link>
            {user && (
              <Button variant="ghost" onClick={handleLogout} className="flex-1 text-destructive hover:text-destructive">
                <LogOut className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
