import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Sprout,
  User,
  Lock,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
} from 'lucide-react';
import { FormField, Input, PhoneInput, Select, Checkbox, Button } from '../../components/common';
import { ethiopianPhoneSchema } from '../../utils/phone';
import { setServerErrors } from '../../utils/formErrors';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { authService } from '../../features/auth';
import type { NormalizedApiError } from '../../services/apiError';

const producerRegisterSchema = z.object({
  fullName: z.string().min(2, 'Please enter the producer full name'),
  phoneNumber: ethiopianPhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  village: z.string().min(2, 'Village is required for origin traceability'),
  kebele: z.string().optional(),
  idCardNumber: z.string().optional(),
  telebirrPhone: z.string().optional(),
  preferredLanguage: z.string(),
  consentPublicName: z.boolean(),
});

type ProducerRegisterFormValues = z.infer<typeof producerRegisterSchema>;

export default function RegisterProducerPage() {
  const [isSuccessPending, setIsSuccessPending] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProducerRegisterFormValues>({
    resolver: zodResolver(producerRegisterSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      password: '',
      village: '',
      kebele: '',
      idCardNumber: '',
      telebirrPhone: '',
      preferredLanguage: 'am',
      consentPublicName: true,
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
            'This phone number is already registered to a producer or enterprise.',
        });
        return;
      }

      const unhandled = setServerErrors(setError, err);
      if (unhandled.length > 0) {
        setGeneralError(unhandled.join(', '));
      }
    },
  });

  const onSubmit = (values: ProducerRegisterFormValues) => {
    setGeneralError(null);

    execute(async () => {
      await authService.registerProducer({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        password: values.password,
        village: values.village,
        kebele: values.kebele || undefined,
        idCardNumber: values.idCardNumber || undefined,
        telebirrPhone: values.telebirrPhone || undefined,
        preferredLanguage: values.preferredLanguage,
        consentPublicName: values.consentPublicName,
      });

      setRegisteredPhone(values.phoneNumber);
      setIsSuccessPending(true);
    });
  };

  // Screen 2: Waiting for Approval Confirmation Screen
  if (isSuccessPending) {
    return (
      <div className="w-full space-y-6 text-center animate-in fade-in py-2">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Application Submitted: Pending Approval
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your farmer / producer application for <strong className="text-foreground">{registeredPhone}</strong> has been registered with pending status.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/40 text-left space-y-3 text-xs leading-relaxed">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            What happens next?
          </h2>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground">
            <li>The South Omo cooperative desk reviews your village origin and membership details.</li>
            <li>You will receive an automated SMS notification upon verification.</li>
            <li>Once approved, you can supply crops, record deliveries, and view earnings.</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 text-left">
          <PhoneCall className="w-6 h-6 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <span className="font-semibold block">USSD Feature Phone Access</span>
            <span>You can also check your balance and pending deliveries anytime on basic phones by dialing *844#.</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link to="/login" className="flex-1">
            <Button variant="primary" className="w-full">
              Proceed to Sign In
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Screen 1: Registration Form
  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mb-2">
          <Sprout className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Rural Farmer / Cooperative Member</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Producer Registration</h1>
        <p className="text-sm text-muted-foreground">
          Join the South Omo digital supply chain to sell honey, sesame, and grains directly to enterprises
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
        {/* Full Name */}
        <FormField
          id="producer-name"
          label="Farmer Full Name"
          error={errors.fullName?.message}
          required
        >
          <Input
            id="producer-name"
            placeholder="Abebe Bikila"
            hasError={!!errors.fullName}
            leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
            {...register('fullName')}
          />
        </FormField>

        {/* Phone */}
        <FormField
          id="producer-phone"
          label="Mobile Phone Number"
          error={errors.phoneNumber?.message}
          hint="Also used for USSD *844# delivery updates"
          required
        >
          <PhoneInput
            id="producer-phone"
            hasError={!!errors.phoneNumber}
            {...register('phoneNumber')}
          />
        </FormField>

        {/* Password */}
        <FormField
          id="producer-password"
          label="Account Password"
          error={errors.password?.message}
          hint="Minimum 6 characters"
          required
        >
          <Input
            id="producer-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.password}
            leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
            {...register('password')}
          />
        </FormField>

        {/* Village & Kebele */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            id="producer-village"
            label="Village (Origin)"
            error={errors.village?.message}
            hint="For batch QR traceability"
            required
          >
            <Input
              id="producer-village"
              placeholder="e.g. Turmi, Omorate"
              hasError={!!errors.village}
              leftIcon={<MapPin className="w-4 h-4" aria-hidden="true" />}
              {...register('village')}
            />
          </FormField>

          <FormField
            id="producer-kebele"
            label="Kebele (Optional)"
            error={errors.kebele?.message}
          >
            <Input
              id="producer-kebele"
              placeholder="e.g. Kebele 01"
              hasError={!!errors.kebele}
              {...register('kebele')}
            />
          </FormField>
        </div>

        {/* Telebirr / ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            id="producer-telebirr"
            label="Telebirr Account (Optional)"
            hint="For instant mobile payouts"
          >
            <Input
              id="producer-telebirr"
              placeholder="091 123 4567"
              leftIcon={<CreditCard className="w-4 h-4" aria-hidden="true" />}
              {...register('telebirrPhone')}
            />
          </FormField>

          <FormField
            id="producer-idcard"
            label="ID / Kebele Card (Optional)"
            hint="Speeds up verification"
          >
            <Input
              id="producer-idcard"
              placeholder="ET-SO-12345"
              {...register('idCardNumber')}
            />
          </FormField>
        </div>

        {/* Preferred Language */}
        <FormField id="producer-lang" label="Preferred Language">
          <Select
            id="producer-lang"
            options={[
              { value: 'am', label: 'አማርኛ (Amharic - Default)' },
              { value: 'en', label: 'English' },
            ]}
            {...register('preferredLanguage')}
          />
        </FormField>

        {/* Consent for Public Traceability */}
        <div className="pt-2">
          <Checkbox
            id="consent-public"
            label="Display my producer name on QR batch traceability"
            description="Allows ethical buyers scanning product jars to recognize your harvest origin"
            {...register('consentPublicName')}
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          isLoading={isSubmitting}
        >
          Submit Application
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
