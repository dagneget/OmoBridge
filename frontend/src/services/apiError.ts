import axios, { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api';

export class NormalizedApiError extends Error {
  public readonly status: number;
  public readonly errorCode?: string;
  public readonly fieldErrors: Record<string, string>;
  public readonly isNetworkError: boolean;
  public readonly isCancelled: boolean;
  public readonly retryAfterSeconds?: number;

  constructor(params: {
    message: string;
    status: number;
    errorCode?: string;
    fieldErrors?: Record<string, string>;
    isNetworkError?: boolean;
    isCancelled?: boolean;
    retryAfterSeconds?: number;
  }) {
    super(params.message);
    this.name = 'NormalizedApiError';
    this.status = params.status;
    this.errorCode = params.errorCode;
    this.fieldErrors = params.fieldErrors || {};
    this.isNetworkError = params.isNetworkError || false;
    this.isCancelled = params.isCancelled || false;
    this.retryAfterSeconds = params.retryAfterSeconds;
    Object.setPrototypeOf(this, NormalizedApiError.prototype);
  }
}

/**
 * Normalizes an Axios error or generic error into NormalizedApiError
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isCancel(error)) {
    return new NormalizedApiError({
      message: 'Request was cancelled',
      status: 0,
      isCancelled: true,
    });
  }

  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return new NormalizedApiError({
        message: error.message,
        status: 0,
      });
    }
    return new NormalizedApiError({
      message: 'An unexpected error occurred',
      status: 0,
    });
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;

  // Network / Connection Error (no response received)
  if (!axiosError.response) {
    return new NormalizedApiError({
      message: axiosError.message || 'Network error: could not connect to server',
      status: 0,
      isNetworkError: true,
    });
  }

  const { status, data, headers } = axiosError.response;
  let message = data?.message || axiosError.message || `Request failed with status ${status}`;
  const errorCode = data?.errorCode;
  const fieldErrors: Record<string, string> = {};

  if (data?.errors) {
    if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
      Object.assign(fieldErrors, data.errors);
    } else if (Array.isArray(data.errors)) {
      data.errors.forEach((err, idx) => {
        fieldErrors[`error_${idx}`] = String(err);
      });
    }
  }

  // Parse Retry-After header for 429 rate limit
  let retryAfterSeconds: number | undefined;
  if (status === 429 && headers?.['retry-after']) {
    const parsed = parseInt(String(headers['retry-after']), 10);
    if (!isNaN(parsed)) {
      retryAfterSeconds = parsed;
    }
  }

  // Status specific message enrichment
  switch (status) {
    case 401:
      message = data?.message || 'Authentication required or session expired. Please sign in again.';
      break;
    case 403:
      message = data?.message || 'Access denied: you do not have permission for this resource.';
      break;
    case 404:
      message = data?.message || 'The requested resource was not found.';
      break;
    case 409:
      message = data?.message || 'Conflict detected: this record already exists or was modified.';
      break;
    case 422:
      message = data?.message || 'Validation error: please check the submitted information.';
      break;
    case 429:
      message = data?.message
        ? `${data.message}${retryAfterSeconds ? ` (retry after ${retryAfterSeconds}s)` : ''}`
        : `Too many requests. Please wait before retrying${retryAfterSeconds ? ` (${retryAfterSeconds}s)` : ''}.`;
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      message = data?.message || 'Server error: our services are temporarily unavailable. Please try again later.';
      break;
  }

  return new NormalizedApiError({
    message,
    status,
    errorCode,
    fieldErrors,
    retryAfterSeconds,
  });
}
