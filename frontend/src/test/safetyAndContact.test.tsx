import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SafetyGuidelinesPage from '../pages/public/SafetyGuidelinesPage';
import ContactPage from '../pages/public/ContactPage';
import AboutPage from '../pages/public/AboutPage';
import { tourismService } from '../features/tourism/tourismService';

const mockApiGuidelines = [
  {
    id: 'guide-api-1',
    title: 'Village Elder Photography Consent',
    category: 'CULTURAL',
    content: 'Always ask permission prior to capturing portraits in Hamer or Dasenech villages.',
    emergencyContacts: '+251 46 775 0123',
    displayOrder: 1,
    active: true,
  },
  {
    id: 'guide-api-2',
    title: 'Hydration in Savannah Heat',
    category: 'HEALTH',
    content: 'Drink at least 4 liters of water daily in Lower Omo.',
    emergencyContacts: '+251 46 775 0999',
    displayOrder: 2,
    active: true,
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('Safety Guidelines, Essential Info & Contact (F-308)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = createTestQueryClient();
  });

  describe('Safety Guidelines Page', () => {
    it('renders guidelines from API and displays categories and emergency hotlines', async () => {
      vi.spyOn(tourismService, 'getGuidelines').mockResolvedValue(mockApiGuidelines);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/safety-guidelines']}>
            <SafetyGuidelinesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByText('Village Elder Photography Consent')).toBeInTheDocument();
      expect(screen.getByText('Hydration in Savannah Heat')).toBeInTheDocument();
      expect(screen.getByText(/call \+251 911 000001/i)).toBeInTheDocument();
      expect(screen.getByText('+251 46 775 0123')).toBeInTheDocument();
    });

    it('filters guidelines by category tab and search input', async () => {
      vi.spyOn(tourismService, 'getGuidelines').mockResolvedValue(mockApiGuidelines);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/safety-guidelines']}>
            <SafetyGuidelinesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(await screen.findByText('Village Elder Photography Consent')).toBeInTheDocument();

      // Click Health & Hydration tab
      const healthTab = screen.getByRole('tab', { name: /health & hydration/i });
      fireEvent.click(healthTab);

      expect(screen.getByText('Hydration in Savannah Heat')).toBeInTheDocument();
      expect(screen.queryByText('Village Elder Photography Consent')).not.toBeInTheDocument();
    });
  });

  describe('Contact Page', () => {
    it('renders office hours, phone hotlines, USSD short code, and MapComponent', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/contact']}>
            <ContactPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Contact OmoBridge Support')).toBeInTheDocument();
      expect(screen.getByText('+251 911 000001')).toBeInTheDocument();
      expect(screen.getByText('support@omobridge.et')).toBeInTheDocument();
      expect(screen.getByText(/\*844#/)).toBeInTheDocument();
      expect(screen.getByText(/mon - sat: 08:00 - 18:00 eat/i)).toBeInTheDocument();
      expect(screen.getByTestId('map-component')).toBeInTheDocument();
    });

    it('validates contact form and displays success alert upon submission', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/contact']}>
            <ContactPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const nameInput = screen.getByPlaceholderText(/e\.g\. abebe bikila/i);
      const phoneInput = screen.getByPlaceholderText(/\+251 911 000000/i);
      const subjectInput = screen.getByPlaceholderText(/e\.g\. tour guide reservation/i);
      const messageInput = screen.getByPlaceholderText(/provide details about your experience/i);
      const submitBtn = screen.getByRole('button', { name: /send message/i });

      fireEvent.change(nameInput, { target: { value: 'Helena Vance' } });
      fireEvent.change(phoneInput, { target: { value: '+251911000005' } });
      fireEvent.change(subjectInput, { target: { value: 'Booking Inquiry for Evangadi Dance' } });
      fireEvent.change(messageInput, {
        target: { value: 'We are a party of 4 travelers looking for certified local guide details.' },
      });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('contact-success-alert')).toBeInTheDocument();
        expect(screen.getByText(/message sent successfully!/i)).toBeInTheDocument();
      });
    });
  });

  describe('About Page', () => {
    it('renders mission, dual-channel overview, ethical commitments, and partner institutions', () => {
      render(
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage />
        </MemoryRouter>
      );

      expect(screen.getByText('About OmoBridge')).toBeInTheDocument();
      expect(screen.getByText('Dual-Channel Inclusion')).toBeInTheDocument();
      expect(screen.getByText(/ussd & feature phones \(\*844#\)/i)).toBeInTheDocument();
      expect(screen.getByText('Modern PWA Web Experience')).toBeInTheDocument();
      expect(screen.getByText('Community Elder Sanction')).toBeInTheDocument();
      expect(screen.getByText('Dimeka Agro Cooperative Union')).toBeInTheDocument();
    });
  });
});
