import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
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

describe('Login Page (F-202)', () => {
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

  it('renders phone and password fields and submits valid credentials', async () => {
    const mockAuthResponse = {
      accessToken: 'test-jwt-token',
      tokenType: 'Bearer',
      expiresInSeconds: 86400,
      user: {
        id: 'user-enterprise-1',
        phoneNumber: '+251911223344',
        fullName: 'Omo Valley Honey Enterprise',
        roles: ['ROLE_MICRO_ENTERPRISE'],
        status: 'ACTIVE' as const,
      },
    };

    vi.spyOn(authService, 'login').mockResolvedValue(mockAuthResponse);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const phoneInput = screen.getByLabelText(/mobile phone number/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(phoneInput, { target: { value: '0911223344' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        phoneNumber: '+251911223344',
        password: 'secret123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/enterprise', { replace: true });
    });
  });

  it('redirects to the query parameter redirect url if present', async () => {
    const mockAuthResponse = {
      accessToken: 'token-buyer',
      user: {
        id: 'buyer-1',
        fullName: 'Tourist Alex',
        roles: ['ROLE_BUYER_VISITOR'],
        status: 'ACTIVE' as const,
      },
    };

    vi.spyOn(authService, 'login').mockResolvedValue(mockAuthResponse);

    render(
      <MemoryRouter initialEntries={['/login?redirect=/checkout']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0911223344' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/checkout', { replace: true });
    });
  });

  it('displays error message on 401 Bad Credentials response', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      new NormalizedApiError({
        status: 401,
        message: 'Invalid phone or password',
        errorCode: 'BAD_CREDENTIALS',
      })
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0911223344' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /invalid phone number or password/i
      );
    });
  });

  it('displays rate limiting / throttling countdown and disables submit on 429 response', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      new NormalizedApiError({
        status: 429,
        message: 'Too many login attempts',
        retryAfterSeconds: 30,
      })
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0911223344' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/security cooldown active/i);
      expect(screen.getByRole('button', { name: /wait \(30s\)/i })).toBeDisabled();
    });
  });

  it('displays pending account message if account is awaiting verification', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      new NormalizedApiError({
        status: 403,
        errorCode: 'ACCOUNT_PENDING',
        message: 'Account is pending approval',
      })
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0911223344' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/pending verification/i);
    });
  });

  it('displays suspended account alert on suspended status', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      new NormalizedApiError({
        status: 403,
        errorCode: 'ACCOUNT_SUSPENDED',
        message: 'Your account is suspended',
      })
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0911223344' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/has been suspended/i);
    });
  });
});
