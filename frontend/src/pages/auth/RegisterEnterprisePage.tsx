import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Lock,
  MapPin,
  FileText,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { FormField, Input, PhoneInput, Select, Button } from '../../components/common';
import { ethiopianPhoneSchema } from '../../utils/phone';
import { setServerErrors } from '../../utils/formErrors';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { authService, useAuthStore } from '../../features/auth';
import type { NormalizedApiError } from '../../services/apiError';

const enterpriseRegisterSchema = z.object({
  enterpriseName: z.string().min(2, 'Enterprise or cooperative name is required'),
  fullName: z.string().min(2, 'Please enter representative full name'),
  phoneNumber: ethiopianPhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  locationWoreda: z.string().min(2, 'Woreda is required'),
  locationTown: z.string().min(2, 'Town is required'),
  registrationNumber: z.string().optional(),
  locationAddress: z.string().optional(),
  preferredLanguage: z.string(),
});

type EnterpriseRegisterFormValues = z.infer<typeof enterpriseRegisterSchema>;

export default function RegisterEnterprisePage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EnterpriseRegisterFormValues>({
    resolver: zodResolver(enterpriseRegisterSchema),
    defaultValues: {
      enterpriseName: '',
      fullName: '',
      phoneNumber: '',
      password: '',
      email: '',
      locationWoreda: 'Hamer',
      locationTown: 'Dimeka',
      registrationNumber: '',
      locationAddress: '',
      preferredLanguage: 'en',
    },
  });

  const { isSubmitting, execute } = useSubmitGuard({
    onError: (err: NormalizedApiError) => {
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
            'This phone number is already registered to an enterprise or user.',
        });
        return;
      }

      const unhandled = setServerErrors(setError, err);
      if (unhandled.length > 0) {
        setGeneralError(unhandled.join(', '));
      }
    },
  });

  const onSubmit = (values: EnterpriseRegisterFormValues) => {
    setGeneralError(null);

    execute(async () => {
      const authResponse = await authService.registerEnterprise({
        enterpriseName: values.enterpriseName,
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        password: values.password,
        email: values.email || undefined,
        locationWoreda: values.locationWoreda,
        locationTown: values.locationTown,
        registrationNumber: values.registrationNumber || undefined,
        locationAddress: values.locationAddress || undefined,
        preferredLanguage: values.preferredLanguage,
      });

      // Set user session in authStore
      setAuth(authResponse);

      // Route directly to enterprise dashboard
      navigate('/dashboard/enterprise', { replace: true });
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mb-2">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Cooperative / Processing Enterprise</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Enterprise Registration</h1>
        <p className="text-sm text-muted-foreground">
          Register your cooperative to aggregate farmer crops, manage inventory, and sell to buyers
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
        {/* Enterprise Name */}
        <FormField
          id="enterprise-name"
          label="Enterprise / Cooperative Name"
          error={errors.enterpriseName?.message}
          hint="e.g. Omo Valley Honey Processing Union"
          required
        >
          <Input
            id="enterprise-name"
            placeholder="Omo Valley Honey Union"
            hasError={!!errors.enterpriseName}
            leftIcon={<Building2 className="w-4 h-4" aria-hidden="true" />}
            {...register('enterpriseName')}
          />
        </FormField>

        {/* Representative Full Name */}
        <FormField
          id="rep-name"
          label="Authorized Representative Name"
          error={errors.fullName?.message}
          required
        >
          <Input
            id="rep-name"
            placeholder="Tolcha Gemeda"
            hasError={!!errors.fullName}
            leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
            {...register('fullName')}
          />
        </FormField>

        {/* Mobile Phone */}
        <FormField
          id="enterprise-phone"
          label="Primary Business Phone Number"
          error={errors.phoneNumber?.message}
          hint="Login credential and payment receipt alerts"
          required
        >
          <PhoneInput
            id="enterprise-phone"
            hasError={!!errors.phoneNumber}
            {...register('phoneNumber')}
          />
        </FormField>

        {/* Password */}
        <FormField
          id="enterprise-password"
          label="Account Password"
          error={errors.password?.message}
          hint="Minimum 6 characters"
          required
        >
          <Input
            id="enterprise-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.password}
            leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
            {...register('password')}
          />
        </FormField>

        {/* Woreda & Town */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            id="enterprise-woreda"
            label="Location (Woreda)"
            error={errors.locationWoreda?.message}
            required
          >
            <Select
              id="enterprise-woreda"
              options={[
                { value: 'Hamer', label: 'Hamer (Dimeka / Turmi)' },
                { value: 'Dasenech', label: 'Dasenech (Omorate)' },
                { value: 'Bena Tsemay', label: 'Bena Tsemay (Key Afer)' },
                { value: 'South Ari', label: 'South Ari (Jinka)' },
                { value: 'North Ari', label: 'North Ari (Gazer)' },
                { value: 'Nyangatom', label: 'Nyangatom (Kangalaten)' },
              ]}
              {...register('locationWoreda')}
            />
          </FormField>

          <FormField
            id="enterprise-town"
            label="Town / Center"
            error={errors.locationTown?.message}
            required
          >
            <Input
              id="enterprise-town"
              placeholder="e.g. Turmi, Dimeka"
              hasError={!!errors.locationTown}
              leftIcon={<MapPin className="w-4 h-4" aria-hidden="true" />}
              {...register('locationTown')}
            />
          </FormField>
        </div>

        {/* Registration Number & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            id="enterprise-reg-no"
            label="Gov / Trade Reg No (Optional)"
            hint="Ministry or Zonal Trade Bureau ID"
          >
            <Input
              id="enterprise-reg-no"
              placeholder="ET-TRADE-88412"
              leftIcon={<FileText className="w-4 h-4" aria-hidden="true" />}
              {...register('registrationNumber')}
            />
          </FormField>

          <FormField
            id="enterprise-email"
            label="Email Address (Optional)"
          >
            <Input
              id="enterprise-email"
              type="email"
              placeholder="enterprise@example.com"
              leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
              {...register('email')}
            />
          </FormField>
        </div>

        {/* Preferred Language */}
        <FormField id="enterprise-lang" label="Preferred Dashboard Language">
          <Select
            id="enterprise-lang"
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
          Register Enterprise & Open Dashboard
        </Button>
      </form>

      <div className="pt-4 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
