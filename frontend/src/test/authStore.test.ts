import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore, USER_STORAGE_KEY } from '../features/auth/authStore';
import { authService } from '../features/auth/authService';
import { TOKEN_STORAGE_KEY } from '../services/httpClient';
import { hasRole, hasAnyRole, getDefaultDashboardRoute, Roles } from '../features/auth/roleHelpers';

describe('Auth State & Token Handling (F-201)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: null,
    });
    vi.restoreAllMocks();
  });

  it('keeps session when localStorage already contains token and user profile on load', () => {
    const mockUser = {
      id: 'usr-123',
      fullName: 'Tolcha Gemeda',
      phoneNumber: '+251911223344',
      roles: ['ROLE_MICRO_ENTERPRISE'],
      status: 'ACTIVE' as const,
    };

    localStorage.setItem(TOKEN_STORAGE_KEY, 'mock-valid-token');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));

    // Update store state like page reload
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.setState({ token: 'mock-valid-token', isAuthenticated: true });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.fullName).toBe('Tolcha Gemeda');
    expect(state.activeRole).toBe('MICRO_ENTERPRISE');
  });

  it('bootstraps session by fetching /api/v1/auth/me', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'mock-jwt-token');

    const mockProfile = {
      id: 'usr-456',
      fullName: 'Abebe Bikila',
      phoneNumber: '+251922334455',
      roles: ['ROLE_TOUR_GUIDE'],
      status: 'ACTIVE' as const,
    };

    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockProfile);

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.fullName).toBe('Abebe Bikila');
    expect(state.activeRole).toBe('TOUR_GUIDE');
    expect(localStorage.getItem(USER_STORAGE_KEY)).toContain('Abebe Bikila');
  });

  it('clears session on bootstrap failure when token is expired/invalid', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'expired-token');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ fullName: 'Old User' }));

    vi.spyOn(authService, 'getCurrentUser').mockRejectedValue(new Error('401 Unauthorized'));

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('saves return path and logs out upon 401 unauthorized event', () => {
    useAuthStore.setState({
      token: 'jwt',
      isAuthenticated: true,
      user: { id: '1', fullName: 'Test' },
    });

    // Simulate location on protected route
    window.history.pushState({}, '', '/dashboard/enterprise/orders?status=PENDING');

    // Trigger 401 event dispatched by httpClient
    window.dispatchEvent(new CustomEvent('omobridge:auth-unauthorized'));

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(sessionStorage.getItem('omobridge_redirect')).toBe(
      '/dashboard/enterprise/orders?status=PENDING'
    );
  });

  it('role helpers correctly identify permissions and default dashboards', () => {
    const roles = ['ROLE_MICRO_ENTERPRISE', 'ROLE_PRODUCER_FARMER'];

    expect(hasRole(roles, Roles.MICRO_ENTERPRISE)).toBe(true);
    expect(hasRole(roles, 'MICRO_ENTERPRISE')).toBe(true);
    expect(hasRole(roles, 'PRODUCER_FARMER')).toBe(true);
    expect(hasRole(roles, Roles.TOUR_GUIDE)).toBe(false);

    expect(hasAnyRole(roles, [Roles.TOUR_GUIDE, Roles.MICRO_ENTERPRISE])).toBe(true);
    expect(hasAnyRole(roles, [Roles.SYSTEM_ADMIN])).toBe(false);

    expect(getDefaultDashboardRoute('ROLE_MICRO_ENTERPRISE')).toBe('/dashboard/enterprise');
    expect(getDefaultDashboardRoute('ROLE_PRODUCER_FARMER')).toBe('/dashboard/farmer');
    expect(getDefaultDashboardRoute('ROLE_DELIVERY_PROVIDER')).toBe('/dashboard/delivery');
    expect(getDefaultDashboardRoute('ROLE_TOUR_GUIDE')).toBe('/dashboard/guide');
    expect(getDefaultDashboardRoute('ROLE_SYSTEM_ADMIN')).toBe('/dashboard/admin');
    expect(getDefaultDashboardRoute('ROLE_BUYER_VISITOR')).toBe('/account');
    expect(getDefaultDashboardRoute(undefined)).toBe('/');
  });

  it('logout removes credentials from localStorage and resets store', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-123');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ fullName: 'User' }));

    useAuthStore.setState({
      token: 'token-123',
      isAuthenticated: true,
      user: { fullName: 'User' },
    });

    useAuthStore.getState().logout();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
