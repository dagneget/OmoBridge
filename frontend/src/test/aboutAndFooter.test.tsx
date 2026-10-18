import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AboutPage from '../pages/public/AboutPage';
import PublicLayout from '../components/layout/PublicLayout';

describe('About and footer (F-310)', () => {
  it('renders About page with hero, dual-channel architecture, and ethical commitments', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <AboutPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('about-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /About OmoBridge/i })).toBeInTheDocument();
    expect(screen.getByText(/Dual-Channel Inclusion/i)).toBeInTheDocument();
    expect(screen.getByText(/USSD & Feature Phones \(\*844#\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Modern PWA Web Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Community Elder Sanction/i)).toBeInTheDocument();
    expect(screen.getByText(/Verifiable Traceability/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct Local Livelihoods/i)).toBeInTheDocument();
  });

  it('renders institutional partners and cooperative mentions on About page', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <AboutPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Institutional Partners & Cooperative Unions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dimeka Agro Cooperative Union/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/South Omo Tourism Department/i)).toBeInTheDocument();
    expect(screen.getByText(/Jinka Agricultural Research Institute/i)).toBeInTheDocument();
  });

  it('renders navigation CTAs linking to tourism, safety, and contact', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <AboutPage />
      </MemoryRouter>
    );

    const tourLink = screen.getByRole('link', { name: /Explore Cultural Experiences/i });
    expect(tourLink).toHaveAttribute('href', '/tourism');

    const safetyLink = screen.getByRole('link', { name: /Read Safety & Cultural Etiquette/i });
    expect(safetyLink).toHaveAttribute('href', '/safety-guidelines');

    const contactLink = screen.getByRole('link', { name: /Contact Support Desks/i });
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  it('renders persistent footer with all section links and USSD shortcode in PublicLayout', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<div>Home Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const footer = screen.getByTestId('public-footer');
    expect(footer).toBeInTheDocument();

    // Check footer columns
    expect(screen.getByText('Eco-Tourism')).toBeInTheDocument();
    expect(screen.getByText('Local Products')).toBeInTheDocument();
    expect(screen.getByText('Community & Safety')).toBeInTheDocument();

    // Check footer specific links
    expect(screen.getByRole('link', { name: /Tour Packages/i })).toHaveAttribute('href', '/tourism');
    expect(screen.getByRole('link', { name: /Resorts & Lodges/i })).toHaveAttribute('href', '/hotels');
    expect(screen.getByRole('link', { name: /Local Certified Guides/i })).toHaveAttribute('href', '/guides');
    expect(screen.getByRole('link', { name: /4WD Transport Services/i })).toHaveAttribute('href', '/transport');
    expect(screen.getByRole('link', { name: /Visitor Stories & Reviews/i })).toHaveAttribute('href', '/testimonials');
    expect(screen.getByRole('link', { name: /Wild Forest Honey/i })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: /Cultural Etiquette & Photos/i })).toHaveAttribute(
      'href',
      '/safety-guidelines'
    );
    expect(screen.getByRole('link', { name: /About OmoBridge/i })).toHaveAttribute('href', '/about');

    // Check Amharic text and USSD
    expect(screen.getByText(/የደቡብ ኦሞ አርሶ አደሮች፣ የቱሪዝም ድርጅቶች እና የሸማቾች ዲጂታል ድልድይ።/i)).toBeInTheDocument();
    expect(screen.getByText(/USSD: \*844#/i)).toBeInTheDocument();
  });
});
