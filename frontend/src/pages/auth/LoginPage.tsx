import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, AlertCircle, Clock } from 'lucide-react';
import { FormField, Input, PhoneInput, Button, Toast } from '../../components/common';
import { ethiopianPhoneSchema } from '../../utils/phone';
import { setServerErrors } from '../../utils/formErrors';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { authService, useAuthStore, getDefaultDashboardRoute } from '../../features/auth';
import type { NormalizedApiError } from '../../services/apiError';

const loginSchema = z.object({
  phoneNumber: ethiopianPhoneSchema,
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [accountStatusNotice, setAccountStatusNotice] = useState<{
    status: 'PENDING' | 'SUSPENDED' | 'DEACTIVATED';
    message: string;
  } | null>(null);

  // Rate limiting countdown timer
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: '',
      password: '',
    },
  });

  const { isSubmitting, execute } = useSubmitGuard({
    onError: (err: NormalizedApiError) => {
      setAccountStatusNotice(null);

      // 429 Throttling / Rate limiting
      if (err.status === 429) {
        const retrySec = err.retryAfterSeconds || 60;
        setCooldownSeconds(retrySec);
        setGeneralError(`Too many login attempts. Please wait before retrying.`);
        return;
      }

      // Check for specific account status responses
      if (err.message?.toLowerCase().includes('pending') || err.errorCode === 'ACCOUNT_PENDING') {
        setAccountStatusNotice({
          status: 'PENDING',
          message: 'Your account is pending verification by cooperative administration. You will receive an SMS when approved.',
        });
        return;
      }
      if (err.message?.toLowerCase().includes('suspended') || err.errorCode === 'ACCOUNT_SUSPENDED') {
        setAccountStatusNotice({
          status: 'SUSPENDED',
          message: 'Your account has been suspended. Please contact South Omo platform administration.',
        });
        return;
      }
      if (err.message?.toLowerCase().includes('deactivated') || err.errorCode === 'ACCOUNT_DEACTIVATED') {
        setAccountStatusNotice({
          status: 'DEACTIVATED',
          message: 'This account has been deactivated.',
        });
        return;
      }

      // 401 / 400 Bad credentials
      if (err.status === 401 || err.errorCode === 'BAD_CREDENTIALS') {
        setGeneralError('Invalid phone number or password. Please check your credentials.');
        return;
      }

      const unhandled = setServerErrors(setError, err);
      if (unhandled.length > 0) {
        setGeneralError(unhandled.join(', '));
      }
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setGeneralError(null);
    setAccountStatusNotice(null);

    execute(async () => {
      const authResponse = await authService.login({
        phoneNumber: values.phoneNumber,
        password: values.password,
      });

      // Check account status if returned in user object
      const userStatus = authResponse.user?.status;
      if (userStatus === 'PENDING') {
        setAccountStatusNotice({
          status: 'PENDING',
          message: 'Your account is registered but pending verification. Full dashboard access will unlock once approved.',
        });
      } else if (userStatus === 'SUSPENDED') {
        setAccountStatusNotice({
          status: 'SUSPENDED',
          message: 'Your account is suspended. Please contact support.',
        });
        return;
      }

      setAuth(authResponse);

      // Determine redirect path
      const redirectUrl =
        searchParams.get('redirect') ||
        sessionStorage.getItem('omobridge_redirect') ||
        getDefaultDashboardRoute(authResponse.user?.roles);

      sessionStorage.removeItem('omobridge_redirect');
      navigate(redirectUrl, { replace: true });
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Sign In to Kinka</h1>
        <p className="text-sm text-muted-foreground">
          Enter your registered Ethiopian mobile number to access your account
        </p>
      </div>

      {/* Account status alerts */}
      {accountStatusNotice && (
        <Toast
          type={accountStatusNotice.status === 'PENDING' ? 'warning' : 'error'}
          title={accountStatusNotice.status === 'PENDING' ? 'Account Pending Verification' : 'Account Notice'}
          message={accountStatusNotice.message}
        />
      )}

      {/* Rate limiting banner */}
      {cooldownSeconds > 0 && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm"
        >
          <Clock className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>
            Security cooldown active. Please wait{' '}
            <strong className="font-mono text-base">{cooldownSeconds}s</strong> before trying again.
          </span>
        </div>
      )}

      {/* General error message */}
      {generalError && !accountStatusNotice && cooldownSeconds === 0 && (
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
          id="login-phone"
          label="Mobile Phone Number"
          error={errors.phoneNumber?.message}
          hint="e.g. 091 123 4567 or 071 234 5678"
          required
        >
          <PhoneInput
            id="login-phone"
            disabled={cooldownSeconds > 0 || isSubmitting}
            hasError={!!errors.phoneNumber}
            {...register('phoneNumber')}
          />
        </FormField>

        <FormField
          id="login-password"
          label="Password"
          error={errors.password?.message}
          required
        >
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            disabled={cooldownSeconds > 0 || isSubmitting}
            hasError={!!errors.password}
            leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
            {...register('password')}
          />
        </FormField>

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          isLoading={isSubmitting}
          disabled={cooldownSeconds > 0}
        >
          {cooldownSeconds > 0 ? `Wait (${cooldownSeconds}s)` : 'Sign In'}
        </Button>
      </form>

      {/* Registration alternatives */}
      <div className="pt-4 border-t border-border space-y-3">
        <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wider">
          New to Kinka?
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Link
            to="/auth/register/buyer"
            className="p-2.5 text-center rounded-lg border border-border hover:bg-muted font-medium text-foreground transition-colors"
          >
            Buyer / Visitor
          </Link>
          <Link
            to="/auth/register/producer"
            className="p-2.5 text-center rounded-lg border border-border hover:bg-muted font-medium text-foreground transition-colors"
          >
            Farmer / Producer
          </Link>
          <Link
            to="/auth/register/enterprise"
            className="p-2.5 text-center rounded-lg border border-border hover:bg-muted font-medium text-foreground transition-colors"
          >
            Community Hub
          </Link>
          <Link
            to="/auth/register/delivery"
            className="p-2.5 text-center rounded-lg border border-border hover:bg-muted font-medium text-foreground transition-colors"
          >
            Delivery Provider
          </Link>
        </div>
        <div className="text-center pt-1">
          <Link
            to="/auth/register/guide"
            className="text-xs text-primary hover:underline font-medium"
          >
            Apply as a Certified Local Tour Guide →
          </Link>
        </div>
      </div>
    </div>
  );
}
