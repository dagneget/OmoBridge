import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FormField,
  Input,
  Button,
  PhoneInput,
} from '../components/common';
import { ethiopianPhoneSchema, normalizeEthiopianPhone, isValidEthiopianPhone } from '../utils/phone';
import { setServerErrors } from '../utils/formErrors';
import { useSubmitGuard } from '../hooks/useSubmitGuard';
import { NormalizedApiError } from '../services/apiError';

// Form schema with Zod
const testLoginSchema = z.object({
  phoneNumber: ethiopianPhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type TestLoginFormValues = z.infer<typeof testLoginSchema>;

interface TestFormProps {
  onSubmitApi: (data: TestLoginFormValues) => Promise<void>;
}

function TestLoginForm({ onSubmitApi }: TestFormProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TestLoginFormValues>({
    resolver: zodResolver(testLoginSchema),
    defaultValues: {
      phoneNumber: '',
      password: '',
    },
  });

  const { isSubmitting: isGuardSubmitting, execute } = useSubmitGuard({
    onError: (err) => {
      const unhandled = setServerErrors(setError, err);
      if (unhandled.length > 0) {
        setGeneralError(unhandled.join(', '));
      }
    },
  });

  const onSubmit = (values: TestLoginFormValues) => {
    execute(async () => {
      await onSubmitApi(values);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {generalError && (
        <div role="alert" data-testid="general-error">
          {generalError}
        </div>
      )}

      <FormField
        id="phoneNumber"
        label="Phone Number"
        error={errors.phoneNumber?.message}
        required
      >
        <PhoneInput
          id="phoneNumber"
          hasError={!!errors.phoneNumber}
          {...register('phoneNumber')}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        required
      >
        <Input
          id="password"
          type="password"
          hasError={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <Button
        type="submit"
        isLoading={isSubmitting || isGuardSubmitting}
        data-testid="submit-btn"
      >
        Sign In
      </Button>
    </form>
  );
}

describe('Forms Foundation (F-103)', () => {
  describe('Ethiopian Phone Validation & Normalization', () => {
    it('normalizes local 09 and 07 prefixes to +251 canonical format', () => {
      expect(normalizeEthiopianPhone('0911223344')).toBe('+251911223344');
      expect(normalizeEthiopianPhone('0711223344')).toBe('+251711223344');
      expect(normalizeEthiopianPhone('251911223344')).toBe('+251911223344');
      expect(normalizeEthiopianPhone('+251 91 122 3344')).toBe('+251911223344');
      expect(normalizeEthiopianPhone('911223344')).toBe('+251911223344');
    });

    it('correctly validates valid and invalid Ethiopian numbers', () => {
      expect(isValidEthiopianPhone('0911223344')).toBe(true);
      expect(isValidEthiopianPhone('+251911223344')).toBe(true);
      expect(isValidEthiopianPhone('+251711223344')).toBe(true);

      // Invalid
      expect(isValidEthiopianPhone('0811223344')).toBe(false); // only 7 and 9
      expect(isValidEthiopianPhone('09112233')).toBe(false); // too short
      expect(isValidEthiopianPhone('+1234567890')).toBe(false); // not +251
    });
  });

  describe('Server Field Error Mapping (400/422)', () => {
    it('renders server-side field errors from a mocked 422 API response onto the form inputs', async () => {
      const mockSubmit = vi.fn().mockRejectedValue(
        new NormalizedApiError({
          status: 422,
          message: 'Validation failed on server',
          fieldErrors: {
            phoneNumber: 'This phone number is already registered',
            password: 'Password does not meet complexity requirements',
          },
        })
      );

      render(<TestLoginForm onSubmitApi={mockSubmit} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByTestId('submit-btn');

      fireEvent.change(phoneInput, { target: { value: '0911223344' } });
      fireEvent.change(passwordInput, { target: { value: 'secret123' } });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });

      // The field errors should be displayed in role="alert"
      await waitFor(() => {
        expect(
          screen.getByText(/this phone number is already registered/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/password does not meet complexity requirements/i)
        ).toBeInTheDocument();
      });
    });

    it('renders unhandled error messages as general alert if fields do not match', async () => {
      const mockSubmit = vi.fn().mockRejectedValue(
        new NormalizedApiError({
          status: 400,
          message: 'Account is suspended or locked',
          fieldErrors: {},
        })
      );

      render(<TestLoginForm onSubmitApi={mockSubmit} />);

      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '0911223344' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'secret123' },
      });

      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent(
          /account is suspended or locked/i
        );
      });
    });
  });

  describe('Double-Submit Protection (useSubmitGuard)', () => {
    it('prevents concurrent executions while one is already in flight', async () => {
      let resolvePromise: () => void = () => {};
      const slowAction = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      function GuardTest() {
        const { isSubmitting, execute } = useSubmitGuard();
        return (
          <button
            onClick={() => execute(slowAction)}
            disabled={isSubmitting}
            data-testid="guard-btn"
          >
            {isSubmitting ? 'Working...' : 'Click Me'}
          </button>
        );
      }

      render(<GuardTest />);
      const btn = screen.getByTestId('guard-btn');

      // First click
      fireEvent.click(btn);
      expect(slowAction).toHaveBeenCalledTimes(1);
      expect(btn).toBeDisabled();

      // Second click while in flight should be ignored
      fireEvent.click(btn);
      expect(slowAction).toHaveBeenCalledTimes(1);

      // Resolve the initial action
      resolvePromise();
      await waitFor(() => {
        expect(btn).not.toBeDisabled();
      });
    });
  });
});
