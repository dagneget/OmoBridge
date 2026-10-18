import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { NormalizedApiError } from '../services/apiError';

/**
 * Maps field errors from NormalizedApiError onto React Hook Form fields.
 * If there are general or non-field-specific errors, returns them as an array of error messages.
 */
export function setServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown
): string[] {
  if (!(error instanceof NormalizedApiError)) {
    return [error instanceof Error ? error.message : 'An unexpected error occurred'];
  }

  const unhandledErrors: string[] = [];

  if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    Object.entries(error.fieldErrors).forEach(([field, msg]) => {
      // If the field exists in T, set the error on it
      try {
        setError(field as Path<T>, {
          type: 'server',
          message: msg,
        });
      } catch {
        unhandledErrors.push(`${field}: ${msg}`);
      }
    });
  } else if (error.message) {
    unhandledErrors.push(error.message);
  }

  return unhandledErrors;
}
