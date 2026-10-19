import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterProducerPage from '../pages/auth/RegisterProducerPage';
import { authService } from '../features/auth/authService';
import { NormalizedApiError } from '../services/apiError';

describe('Producer / Farmer Registration (F-204)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('submits valid producer registration and renders the pending approval explanation screen', async () => {
    const mockAuthResponse = {
      accessToken: 'pending-token',
      user: {
        id: 'producer-uuid-1',
        phoneNumber: '+251922334455',
        fullName: 'Barka Lomeri',
        roles: ['ROLE_PRODUCER_FARMER'],
        status: 'PENDING' as const,
      },
    };

    vi.spyOn(authService, 'registerProducer').mockResolvedValue(mockAuthResponse);

    render(
      <MemoryRouter initialEntries={['/register/producer']}>
        <RegisterProducerPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/farmer full name/i), {
      target: { value: 'Barka Lomeri' },
    });
    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0922334455' },
    });
    fireEvent.change(screen.getByLabelText(/account password/i), {
      target: { value: 'farmerPass123' },
    });
    fireEvent.change(screen.getByLabelText(/village \(origin\)/i), {
      target: { value: 'Turmi' },
    });
    fireEvent.change(screen.getByLabelText(/^kebele/i), {
      target: { value: 'Kebele 02' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(authService.registerProducer).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Barka Lomeri',
          phoneNumber: '+251922334455',
          password: 'farmerPass123',
          village: 'Turmi',
          kebele: 'Kebele 02',
          preferredLanguage: 'am',
          consentPublicName: true,
        })
      );
    });

    // Confirmation pending approval screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        /application submitted: pending approval/i
      );
      expect(screen.getByText(/what happens next\?/i)).toBeInTheDocument();
      expect(screen.getByText(/ussd feature phone access/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed to sign in/i })).toBeInTheDocument();
    });
  });

  it('handles duplicate phone number response with field error', async () => {
    vi.spyOn(authService, 'registerProducer').mockRejectedValue(
      new NormalizedApiError({
        status: 409,
        message: 'This phone number is already registered to a producer or enterprise.',
      })
    );

    render(
      <MemoryRouter initialEntries={['/register/producer']}>
        <RegisterProducerPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/farmer full name/i), {
      target: { value: 'Barka Lomeri' },
    });
    fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
      target: { value: '0922334455' },
    });
    fireEvent.change(screen.getByLabelText(/account password/i), {
      target: { value: 'farmerPass123' },
    });
    fireEvent.change(screen.getByLabelText(/village \(origin\)/i), {
      target: { value: 'Turmi' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /already registered to a producer/i
      );
      expect(screen.queryByText(/application submitted: pending approval/i)).not.toBeInTheDocument();
    });
  });
});
