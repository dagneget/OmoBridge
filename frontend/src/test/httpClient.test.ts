import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  createHttpClient,
  TOKEN_STORAGE_KEY,
  withIdempotencyKey,
  NormalizedApiError,
} from '../services/httpClient';
import { normalizeApiError } from '../services/apiError';

describe('HTTP layer and error normalization (F-005)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Bearer token and language from storage into request headers', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'test-jwt-token-123');
    localStorage.setItem('omobridge_lang', 'am');

    const client = createHttpClient('http://test-server');
    let capturedHeaders: any = null;

    client.defaults.adapter = async (config) => {
      capturedHeaders = config.headers;
      return {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const res = await client.get('/api/test');
    expect(res.data.success).toBe(true);
    expect(capturedHeaders?.Authorization).toBe('Bearer test-jwt-token-123');
    expect(capturedHeaders?.['Accept-Language']).toBe('am');
  });

  it('attaches X-Idempotency-Key via withIdempotencyKey helper', () => {
    const config = withIdempotencyKey({}, 'custom-idem-uuid');
    expect(config.headers?.['X-Idempotency-Key']).toBe('custom-idem-uuid');

    const autoConfig = withIdempotencyKey();
    expect(autoConfig.headers?.['X-Idempotency-Key']).toBeDefined();
    expect(typeof autoConfig.headers?.['X-Idempotency-Key']).toBe('string');
  });

  it('normalizes 401 Unauthorized, clears token, and fires event', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'expired-token');
    let eventFired = false;
    const handler = () => {
      eventFired = true;
    };
    window.addEventListener('omobridge:auth-unauthorized', handler);

    const client = createHttpClient('http://test-server');
    client.defaults.adapter = async (config) => {
      const err = new axios.AxiosError('Unauthorized', '401', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { message: 'Invalid or expired token', errorCode: 'AUTH_EXPIRED' },
      });
      throw err;
    };

    try {
      await client.get('/api/protected');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(NormalizedApiError);
      const apiErr = err as NormalizedApiError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.errorCode).toBe('AUTH_EXPIRED');
      expect(apiErr.message).toContain('Invalid or expired token');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(eventFired).toBe(true);
    } finally {
      window.removeEventListener('omobridge:auth-unauthorized', handler);
    }
  });

  it.each([[401, 'old-token'], [403, 'old-token'], [401, null]])(
    'does not clear or redirect a newer session after an old request fails (%s, %s)',
    async (status, oldToken) => {
      if (oldToken) localStorage.setItem(TOKEN_STORAGE_KEY, String(oldToken));
      const handler = vi.fn();
      window.addEventListener('omobridge:auth-unauthorized', handler);
      window.addEventListener('omobridge:auth-forbidden', handler);
      const client = createHttpClient('http://test-server');
      client.defaults.adapter = async (config) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, 'new-session-token');
        throw new axios.AxiosError('Old request failed', String(status), config, null, {
          status: Number(status), statusText: 'Denied', headers: {}, config, data: {},
        });
      };
      try {
        await expect(client.get('/api/v1/auth/me')).rejects.toMatchObject({ status });
        expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('new-session-token');
        expect(handler).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('omobridge:auth-unauthorized', handler);
        window.removeEventListener('omobridge:auth-forbidden', handler);
      }
    },
  );

  it('normalizes 403 Forbidden with proper message and status', () => {
    const rawError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: { message: 'Access denied: guide role required', errorCode: 'FORBIDDEN' },
        headers: {},
      },
    };

    const normalized = normalizeApiError(rawError);
    expect(normalized.status).toBe(403);
    expect(normalized.errorCode).toBe('FORBIDDEN');
    expect(normalized.message).toBe('Access denied: guide role required');
  });

  it('normalizes 409 Conflict with proper message and status', () => {
    const rawError = {
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: 'Farmer already registered with this phone', errorCode: 'DUPLICATE_PHONE' },
        headers: {},
      },
    };

    const normalized = normalizeApiError(rawError);
    expect(normalized.status).toBe(409);
    expect(normalized.errorCode).toBe('DUPLICATE_PHONE');
    expect(normalized.message).toBe('Farmer already registered with this phone');
  });

  it('normalizes 422 Unprocessable and extracts fieldErrors map', () => {
    const rawError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          message: 'Validation failed',
          errorCode: 'VALIDATION_FAILED',
          errors: {
            phoneNumber: 'Must be valid Ethiopian phone (+251...)',
            priceAmount: 'Must be greater than 0',
          },
        },
        headers: {},
      },
    };

    const normalized = normalizeApiError(rawError);
    expect(normalized.status).toBe(422);
    expect(normalized.errorCode).toBe('VALIDATION_FAILED');
    expect(normalized.fieldErrors.phoneNumber).toBe('Must be valid Ethiopian phone (+251...)');
    expect(normalized.fieldErrors.priceAmount).toBe('Must be greater than 0');
  });

  it('normalizes 429 Too Many Requests and parses Retry-After header', () => {
    const rawError = {
      isAxiosError: true,
      response: {
        status: 429,
        data: { message: 'Rate limit exceeded', errorCode: 'RATE_LIMIT' },
        headers: { 'retry-after': '30' },
      },
    };

    const normalized = normalizeApiError(rawError);
    expect(normalized.status).toBe(429);
    expect(normalized.retryAfterSeconds).toBe(30);
    expect(normalized.message).toContain('30s');
  });

  it('detects network failure when no response is received', () => {
    const rawError = {
      isAxiosError: true,
      message: 'Network Error',
      response: undefined,
    };

    const normalized = normalizeApiError(rawError);
    expect(normalized.isNetworkError).toBe(true);
    expect(normalized.status).toBe(0);
    expect(normalized.message.toLowerCase()).toContain('network error');
  });

  it('handles request cancellation cleanly', () => {
    const cancelError = new axios.CanceledError('Operation cancelled by user');
    const normalized = normalizeApiError(cancelError);
    expect(normalized.isCancelled).toBe(true);
    expect(normalized.message).toBe('Request was cancelled');
  });

  it('does not retry POST mutations on 500 error', async () => {
    const client = createHttpClient('http://test-server');
    let callCount = 0;

    client.defaults.adapter = async (config) => {
      callCount += 1;
      const err = new axios.AxiosError('Internal Server Error', '500', config, null, {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config,
        data: { message: 'Database failed' },
      });
      throw err;
    };

    try {
      await client.post('/api/orders', { items: [] });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(NormalizedApiError);
      // Ensure POST was called only once and NEVER retried
      expect(callCount).toBe(1);
    }
  });
});
