import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuthStore } from '../features/auth';
import i18n from '../i18n';
let resize: ((event: { matches: boolean }) => void) | undefined;
let wide = false;
function show(path = '/dashboard/enterprise') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard/enterprise"
            element={<h2>Enterprise content</h2>}
          />
          <Route
            path="/dashboard/enterprise/farmers"
            element={<h2>Farmers content</h2>}
          />
        </Route>
        <Route path="/" element={<Outlet />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(async () => {
  wide = false;
  useAuthStore.setState({
    user: {
      id: 'enterprise',
      fullName: 'Cooperative name',
      roles: ['MICRO_ENTERPRISE'],
    },
    activeRole: 'MICRO_ENTERPRISE',
    token: 'demo',
    isAuthenticated: true,
    isLoading: false,
  });
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return wide;
    },
    addEventListener: (_type: string, listener: typeof resize) => {
      resize = listener;
    },
    removeEventListener: vi.fn(),
  }));
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.style.overflow = '';
});
describe('responsive dashboard navigation', () => {
  it('keeps closed mobile navigation inert and exposes its toggle state', () => {
    show();
    expect(document.querySelector('aside')).toHaveAttribute('inert');
    expect(
      screen.getByRole('button', { name: 'Open sidebar menu' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
  it('focuses the drawer, traps keyboard focus, and returns it on Escape', () => {
    show();
    const toggle = screen.getByRole('button', { name: 'Open sidebar menu' });
    fireEvent.click(toggle);
    const drawer = screen.getByRole('dialog', { name: 'Dashboard navigation' });
    expect(
      within(drawer).getByRole('button', { name: 'Close sidebar' }),
    ).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    const first = within(drawer).getByRole('link', { name: /Kinka/ });
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(
      within(drawer).getByRole('button', { name: 'Sign Out' }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
  it('closes mobile navigation after selecting a page', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar menu' }));
    fireEvent.click(screen.getByRole('link', { name: 'Registered Farmers' }));
    expect(
      screen.getByRole('heading', { name: 'Farmers content' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('releases the scroll lock and drawer semantics when switching to desktop', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar menu' }));
    act(() => {
      wide = true;
      resize?.({ matches: true });
    });
    expect(document.querySelector('aside')).not.toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });
  it('marks only the selected sidebar entry as current', () => {
    wide = true;
    show('/dashboard/enterprise/farmers');
    expect(
      screen.getByRole('link', { name: 'Community Hub' }),
    ).not.toHaveAttribute('aria-current');
    expect(
      screen.getByRole('link', { name: 'Registered Farmers' }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
