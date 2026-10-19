import { getPreferredLanguage } from '../i18n/languages';
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { normalizeApiError, NormalizedApiError } from './apiError';
import { generateIdempotencyKey } from '../utils/idempotency';

export function resolveBaseApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('localhost:8080')) {
    return envUrl.trim();
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://omobridge-api.onrender.com';
  }
  return envUrl || 'http://localhost:8080';
}

export const BASE_API_URL = resolveBaseApiUrl();
export const TOKEN_STORAGE_KEY = 'omobridge_token';
export { LANG_STORAGE_KEY } from '../i18n/languages';

// Custom interface extending config with retry count
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

export function createHttpClient(baseURL: string = BASE_API_URL): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request Interceptor: Auth, Language, and Idempotency
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Attach Bearer token if present
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Attach Preferred Language
      const lang = getPreferredLanguage();
      if (!config.headers['Accept-Language']) {
        config.headers['Accept-Language'] = lang;
      }

      return config;
    },
    (error) => Promise.reject(normalizeApiError(error))
  );

  // Response Interceptor: GET-only retry, 401 broadcast, Error normalization
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config as RetryableRequestConfig | undefined;
      const status = error.response?.status;
      const isGetMethod = config?.method?.toLowerCase() === 'get';

      // 1. GET-only retry with exponential backoff on network failure or 5xx status
      const isNetworkOrServerError = !status || (status >= 500 && status <= 599);
      if (config && isGetMethod && isNetworkOrServerError) {
        config._retryCount = config._retryCount || 0;
        const MAX_RETRIES = 2;

        if (config._retryCount < MAX_RETRIES) {
          config._retryCount += 1;
          const backoffDelay = Math.pow(2, config._retryCount) * 200; // 400ms, 800ms
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          return instance(config);
        }
      }

      // Old in-flight requests must not expire or redirect a newer login session.
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      const requestMatchesSession = !currentToken || config?.headers.get('Authorization') === `Bearer ${currentToken}`;

      // 2. 401 Unauthorized handling: notify app & clear token
      if (status === 401 && requestMatchesSession) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          window.dispatchEvent(new CustomEvent('omobridge:auth-unauthorized'));
        }
      }

      // 3. 403 Forbidden handling: notify app
      if (status === 403 && requestMatchesSession) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('omobridge:auth-forbidden', {
              detail: normalizeApiError(error),
            })
          );
        }
      }

      // 4. Normalize error shape
      return Promise.reject(normalizeApiError(error));
    }
  );

  return instance;
}

export const httpClient = createHttpClient();

/**
 * Creates an AbortController for cancelable requests
 */
export function createAbortController(): AbortController {
  return new AbortController();
}

/**
 * Convenience helper to attach an idempotency key to a request configuration
 */
export function withIdempotencyKey(
  config: AxiosRequestConfig = {},
  key?: string
): AxiosRequestConfig {
  const idempotencyKey = key || generateIdempotencyKey();
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Idempotency-Key': idempotencyKey,
    },
  };
}

export { NormalizedApiError, generateIdempotencyKey };
export default httpClient;
