import { create } from 'zustand';
import type { UserProfileResponse, AuthResponse } from '../../types/api';
import { TOKEN_STORAGE_KEY } from '../../services/httpClient';
import { authService } from './authService';
import { normalizeRole } from './roleHelpers';

export const USER_STORAGE_KEY = 'omobridge_user';

export interface AuthState {
  token: string | null;
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: string | null;

  setAuth: (response: AuthResponse) => void;
  setUser: (user: UserProfileResponse | null) => void;
  setActiveRole: (role: string) => void;
  bootstrap: () => Promise<void>;
  logout: () => void;
}

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

const getInitialUser = (): UserProfileResponse | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for unauthorized 401 events dispatched by httpClient
  if (typeof window !== 'undefined') {
    window.addEventListener('omobridge:auth-unauthorized', () => {
      // Save return URL before clearing
      const currentPath = window.location.pathname + window.location.search;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/auth')) {
        sessionStorage.setItem('omobridge_redirect', currentPath);
      }
      get().logout();
    });
  }

  const initialToken = getInitialToken();
  const initialUser = getInitialUser();

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: !!initialToken,
    isLoading: !!initialToken && !initialUser,
    activeRole: initialUser?.roles?.[0] ? normalizeRole(initialUser.roles[0]) : null,

    setAuth: (response: AuthResponse) => {
      const token = response.accessToken || null;
      const user = response.user || null;
      const primaryRole = user?.roles?.[0] ? normalizeRole(user.roles[0]) : null;

      if (token && typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      if (user && typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }

      set({
        token,
        user,
        isAuthenticated: !!token,
        isLoading: false,
        activeRole: primaryRole,
      });
    },

    setUser: (user: UserProfileResponse | null) => {
      if (user && typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      const primaryRole = user?.roles?.[0] ? normalizeRole(user.roles[0]) : null;
      set({
        user,
        activeRole: primaryRole,
      });
    },

    setActiveRole: (role: string) => {
      set({ activeRole: normalizeRole(role) });
    },

    bootstrap: async () => {
      const currentToken = getInitialToken();
      if (!currentToken) {
        set({ isAuthenticated: false, isLoading: false, user: null, activeRole: null });
        return;
      }

      set({ isLoading: true });
      try {
        const user = await authService.getCurrentUser();
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        }
        const primaryRole = user?.roles?.[0] ? normalizeRole(user.roles[0]) : null;
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          activeRole: primaryRole,
        });
      } catch {
        // If /me failed, token is invalid or expired
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          activeRole: null,
        });
      }
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        activeRole: null,
      });
    },
  };
});

export default useAuthStore;
