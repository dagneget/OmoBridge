import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Truck,
  User,
  Lock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { FormField, Input, PhoneInput, Select, Button } from '../../components/common';
import { ethiopianPhoneSchema } from '../../utils/phone';
import { setServerErrors } from '../../utils/formErrors';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { authService } from '../../features/auth';
import type { NormalizedApiError } from '../../services/apiError';

const deliveryRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phoneNumber: ethiopianPhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  vehicleType: z.enum(['MOTORCYCLE', 'TRUCK', 'VAN', 'BAJAJ', 'BICYCLE', 'FOOT']),
  vehiclePlateNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  serviceArea: z.string().min(2, 'Service area is required'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  preferredLanguage: z.string(),
});

type DeliveryRegisterFormValues = z.infer<typeof deliveryRegisterSchema>;

export default function RegisterDeliveryPage() {
  const [isSuccessPending, setIsSuccessPending] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DeliveryRegisterFormValues>({
    resolver: zodResolver(deliveryRegisterSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      password: '',
      vehicleType: 'MOTORCYCLE',
      vehiclePlateNumber: '',
      licenseNumber: '',
      serviceArea: 'Turmi - Dimeka Corridor',
      email: '',
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
            'This phone number is already registered to a provider or user.',
        });
        return;
      }

      const unhandled = setServerErrors(setError, err);
      if (unhandled.length > 0) {
        setGeneralError(unhandled.join(', '));
      }
    },
  });

  const onSubmit = (values: DeliveryRegisterFormValues) => {
    setGeneralError(null);

    execute(async () => {
      await authService.registerDeliveryProvider({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        password: values.password,
        vehicleType: values.vehicleType,
        vehiclePlateNumber: values.vehiclePlateNumber || undefined,
        licenseNumber: values.licenseNumber || undefined,
        serviceArea: values.serviceArea,
        email: values.email || undefined,
        preferredLanguage: values.preferredLanguage,
      });

      setRegisteredPhone(values.phoneNumber);
      setIsSuccessPending(true);
    });
  };

  // Screen 2: Pending Approval Confirmation
  if (isSuccessPending) {
    return (
      <div className="w-full space-y-6 text-center animate-in fade-in py-2">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Delivery Application Submitted: Pending Approval
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your delivery provider account for <strong className="text-foreground">{registeredPhone}</strong> has been created with pending status.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/40 text-left space-y-3 text-xs leading-relaxed">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            Verification & Route Assignment
          </h2>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground">
            <li>Our transport dispatch officer will review your driver license and vehicle details.</li>
            <li>You will receive an SMS confirmation once your courier profile is activated.</li>
            <li>Once active, you can accept deliveries, use offline GPS sync, and receive mobile payouts.</li>
          </ul>
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
          <Truck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Last-Mile Logistics & Dispatch</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Delivery Provider Registration</h1>
        <p className="text-sm text-muted-foreground">
          Join the South Omo logistics network to transport harvested crops and tourist supplies
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
          id="delivery-name"
          label="Full Legal Name"
          error={errors.fullName?.message}
          required
        >
          <Input
            id="delivery-name"
            placeholder="Kassahun Wolde"
            hasError={!!errors.fullName}
            leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
            {...register('fullName')}
          />
        </FormField>

        {/* Mobile Phone */}
        <FormField
          id="delivery-phone"
          label="Mobile Phone Number"
          error={errors.phoneNumber?.message}
          hint="For dispatch calls, SMS alerts, and offline sync"
          required
        >
          <PhoneInput
            id="delivery-phone"
            hasError={!!errors.phoneNumber}
            {...register('phoneNumber')}
          />
        </FormField>

        {/* Password */}
        <FormField
          id="delivery-password"
          label="Account Password"
          error={errors.password?.message}
          hint="Minimum 6 characters"
          required
        >
          <Input
            id="delivery-password"
            type="password"
            placeholder="••••••••"
            hasError={!!errors.password}
            leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
            {...register('password')}
          />
        </FormField>

        {/* Vehicle Type & Plate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            id="delivery-vehicle"
            label="Vehicle Type"
            error={errors.vehicleType?.message}
            required
          >
            <Select
              id="delivery-vehicle"
              options={[
                { value: 'MOTORCYCLE', label: 'Motorcycle' },
                { value: 'BAJAJ', label: 'Bajaj (Three-wheeler)' },
                { value: 'TRUCK', label: 'Truck (Heavy cargo)' },
                { value: 'VAN', label: 'Van / Pickup' },
                { value: 'BICYCLE', label: 'Bicycle' },
                { value: 'FOOT', label: 'Foot Courier (Local market)' },
              ]}
              {...register('vehicleType')}
            />
          </FormField>

          <FormField
            id="delivery-plate"
            label="Plate Number (If motorized)"
            error={errors.vehiclePlateNumber?.message}
          >
            <Input
              id="delivery-plate"
              placeholder="ET-3-88214"
              {...register('vehiclePlateNumber')}
            />
          </FormField>
        </div>

        {/* Service Area & License */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            id="delivery-service-area"
            label="Primary Service Corridor"
            error={errors.serviceArea?.message}
            hint="e.g. Turmi - Jinka, Omorate"
            required
          >
            <Input
              id="delivery-service-area"
              placeholder="Turmi - Dimeka Corridor"
              hasError={!!errors.serviceArea}
              leftIcon={<MapPin className="w-4 h-4" aria-hidden="true" />}
              {...register('serviceArea')}
            />
          </FormField>

          <FormField
            id="delivery-license"
            label="Driver License No (Optional)"
            hint="For motorized transport"
          >
            <Input
              id="delivery-license"
              placeholder="DL-SO-9921"
              leftIcon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
              {...register('licenseNumber')}
            />
          </FormField>
        </div>

        {/* Preferred Language */}
        <FormField id="delivery-lang" label="Preferred Language">
          <Select
            id="delivery-lang"
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
