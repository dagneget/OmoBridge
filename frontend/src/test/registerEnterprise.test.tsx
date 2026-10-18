import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterEnterprisePage from '../pages/auth/RegisterEnterprisePage';
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

describe('Enterprise Registration (F-205)', () => {
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

  it('submits valid enterprise registration, stores session, and routes to /dashboard/enterprise', async () => {
    const mockAuthResponse = {
      accessToken: 'enterprise-jwt-token',
      tokenType: 'Bearer',
      expiresInSeconds: 86400,
      user: {
        id: 'ent-uuid-1',
        phoneNumber: '+251911445566',
        fullName: 'Tolcha Gemeda',
        enterpriseName: 'Omo Valley Honey Union',
        roles: ['ROLE_MICRO_ENTERPRISE'],
        status: 'ACTIVE' as const,
      },
    };

    vi.spyOn(authService, 'registerEnterprise').mockResolvedValue(mockAuthResponse);

    render(
      <MemoryRouter initialEntries={['/register/enterprise']}>
        <RegisterEnterprisePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/enterprise \/ cooperative name/i), {
      target: { value: 'Omo Valley Honey Union' },
    });
    fireEvent.change(screen.getByLabelText(/authorized representative name/i), {
      target: { value: 'Tolcha Gemeda' },
    });
    fireEvent.change(screen.getByLabelText(/primary business phone number/i), {
      target: { value: '0911445566' },
    });
    fireEvent.change(screen.getByLabelText(/account password/i), {
      target: { value: 'unionPass123' },
    });
    fireEvent.change(screen.getByLabelText(/town \/ center/i), {
      target: { value: 'Turmi' },
    });

    fireEvent.click(screen.getByRole('button', { name: /register enterprise & open dashboard/i }));

    await waitFor(() => {
      expect(authService.registerEnterprise).toHaveBeenCalledWith(
        expect.objectContaining({
          enterpriseName: 'Omo Valley Honey Union',
          fullName: 'Tolcha Gemeda',
          phoneNumber: '+251911445566',
          password: 'unionPass123',
          locationWoreda: 'Hamer',
          locationTown: 'Turmi',
          preferredLanguage: 'en',
        })
      );
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.enterpriseName).toBe('Omo Valley Honey Union');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/enterprise', { replace: true });
    });
  });

  it('handles duplicate phone number response with field error', async () => {
    vi.spyOn(authService, 'registerEnterprise').mockRejectedValue(
      new NormalizedApiError({
        status: 409,
        message: 'This phone number is already registered to an enterprise or user.',
      })
    );

    render(
      <MemoryRouter initialEntries={['/register/enterprise']}>
        <RegisterEnterprisePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/enterprise \/ cooperative name/i), {
      target: { value: 'Omo Valley Honey Union' },
    });
    fireEvent.change(screen.getByLabelText(/authorized representative name/i), {
      target: { value: 'Tolcha Gemeda' },
    });
    fireEvent.change(screen.getByLabelText(/primary business phone number/i), {
      target: { value: '0911445566' },
    });
    fireEvent.change(screen.getByLabelText(/account password/i), {
      target: { value: 'unionPass123' },
    });
    fireEvent.change(screen.getByLabelText(/town \/ center/i), {
      target: { value: 'Turmi' },
    });

    fireEvent.click(screen.getByRole('button', { name: /register enterprise & open dashboard/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /already registered to an enterprise/i
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
