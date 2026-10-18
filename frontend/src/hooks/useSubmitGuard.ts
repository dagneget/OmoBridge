import { useState, useCallback, useRef } from 'react';
import { normalizeApiError, NormalizedApiError } from '../services/apiError';

export interface UseSubmitGuardOptions<T> {
  onSuccess?: (result: T) => void | Promise<void>;
  onError?: (error: NormalizedApiError) => void | Promise<void>;
  throwOnError?: boolean;
}

export function useSubmitGuard<T = void>(options?: UseSubmitGuardOptions<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<NormalizedApiError | null>(null);
  const isExecutingRef = useRef(false);

  const execute = useCallback(
    async (action: () => Promise<T>): Promise<T | undefined> => {
      if (isExecutingRef.current) {
        // Prevent concurrent or duplicate submission
        return undefined;
      }

      isExecutingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await action();
        await options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const normalized = normalizeApiError(err);
        setError(normalized);
        await options?.onError?.(normalized);
        if (options?.throwOnError) {
          throw normalized;
        }
        return undefined;
      } finally {
        isExecutingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [options]
  );

  return {
    isSubmitting,
    error,
    execute,
    clearError: () => setError(null),
  };
}

export default useSubmitGuard;
