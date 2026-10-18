import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import i18n from '../i18n';

vi.mock('../routes', () => ({
  default: function TestRoutes() {
    const location = useLocation();
    return <main><p>{location.pathname}</p><Link to="/products">Products</Link></main>;
  },
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

it('keeps the captured install offer available across route navigation', async () => {
  sessionStorage.clear();
  await i18n.changeLanguage('en');
  render(<MemoryRouter><App /></MemoryRouter>);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  });
  act(() => { window.dispatchEvent(event); });
  expect(event.defaultPrevented).toBe(true);
  expect(screen.getAllByRole('button', { name: 'Install app' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('link', { name: 'Products' }));
  expect(screen.getByText('/products')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument());
  expect(prompt).toHaveBeenCalledTimes(1);
});
