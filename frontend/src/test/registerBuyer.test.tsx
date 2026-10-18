import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterBuyerPage from '../pages/auth/RegisterBuyerPage';
import { authService } from '../features/auth/authService';
import { useAuthStore } from '../features/auth/authStore';
import { NormalizedApiError } from '../services/apiError';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Buyer Registration (F-203)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    vi.restoreAllMocks();
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: null,
    });
  });

  it('submits valid registration, logs user in, and navigates to default/redirect destination', async () => {
    const mockAuthResponse = {
      accessToken: 'new-buyer-jwt',
      tokenType: 'Bearer',
      expiresInSeconds: 86400,
      user: {
        id: 'new-buyer-uuid',
        phoneNumber: '+251912345678',
        fullName: 'Meseret Defar',
        roles: ['ROLE_BUYER_VISITOR'],
        status: 'ACTIVE' as const,
      },
    };

    vi.spyOn(authService, 'registerBuyer').mockResolvedValue(mockAuthResponse);

    render(
      <MemoryRouter initialEntries={['/register/buyer']}>
        <RegisterBuyerPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Meseret Defar' },
    });
    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0912345678' },
    });
    fireEvent.change(screen.getByLabelText(/create password/i), {
      target: { value: 'securePass123' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'meseret@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /register & continue/i }));

    await waitFor(() => {
      expect(authService.registerBuyer).toHaveBeenCalledWith({
        fullName: 'Meseret Defar',
        phoneNumber: '+251912345678',
        password: 'securePass123',
        email: 'meseret@example.com',
        preferredLanguage: 'en',
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.fullName).toBe('Meseret Defar');
      expect(mockNavigate).toHaveBeenCalledWith('/products', { replace: true });
    });
  });

  it('handles duplicate phone number response (409 conflict) with clear inline error', async () => {
    vi.spyOn(authService, 'registerBuyer').mockRejectedValue(
      new NormalizedApiError({
        status: 409,
        message: 'Phone number is already registered in the system',
        fieldErrors: {
          phoneNumber: 'Phone number already registered',
        },
      })
    );

    render(
      <MemoryRouter initialEntries={['/register/buyer']}>
        <RegisterBuyerPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Meseret Defar' },
    });
    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0912345678' },
    });
    fireEvent.change(screen.getByLabelText(/create password/i), {
      target: { value: 'securePass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /register & continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /phone number already registered/i
      );
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
