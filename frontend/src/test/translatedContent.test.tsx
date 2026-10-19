import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import PublicLayout from '../components/layout/PublicLayout';
import i18n from '../i18n';
import { httpClient, LANG_STORAGE_KEY } from '../services/httpClient';
import { queryClient } from '../services/queryClient';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderLanguageSwitcher(qc?: QueryClient) {
  const client = qc || createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageSwitcher />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Translated content and language switching (F-311)', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.changeLanguage('en');
    vi.restoreAllMocks();
  });

  it('renders language switcher and defaults to English', () => {
    renderLanguageSwitcher();

    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('lang-btn-en')).toBeInTheDocument();
    expect(screen.getByTestId('lang-btn-am')).toBeInTheDocument();
    expect(i18n.language).toBe('en');
  });

  it('switches language to Amharic and persists selection in localStorage', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderLanguageSwitcher();

    // Click on Amharic button
    fireEvent.click(screen.getByTestId('lang-btn-am'));

    await waitFor(() => {
      expect(i18n.language).toBe('am');
    });

    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('am');
    expect(document.documentElement.lang).toBe('am');
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('httpClient attaches selected language to Accept-Language header', async () => {
    // Set language in localStorage
    localStorage.setItem(LANG_STORAGE_KEY, 'am');

    // @ts-expect-error accessing interceptor handlers for test
    const requestInterceptor = httpClient.interceptors.request.handlers[0].fulfilled;
    const config = await requestInterceptor({ headers: {} as any });

    expect(config.headers['Accept-Language']).toBe('am');
  });

  it('gracefully falls back to English or fallback key when translation is missing', () => {
    i18n.changeLanguage('am');

    // Key exists in Amharic
    expect(i18n.t('nav.home')).toBe('ዋና ገጽ');

    // Missing key in Amharic falls back to fallbackLng 'en' or returns the fallback string without error
    const nonExistent = i18n.t('nav.nonExistentKey', 'Fallback Cultural Tour');
    expect(nonExistent).toBe('Fallback Cultural Tour');

    // Switch back to English
    i18n.changeLanguage('en');
    expect(i18n.t('nav.home')).toBe('Home');
  });

  it('renders LanguageSwitcher in PublicLayout navigation header', () => {
    const qc = createTestQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <PublicLayout />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const switcher = screen.getAllByTestId('language-switcher');
    expect(switcher.length).toBeGreaterThanOrEqual(1);
  });
});
