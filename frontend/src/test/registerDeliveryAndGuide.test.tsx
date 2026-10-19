import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterDeliveryPage from '../pages/auth/RegisterDeliveryPage';
import RegisterGuidePage from '../pages/auth/RegisterGuidePage';
import { authService } from '../features/auth/authService';
import { NormalizedApiError } from '../services/apiError';

describe('Delivery Provider & Tour Guide Registration (F-206)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Delivery Provider Registration', () => {
    it('submits valid delivery registration and shows pending approval screen', async () => {
      const mockAuthResponse = {
        accessToken: 'pending-token-delivery',
        user: {
          id: 'delivery-uuid-1',
          phoneNumber: '+251911445566',
          fullName: 'Kassahun Belay',
          roles: ['ROLE_DELIVERY_PROVIDER'],
          status: 'PENDING' as const,
        },
      };

      vi.spyOn(authService, 'registerDeliveryProvider').mockResolvedValue(mockAuthResponse);

      render(
        <MemoryRouter initialEntries={['/register/delivery']}>
          <RegisterDeliveryPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/full legal name/i), {
        target: { value: 'Kassahun Belay' },
      });
      fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
        target: { value: '0911445566' },
      });
      fireEvent.change(screen.getByLabelText(/account password/i), {
        target: { value: 'courierPass123' },
      });
      fireEvent.change(screen.getByLabelText(/vehicle type/i), {
        target: { value: 'MOTORCYCLE' },
      });
      fireEvent.change(screen.getByLabelText(/plate number/i), {
        target: { value: 'AA-3-98765' },
      });
      fireEvent.change(screen.getByLabelText(/primary service corridor/i), {
        target: { value: 'Jinka - Key Afer Route' },
      });

      fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

      await waitFor(() => {
        expect(authService.registerDeliveryProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: 'Kassahun Belay',
            phoneNumber: '+251911445566',
            password: 'courierPass123',
            vehicleType: 'MOTORCYCLE',
            vehiclePlateNumber: 'AA-3-98765',
            serviceArea: 'Jinka - Key Afer Route',
          })
        );
      });

      // Shows pending approval confirmation screen
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          /delivery application submitted: pending approval/i
        );
        expect(screen.getByText(/verification & route assignment/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /proceed to sign in/i })).toHaveAttribute(
          'href',
          '/login'
        );
      });
    });

    it('shows phone conflict error when provider number is already registered', async () => {
      vi.spyOn(authService, 'registerDeliveryProvider').mockRejectedValue(
        new NormalizedApiError({
          message: 'Phone number already registered',
          status: 409,
          fieldErrors: { phoneNumber: 'Phone number already in use' },
        })
      );

      render(
        <MemoryRouter initialEntries={['/register/delivery']}>
          <RegisterDeliveryPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/full legal name/i), {
        target: { value: 'Kassahun Belay' },
      });
      fireEvent.change(screen.getByLabelText(/mobile phone number/i), {
        target: { value: '0911445566' },
      });
      fireEvent.change(screen.getByLabelText(/account password/i), {
        target: { value: 'courierPass123' },
      });
      fireEvent.change(screen.getByLabelText(/primary service corridor/i), {
        target: { value: 'Jinka' },
      });

      fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

      await waitFor(() => {
        expect(screen.getByText(/phone number already in use/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tour Guide Registration', () => {
    it('submits valid guide registration with languages and shows pending certification screen', async () => {
      const mockAuthResponse = {
        accessToken: 'pending-token-guide',
        user: {
          id: 'guide-uuid-1',
          phoneNumber: '+251933556677',
          fullName: 'Basha Wado',
          roles: ['ROLE_TOUR_GUIDE'],
          status: 'PENDING' as const,
        },
      };

      vi.spyOn(authService, 'registerGuide').mockResolvedValue(mockAuthResponse);

      render(
        <MemoryRouter initialEntries={['/register/guide']}>
          <RegisterGuidePage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/^full name/i), {
        target: { value: 'Basha Wado' },
      });
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '0933556677' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'guidePass456' },
      });
      fireEvent.change(screen.getByLabelText(/tourism license \/ guide id/i), {
        target: { value: 'SNNPR-TG-2024-99' },
      });
      fireEvent.change(screen.getByLabelText(/daily guiding rate/i), {
        target: { value: '1800' },
      });

      // Toggle Hamer-Banna language tag
      const hamerBtn = screen.getByRole('button', { name: /hamer-banna/i });
      fireEvent.click(hamerBtn);

      fireEvent.click(screen.getByRole('button', { name: /submit guide application/i }));

      await waitFor(() => {
        expect(authService.registerGuide).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: 'Basha Wado',
            phoneNumber: '+251933556677',
            password: 'guidePass456',
            licenseNumber: 'SNNPR-TG-2024-99',
            dailyRate: 1800,
            languages: expect.arrayContaining(['English', 'Amharic', 'Hamer-Banna']),
          })
        );
      });

      // Shows pending certification confirmation screen
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          /guide application submitted: pending certification/i
        );
        expect(screen.getByText(/licensing & ethical guiding protocol/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /proceed to sign in/i })).toHaveAttribute(
          'href',
          '/login'
        );
      });
    });

    it('shows phone conflict error when guide number is already registered', async () => {
      vi.spyOn(authService, 'registerGuide').mockRejectedValue(
        new NormalizedApiError({
          message: 'Phone number already registered',
          status: 409,
          fieldErrors: { phoneNumber: 'Phone number already registered to a guide' },
        })
      );

      render(
        <MemoryRouter initialEntries={['/register/guide']}>
          <RegisterGuidePage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/^full name/i), {
        target: { value: 'Basha Wado' },
      });
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '0933556677' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'guidePass456' },
      });

      fireEvent.click(screen.getByRole('button', { name: /submit guide application/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/phone number already registered to a guide/i)
        ).toBeInTheDocument();
      });
    });
  });
});
