import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import AuthLayout from '../components/layout/AuthLayout';
import DashboardLayout from '../components/layout/DashboardLayout';
import NotFoundPage from '../pages/public/NotFoundPage';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Helper component that throws to test ErrorBoundary
function BuggyComponent(): never {
  throw new Error('Simulated intentional rendering failure');
}

describe('Routing, layouts, and ErrorBoundary (F-101)', () => {
  it('renders PublicLayout with brand, links, and outlet', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route
              index
              element={
                <div data-testid="public-content">Public Storefront</div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Kinka').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tourism')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByTestId('public-content')).toHaveTextContent(
      'Public Storefront',
    );
  });

  it('renders AuthLayout with centered card container and back link', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={<div data-testid="login-content">Login Form</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/back to home/i)).toBeInTheDocument();
    expect(screen.getByTestId('login-content')).toHaveTextContent('Login Form');
  });

  it('renders DashboardLayout with role navigation and sign out button', () => {
    localStorage.setItem(
      'omobridge_user',
      JSON.stringify({ role: 'ENTERPRISE', fullName: 'South Omo Coop' }),
    );

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route
              path="/dashboard"
              element={<div data-testid="dash-content">Enterprise View</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Community Hub')).toBeInTheDocument();
    expect(screen.getByText('Registered Farmers')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(screen.getByTestId('dash-content')).toHaveTextContent(
      'Enterprise View',
    );
  });

  it('renders NotFoundPage with 404 message and home link', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('catches thrown rendering error in ErrorBoundary and displays fallback', () => {
    // Suppress console.error during expected throw test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Simulated intentional rendering failure/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload page/i }),
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
