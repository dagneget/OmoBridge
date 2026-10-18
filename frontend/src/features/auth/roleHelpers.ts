/**
 * Role definitions and helper utilities for OmoBridge RBAC.
 */

export const Roles = {
  BUYER_VISITOR: 'BUYER_VISITOR',
  PRODUCER_FARMER: 'PRODUCER_FARMER',
  MICRO_ENTERPRISE: 'MICRO_ENTERPRISE',
  DELIVERY_PROVIDER: 'DELIVERY_PROVIDER',
  TOUR_GUIDE: 'TOUR_GUIDE',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  TOURISM_AUTHORITY: 'TOURISM_AUTHORITY',
} as const;

export type AppRole = (typeof Roles)[keyof typeof Roles];

/**
 * Normalizes role string to standard uppercase without 'ROLE_' prefix for comparison.
 */
export function normalizeRole(role: string): string {
  if (!role) return '';
  return role.replace(/^ROLE_/, '').toUpperCase();
}

/**
 * Checks if a user possesses the requested role.
 */
export function hasRole(userRoles: string[] | undefined, targetRole: string): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  const targetNorm = normalizeRole(targetRole);
  return userRoles.some((r) => normalizeRole(r) === targetNorm);
}

/**
 * Checks if a user possesses at least one of the specified roles.
 */
export function hasAnyRole(userRoles: string[] | undefined, targetRoles: string[]): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return targetRoles.some((tr) => hasRole(userRoles, tr));
}

/**
 * Determines the default home/dashboard route based on user roles.
 */
export function getDefaultDashboardRoute(roleOrRoles: string | string[] | undefined): string {
  if (!roleOrRoles) return '/';

  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];

  if (hasRole(roles, Roles.SYSTEM_ADMIN) || hasRole(roles, Roles.TOURISM_AUTHORITY)) {
    return '/dashboard/admin';
  }
  if (hasRole(roles, Roles.MICRO_ENTERPRISE)) {
    return '/dashboard/enterprise';
  }
  if (hasRole(roles, Roles.PRODUCER_FARMER)) {
    return '/dashboard/farmer';
  }
  if (hasRole(roles, Roles.DELIVERY_PROVIDER)) {
    return '/dashboard/delivery';
  }
  if (hasRole(roles, Roles.TOUR_GUIDE)) {
    return '/dashboard/guide';
  }
  if (hasRole(roles, Roles.BUYER_VISITOR)) {
    return '/account';
  }

  return '/dashboard';
}
