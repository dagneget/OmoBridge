import { StrictMode } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthBootstrap, useAuthStore } from '../features/auth';
import { authService } from '../features/auth/authService';
import { TOKEN_STORAGE_KEY } from '../services/httpClient';
import type { UserProfileResponse } from '../types/api';
const originalBootstrap = useAuthStore.getState().bootstrap;
const first: UserProfileResponse = { id: 'buyer-a', roles: ['BUYER_VISITOR'] };
const second: UserProfileResponse = { id: 'buyer-b', roles: ['BUYER_VISITOR'] };
function Startup() { useAuthBootstrap(); return null; }
beforeEach(() => { localStorage.clear(); useAuthStore.setState({ token: null, user: null, isLoading: false, isAuthenticated: false, bootstrap: originalBootstrap }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); useAuthStore.setState({ bootstrap: originalBootstrap, token: null, user: null, isLoading: false, isAuthenticated: false }); });
describe('Shared session startup', () => {
  it('does not request a profile for an anonymous app visit', () => {
    const get = vi.spyOn(authService, 'getCurrentUser'); render(<Startup />); expect(get).not.toHaveBeenCalled();
  });
  it('deduplicates app and nested guard checks, including StrictMode', async () => {
    let resolve!: (value: UserProfileResponse) => void;
    const get = vi.spyOn(authService, 'getCurrentUser').mockReturnValue(new Promise((done) => { resolve = done; }));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-a'); useAuthStore.setState({ token: 'token-a', isLoading: true, isAuthenticated: true });
    render(<StrictMode><Startup /><Startup /><Startup /></StrictMode>);
    expect(get).toHaveBeenCalledOnce(); await act(async () => resolve(first));
    await waitFor(() => expect(useAuthStore.getState().isLoading).toBe(false)); expect(useAuthStore.getState().user).toEqual(first);
  });
  it('ignores a profile that arrives after logout', async () => {
    let resolve!: (value: UserProfileResponse) => void; vi.spyOn(authService, 'getCurrentUser').mockReturnValue(new Promise((done) => { resolve = done; }));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-a'); useAuthStore.setState({ token: 'token-a', isLoading: true, isAuthenticated: true }); render(<Startup />);
    act(() => useAuthStore.getState().logout()); await act(async () => resolve(first));
    expect(useAuthStore.getState().isAuthenticated).toBe(false); expect(useAuthStore.getState().user).toBeNull(); expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
  it('does not overwrite a newer login with an old startup profile', async () => {
    let resolve!: (value: UserProfileResponse) => void; vi.spyOn(authService, 'getCurrentUser').mockReturnValue(new Promise((done) => { resolve = done; }));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-a'); useAuthStore.setState({ token: 'token-a', isLoading: true, isAuthenticated: true }); render(<Startup />);
    act(() => useAuthStore.getState().setAuth({ accessToken: 'token-b', user: second })); await act(async () => resolve(first));
    expect(useAuthStore.getState().token).toBe('token-b'); expect(useAuthStore.getState().user).toEqual(second);
  });
  it('does not clear a newer login after an old profile request fails', async () => {
    let reject!: (error: Error) => void; vi.spyOn(authService, 'getCurrentUser').mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-a'); useAuthStore.setState({ token: 'token-a', isLoading: true, isAuthenticated: true }); render(<Startup />);
    act(() => useAuthStore.getState().setAuth({ accessToken: 'token-b', user: second })); await act(async () => reject(new Error('old request failed')));
    expect(useAuthStore.getState().token).toBe('token-b'); expect(useAuthStore.getState().user).toEqual(second);
  });
});
