import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '../routes';
import { useAuthStore } from '../features/auth/authStore';
import { Roles } from '../features/auth/roleHelpers';

describe('Route Guards, Role Navigation & 403 Forbidden (F-207)', () => {
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
  });

  it('redirects unauthenticated user accessing /dashboard to /login and preserves destination', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/enterprise']}>
        <AppRoutes />
      </MemoryRouter>
    );

    // Redirected to login page
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sign in to omobridge/i);
    });

    // Check redirect preserved in sessionStorage
    expect(sessionStorage.getItem('omobridge_redirect')).toBe('/dashboard/enterprise');
  });

  it('allows access when user possesses the required role', async () => {
    useAuthStore.setState({
      token: 'valid-farmer-token',
      user: {
        id: 'farmer-uuid-1',
        phoneNumber: '+251911000002',
        fullName: 'Barka Lomeri',
        roles: [Roles.PRODUCER_FARMER],
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: Roles.PRODUCER_FARMER,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/farmer']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Farmer Overview')).toBeInTheDocument();
      expect(screen.getByText('My Crop Deliveries')).toBeInTheDocument();
    });
  });

  it('redirects user with wrong role to /forbidden page', async () => {
    // User is a Farmer, but tries to access Enterprise dashboard
    useAuthStore.setState({
      token: 'valid-farmer-token',
      user: {
        id: 'farmer-uuid-1',
        phoneNumber: '+251911000002',
        fullName: 'Barka Lomeri',
        roles: [Roles.PRODUCER_FARMER],
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: Roles.PRODUCER_FARMER,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/enterprise']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/access restricted/i);
      expect(screen.getByText(/403 forbidden/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go to my dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard/farmer'
      );
    });
  });

  it('handles role switching for multi-role users in RoleSwitcher', async () => {
    useAuthStore.setState({
      token: 'multi-role-token',
      user: {
        id: 'user-multi-1',
        phoneNumber: '+251911000005',
        fullName: 'Multi Role User',
        roles: [Roles.MICRO_ENTERPRISE, Roles.TOUR_GUIDE],
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: Roles.MICRO_ENTERPRISE,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/enterprise']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Hub')).toBeInTheDocument();
    });

    // Check RoleSwitcher presence and switch to Tour Guide
    const roleSelect = screen.getByLabelText(/switch active role/i);
    expect(roleSelect).toBeInTheDocument();

    fireEvent.change(roleSelect, { target: { value: Roles.TOUR_GUIDE } });

    await waitFor(() => {
      expect(useAuthStore.getState().activeRole).toBe(Roles.TOUR_GUIDE);
      expect(screen.getByText('Assigned Tours')).toBeInTheDocument();
      expect(screen.getByText('Availability Calendar')).toBeInTheDocument();
    });
  });

  it('navigates to /forbidden when backend responds with 403 Forbidden', async () => {
    useAuthStore.setState({
      token: 'valid-buyer-token',
      user: {
        id: 'buyer-uuid-1',
        phoneNumber: '+251911000001',
        fullName: 'Abebe Buyer',
        roles: [Roles.BUYER_VISITOR],
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: Roles.BUYER_VISITOR,
    });

    render(
      <MemoryRouter initialEntries={['/products']}>
        <AppRoutes />
      </MemoryRouter>
    );

    // Simulate backend 403 Forbidden event dispatched by httpClient
    act(() => {
      window.dispatchEvent(
        new CustomEvent('omobridge:auth-forbidden', {
          detail: { status: 403, message: 'Access Denied: Enterprise Admin required' },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/access restricted/i);
      expect(screen.getByText(/403 forbidden/i)).toBeInTheDocument();
    });
  });
});
