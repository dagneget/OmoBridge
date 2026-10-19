import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { hasAnyRole } from '../features/auth/roleHelpers';

export interface RoleGuardProps {
  allowedRoles?: string[];
  requireAuth?: boolean;
  children?: React.ReactNode;
}

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-label="Loading verification">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function RoleGuard({
  allowedRoles,
  requireAuth = true,
  children,
}: RoleGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  // 1. Authentication check
  if (requireAuth && !isAuthenticated) {
    const fullPath = location.pathname + location.search;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('omobridge_redirect', fullPath);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role authorization check
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles || [];
    const isAuthorized = hasAnyRole(userRoles, allowedRoles);

    if (!isAuthorized) {
      return (
        <Navigate
          to="/forbidden"
          state={{ from: location, requiredRoles: allowedRoles }}
          replace
        />
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
