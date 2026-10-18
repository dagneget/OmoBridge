import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountPage, { LANGUAGE_STORAGE_KEY } from '../pages/account/AccountPage';
import AppRoutes from '../routes';
import { useAuthStore } from '../features/auth/authStore';
import { Roles } from '../features/auth/roleHelpers';

describe('Account & Profile (F-208)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({
      token: 'valid-test-token',
      user: {
        id: 'user-uuid-1',
        phoneNumber: '+251911223344',
        fullName: 'Barka Lomeri',
        email: 'barka@example.com',
        status: 'ACTIVE',
        preferredLanguage: 'en',
        roles: [Roles.PRODUCER_FARMER],
        farmerCode: 'SO-TUR-0042',
        enterpriseName: 'South Omo Honey Producers Coop',
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: Roles.PRODUCER_FARMER,
    });
  });

  it('renders user details, contact info, and linked enterprise and farmer profiles', () => {
    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/account & profile/i);
    expect(screen.getByText('Barka Lomeri')).toBeInTheDocument();
    expect(screen.getByText('+251911223344')).toBeInTheDocument();
    expect(screen.getByText('barka@example.com')).toBeInTheDocument();

    // Linked profiles
    expect(screen.getByText('South Omo Honey Producers Coop')).toBeInTheDocument();
    expect(screen.getByText(/farmer code: so-tur-0042/i)).toBeInTheDocument();
  });

  it('changes and persists language preference in localStorage and auth store', async () => {
    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    // Initial language is English
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();

    // Select Amharic (አማርኛ)
    const amharicBtn = screen.getByRole('radio', { name: /አማርኛ/i });
    expect(amharicBtn).toBeInTheDocument();

    fireEvent.click(amharicBtn);

    // Verify persistence in localStorage
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('am');

    // Verify authStore user updated
    expect(useAuthStore.getState().user?.preferredLanguage).toBe('am');

    // Verify UI confirmation
    await waitFor(() => {
      expect(screen.getByText(/language preference saved/i)).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated user accessing /account to /login', async () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: null,
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sign in to omobridge/i);
    });
    expect(sessionStorage.getItem('omobridge_redirect')).toBe('/account');
  });

  it('handles sign out and clears auth session', async () => {
    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
