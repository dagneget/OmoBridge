import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { productionPolicy } from '../../vite.security';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { reportRenderFailure } from '../services/reportRenderFailure';
import i18n from '../i18n';
function Crash(): never {
  throw new Error('Bearer private-token phone=+251911123456 password=private');
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('F-1706 frontend security hardening', () => {
  it('does not display or log a caught exception or React component stack', async () => {
    await i18n.changeLanguage('en');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
      { onCaughtError: reportRenderFailure },
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(
      screen.queryByText(/private-token|251911123456|password=/),
    ).not.toBeInTheDocument();
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Kinka page rendering failed.',
    );
  });
  it('preserves a custom fallback without exposing the exception', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>Custom recovery</p>}>
        <Crash />
      </ErrorBoundary>,
      { onCaughtError: reportRenderFailure },
    );
    expect(screen.getByText('Custom recovery')).toBeInTheDocument();
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Kinka page rendering failed.',
    );
  });
  it('translates the safe recovery screen to Amharic', async () => {
    await i18n.changeLanguage('am');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
      { onCaughtError: reportRenderFailure },
    );
    expect(
      screen.getByRole('button', { name: 'ገጹን እንደገና ይጫኑ' }),
    ).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });
  it('allows only the configured API origin for cross-origin connections', () => {
    const csp = productionPolicy('https://api.example.com/v1');
    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(
      csp.split('; ').find((part) => part.startsWith('script-src')),
    ).not.toContain('unsafe-inline');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
  });
  it('supports a same-origin reverse proxy without a wildcard connection policy', () => {
    expect(productionPolicy('/')).toContain("connect-src 'self';");
    expect(
      productionPolicy('/')
        .split('; ')
        .find((part) => part.startsWith('connect-src')),
    ).toBe("connect-src 'self'");
  });
  it.each([
    'javascript:alert(1)',
    'data:text/plain,hello',
    'https://user:password@api.example.com',
    'https://api.example.com/?token=secret',
    'https://api.example.com/#secret',
  ])('rejects unsafe CSP/API configuration %s', (url) => {
    expect(() => productionPolicy(url)).toThrow();
  });
});
