import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JoinPage from '../pages/public/JoinPage';

describe('Join Kinka Page (F-209)', () => {
  it('renders all role registration options with descriptions and accurate route links', () => {
    render(
      <MemoryRouter initialEntries={['/join']}>
        <JoinPage />
      </MemoryRouter>
    );

    // Header
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/join kinka/i);
    expect(screen.getByText(/community-first digital platform/i)).toBeInTheDocument();

    // 1. Producer / Farmer
    expect(screen.getByText('Producer & Farmer')).toBeInTheDocument();
    expect(
      screen.getByText(/supply honey, moringa, sesame, and crops with full batch traceability/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/ussd \*844#/i)).toBeInTheDocument();
    const farmerLink = screen.getByRole('link', { name: /register as farmer/i });
    expect(farmerLink).toHaveAttribute('href', '/register/producer');

    // 2. Community Hub
    expect(screen.getByText('Local Community Hub')).toBeInTheDocument();
    expect(
      screen.getByText(/process harvest lots, manage inventory, publish products to buyers/i)
    ).toBeInTheDocument();
    const enterpriseLink = screen.getByRole('link', { name: /register community hub/i });
    expect(enterpriseLink).toHaveAttribute('href', '/register/enterprise');

    // 3. Delivery Courier
    expect(screen.getByText('Delivery Courier')).toBeInTheDocument();
    expect(
      screen.getByText(/earn by transporting agricultural goods and eco-tour supplies/i)
    ).toBeInTheDocument();
    const deliveryLink = screen.getByRole('link', { name: /register as courier/i });
    expect(deliveryLink).toHaveAttribute('href', '/register/delivery');

    // 4. Tour Guide
    expect(screen.getByText('Certified Tour Guide')).toBeInTheDocument();
    expect(
      screen.getByText(/host cultural heritage tours, hiking expeditions/i)
    ).toBeInTheDocument();
    const guideLink = screen.getByRole('link', { name: /register as guide/i });
    expect(guideLink).toHaveAttribute('href', '/register/guide');

    // 5. Buyer & Eco-Tourist
    expect(screen.getByText('Buyer & Eco-Tourist')).toBeInTheDocument();
    expect(
      screen.getByText(/purchase verified single-origin goods directly from local cooperatives/i)
    ).toBeInTheDocument();
    const buyerLink = screen.getByRole('link', { name: /create buyer account/i });
    expect(buyerLink).toHaveAttribute('href', '/register/buyer');

    // Existing user sign-in link
    const loginLink = screen.getByRole('link', { name: /sign in to your account/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('renders correctly within a 360px mobile viewport container', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/join']}>
        <div style={{ width: '360px' }}>
          <JoinPage />
        </div>
      </MemoryRouter>
    );

    const joinPage = container.querySelector('[data-testid="join-page"]');
    expect(joinPage).toBeInTheDocument();

    // Verify all 5 cards render in the 360px container
    expect(container.querySelector('[data-testid="role-card-producer"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="role-card-enterprise"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="role-card-delivery"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="role-card-guide"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="role-card-buyer"]')).toBeInTheDocument();
  });
});
