import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Compass,
  User,
  Lock,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  Globe2,
} from 'lucide-react';
import { FormField, Input, PhoneInput, Button } from '../../components/common';
import { ethiopianPhoneSchema } from '../../utils/phone';
import { setServerErrors } from '../../utils/formErrors';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { authService } from '../../features/auth';
import type { NormalizedApiError } from '../../services/apiError';

const guideRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phoneNumber: ethiopianPhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  licenseNumber: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  dailyRate: z.number().min(0, 'Daily rate cannot be negative').optional(),
  currency: z.string(),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  preferredLanguage: z.string(),
});

type GuideRegisterFormValues = z.infer<typeof guideRegisterSchema>;

const AVAILABLE_LANGUAGES = [
  'English',
  'Amharic',
  'Hamer-Banna',
  'Dasenech',
  'Tsamai',
  'Kara',
  'French',
  'German',
  'Italian',
];

export default function RegisterGuidePage() {
  const [isSuccessPending, setIsSuccessPending] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English', 'Amharic']);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GuideRegisterFormValues>({
    resolver: zodResolver(guideRegisterSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      password: '',
      licenseNumber: '',
      bio: '',
      specialties: 'Cultural heritage, Bull jumping ceremonies, Photography tours',
      dailyRate: 1500,
      currency: 'ETB',
      email: '',
      preferredLanguage: 'en',
    },
  });

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

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
            'This phone number is already registered to a guide or user.',
        });
        return;
      }

      const unhandled = setServerErrors(setError, err);
      if (unhandled.length > 0) {
        setGeneralError(unhandled.join(', '));
      }
    },
  });

  const onSubmit = (values: GuideRegisterFormValues) => {
    setGeneralError(null);

    execute(async () => {
      await authService.registerGuide({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        password: values.password,
        licenseNumber: values.licenseNumber || undefined,
        bio: values.bio || undefined,
        languages: selectedLanguages,
        specialties: values.specialties || undefined,
        dailyRate: values.dailyRate,
        currency: values.currency || 'ETB',
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
            Guide Application Submitted: Pending Certification
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your tour guide profile for <strong className="text-foreground">{registeredPhone}</strong> has been received and is awaiting South Omo Tourism Authority review.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/40 text-left space-y-3 text-xs leading-relaxed">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" aria-hidden="true" />
            Licensing & Ethical Guiding Protocol
          </h2>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground">
            <li>South Omo Tourism Department verifies your guide license and local cultural competency.</li>
            <li>Our team will call or send an SMS confirmation once your profile is verified and active.</li>
            <li>Once certified, you will receive tourist booking requests directly and can set your tour calendar.</li>
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
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Screen 1: Registration Form
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Register as a Tour Guide</h1>
        <p className="text-sm text-muted-foreground">
          Offer guided cultural and eco-tours across South Omo communities.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <FormField id="guide-name" label="Full Name" required error={errors.fullName?.message}>
          <Input
            id="guide-name"
            {...register('fullName')}
            placeholder="e.g. Eyob Lemlem"
            leftIcon={<User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
            autoComplete="name"
          />
        </FormField>

        {/* Phone Number */}
        <FormField
          id="guide-phone"
          label="Phone Number"
          required
          error={errors.phoneNumber?.message}
          hint="We will notify you via SMS when your license is certified"
        >
          <PhoneInput
            id="guide-phone"
            {...register('phoneNumber')}
            hasError={!!errors.phoneNumber}
          />
        </FormField>

        {/* Password */}
        <FormField id="guide-password" label="Password" required error={errors.password?.message}>
          <Input
            id="guide-password"
            {...register('password')}
            type="password"
            placeholder="At least 6 characters"
            leftIcon={<Lock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
            autoComplete="new-password"
          />
        </FormField>

        {/* License Number */}
        <FormField
          id="guide-license"
          label="Tourism License / Guide ID Number"
          error={errors.licenseNumber?.message}
          hint="Regional or federal guide certification number if available"
        >
          <Input
            id="guide-license"
            {...register('licenseNumber')}
            placeholder="e.g. SNNPR-TG-2024-884"
            leftIcon={<FileCheck className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          />
        </FormField>

        {/* Spoken Languages */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Spoken Languages <span className="text-muted-foreground font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguages.includes(lang);
              return (
                <button
                  type="button"
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-border hover:border-foreground/40'
                  }`}
                  aria-pressed={isSelected}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Specialties */}
        <FormField
          id="guide-specialties"
          label="Specialties / Guiding Focus"
          error={errors.specialties?.message}
        >
          <Input
            id="guide-specialties"
            {...register('specialties')}
            placeholder="e.g. Bull jumping ceremonies, Hiking, Hamer cultural etiquette"
            leftIcon={<Globe2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          />
        </FormField>

        {/* Daily Rate */}
        <FormField
          id="guide-daily-rate"
          label="Daily Guiding Rate (ETB)"
          error={errors.dailyRate?.message}
          hint="Standard full-day guiding fee in Ethiopian Birr"
        >
          <Input
            id="guide-daily-rate"
            {...register('dailyRate', { valueAsNumber: true })}
            type="number"
            min="0"
            step="50"
            placeholder="1500"
            leftIcon={<Coins className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          />
        </FormField>

        {/* Bio */}
        <div className="space-y-1.5">
          <label htmlFor="bio" className="block text-sm font-medium text-foreground">
            Guide Bio & Experience
          </label>
          <textarea
            id="bio"
            {...register('bio')}
            rows={3}
            placeholder="Tell visitors about your background, tribal knowledge, and guiding experience in South Omo..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
        </div>

        {/* Email */}
        <FormField id="guide-email" label="Email (Optional)" error={errors.email?.message}>
          <Input
            id="guide-email"
            {...register('email')}
            type="email"
            placeholder="guide@example.com"
            autoComplete="email"
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          isLoading={isSubmitting}
        >
          Submit Guide Application
        </Button>
      </form>

      <div className="text-center text-xs text-muted-foreground pt-1">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
