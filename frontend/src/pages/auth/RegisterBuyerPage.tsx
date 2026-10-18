import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Lock, Mail, AlertCircle } from 'lucide-react';
import { FormField, Input, PhoneInput, Select, Button } from '../../components/common';
import { ethiopianPhoneSchema } from '../../utils/phone';
import { setServerErrors } from '../../utils/formErrors';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { authService, useAuthStore } from '../../features/auth';
import type { NormalizedApiError } from '../../services/apiError';

const buyerRegisterSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  phoneNumber: ethiopianPhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  preferredLanguage: z.string(),
});

type BuyerRegisterFormValues = z.infer<typeof buyerRegisterSchema>;

export default function RegisterBuyerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BuyerRegisterFormValues>({
    resolver: zodResolver(buyerRegisterSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      password: '',
      email: '',
      preferredLanguage: 'en',
    },
  });

  const { isSubmitting, execute } = useSubmitGuard({
    onError: (err: NormalizedApiError) => {
      // Handle duplicate phone number (409 or 422 with conflict)
      if (
        err.status === 409 ||
        err.message?.toLowerCase().includes('already registered') ||
        err.message?.toLowerCase().includes('duplicate') ||
        err.fieldErrors?.phoneNumber
      ) {
        setError('phoneNumber', {
          type: 'conflict',
          message:
            err.fieldErrors?.phoneNumber ||
            'This phone number is already registered. Please sign in or use a different number.',
        });
        return;
      }

      const unhandled = setServerErrors(setError, err);
      if (unhandled.length > 0) {
        setGeneralError(unhandled.join(', '));
      }
    },
  });

  const onSubmit = (values: BuyerRegisterFormValues) => {
    setGeneralError(null);

    execute(async () => {
      const authResponse = await authService.registerBuyer({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        password: values.password,
        email: values.email || undefined,
        preferredLanguage: values.preferredLanguage,
      });

      // Automatically log the buyer in with returned tokens
      setAuth(authResponse);

      const redirectUrl =
        searchParams.get('redirect') ||
        sessionStorage.getItem('omobridge_redirect') ||
        '/products';

      sessionStorage.removeItem('omobridge_redirect');
      navigate(redirectUrl, { replace: true });
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Create Buyer Account</h1>
        <p className="text-sm text-muted-foreground">
          Purchase authentic South Omo agricultural goods and book certified community eco-tours
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-3.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          id="buyer-name"
          label="Full Name"
          error={errors.fullName?.message}
          required
        >
          <Input
            id="buyer-name"
            placeholder="Abebe Bikila"
            hasError={!!errors.fullName}
            leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
            {...register('fullName')}
          />
        </FormField>

        <FormField
          id="buyer-phone"
          label="Mobile Phone Number"
          error={errors.phoneNumber?.message}
          hint="e.g. 091 123 4567 or 071 234 5678"
          required
        >
          <PhoneInput
            id="buyer-phone"
            hasError={!!errors.phoneNumber}
            {...register('phoneNumber')}
          />
        </FormField>

        <FormField
          id="buyer-password"
          label="Create Password"
          error={errors.password?.message}
          hint="Minimum 6 characters"
          required
        >
          <Input
            id="buyer-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.password}
            leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
            {...register('password')}
          />
        </FormField>

        <FormField
          id="buyer-email"
          label="Email Address (Optional)"
          error={errors.email?.message}
          hint="For order receipts and tour confirmations"
        >
          <Input
            id="buyer-email"
            type="email"
            placeholder="visitor@example.com"
            hasError={!!errors.email}
            leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
            {...register('email')}
          />
        </FormField>

        <FormField id="buyer-lang" label="Preferred Language">
          <Select
            id="buyer-lang"
            options={[
              { value: 'en', label: 'English' },
              { value: 'am', label: 'አማርኛ (Amharic)' },
            ]}
            {...register('preferredLanguage')}
          />
        </FormField>

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          isLoading={isSubmitting}
        >
          Register & Continue
        </Button>
      </form>

      <div className="pt-4 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
