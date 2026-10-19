import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Languages, Save, ShieldCheck } from 'lucide-react';
import { Card } from '../../../components/common';
import { guideKeys, guideService } from '../../../features/guide/guideService';
import type { GuideProfileRequest } from '../../../types/api';

/** Comma-separated entry -> the string list the API expects. */
const parseLanguages = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

type ProfileForm = {
  bio: string;
  languages: string;
  specialties: string;
  dailyRate: string;
  isAvailable: boolean;
};

const toFormValues = (source: {
  bio?: string;
  languages?: string[];
  specialties?: string;
  dailyRate?: number | string;
  isAvailable?: boolean;
}): ProfileForm => ({
  bio: source.bio ?? '',
  languages: (source.languages ?? []).join(', '),
  specialties: source.specialties ?? '',
  dailyRate: source.dailyRate === undefined || source.dailyRate === null ? '' : String(source.dailyRate),
  isAvailable: source.isAvailable ?? true,
});

export default function GuideProfilePage() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: guideKeys.profile(),
    queryFn: () => guideService.getMyProfile(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ProfileForm>({ defaultValues: toFormValues({}) });

  useEffect(() => {
    if (profile) reset(toFormValues(profile));
  }, [profile, reset]);

  const save = useMutation({
    mutationFn: (values: ProfileForm) => {
      // The guide id always comes from the server's view of the caller.
      // It is never read from the route or from user input, so a guide cannot
      // address another guide's record even before the server refuses it.
      const guideId = profile?.id;
      if (!guideId) throw new Error('No guide profile is associated with this account.');

      const payload: GuideProfileRequest = {
        bio: values.bio.trim(),
        languages: parseLanguages(values.languages),
        specialties: values.specialties.trim(),
        dailyRate: values.dailyRate === '' ? undefined : Number(values.dailyRate),
        isAvailable: values.isAvailable,
      };
      return guideService.updateProfile(guideId, payload);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(guideKeys.profile(), updated);
      void queryClient.invalidateQueries({ queryKey: guideKeys.bookings(updated.id ?? '') });
      void queryClient.invalidateQueries({ queryKey: guideKeys.reviews(updated.id ?? '') });
    },
  });

  const onSubmit = handleSubmit((values) => save.mutate(values));

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4" data-testid="guide-profile-loading">
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="h-24 w-full rounded bg-muted animate-pulse" />
        <div className="h-10 w-32 rounded bg-muted animate-pulse" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 space-y-3" data-testid="guide-profile-error">
        <h2 className="text-lg font-bold text-foreground">Profile unavailable</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Your guide profile could not be loaded.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="touch-target px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Try again
        </button>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="p-6" data-testid="guide-profile-empty">
        <h2 className="text-lg font-bold text-foreground">No guide profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This account is not linked to a tour guide profile. Register as a guide to manage your
          bio, languages, rate and availability.
        </p>
      </Card>
    );
  }

  const readOnly = profile.verificationStatus === 'REJECTED' || profile.verificationStatus === 'SUSPENDED';

  return (
    <div className="space-y-6" data-testid="guide-profile">
      <Card className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Guide Profile</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile.fullName} · {profile.phoneNumber}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            {profile.verificationStatus || 'PENDING'}
          </span>
        </div>

        {readOnly && (
          <p
            className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2"
            data-testid="guide-profile-readonly"
          >
            Your licence status is {(profile.verificationStatus || 'PENDING').toLowerCase()}.
            Editing is disabled until an administrator reviews your account.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="guide-bio" className="text-sm font-medium text-foreground">
              Bio
            </label>
            <textarea
              id="guide-bio"
              rows={4}
              disabled={readOnly}
              {...register('bio')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
              placeholder="Describe your experience guiding visitors through South Omo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="guide-languages" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                Languages
              </label>
              <input
                id="guide-languages"
                type="text"
                disabled={readOnly}
                {...register('languages')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                placeholder="Amharic, English, Hamer"
              />
              <p className="text-xs text-muted-foreground">Separate each language with a comma.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="guide-specialties" className="text-sm font-medium text-foreground">
                Expertise
              </label>
              <input
                id="guide-specialties"
                type="text"
                disabled={readOnly}
                {...register('specialties')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                placeholder="Cultural ceremonies, bird watching, coffee ceremony"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="guide-rate" className="text-sm font-medium text-foreground">
                Daily rate (ETB)
              </label>
              <input
                id="guide-rate"
                type="number"
                min={0}
                step="0.01"
                disabled={readOnly}
                {...register('dailyRate')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Availability
              </span>
              <label className="flex items-center gap-2 text-sm text-foreground mt-2">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  {...register('isAvailable')}
                  className="h-4 w-4 rounded border-border"
                />
                Available for new bookings
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={readOnly || !isDirty || save.isPending}
              className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              data-testid="guide-profile-save"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
            {save.isSuccess && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400" data-testid="guide-profile-saved">
                Profile saved
              </span>
            )}
            {save.isError && (
              <span className="text-sm text-red-600 dark:text-red-400" data-testid="guide-profile-save-error">
                {save.error instanceof Error ? save.error.message : 'Save failed'}
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
