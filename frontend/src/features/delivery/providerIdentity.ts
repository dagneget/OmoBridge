import type { UserProfileResponse } from '../../types/api';

/**
 * The delivery job list endpoint is keyed by `DeliveryProvider.id`:
 *
 *   GET /api/v1/delivery/providers/{providerId}/jobs
 *
 * That id is NOT the signed-in `User.id`. `DeliveryService.getProviderJobs` looks the
 * provider up with `findWithUserById(providerId)`, so passing the profile id would 404
 * with "Provider not found".
 *
 * The problem: `/api/v1/auth/me` returns `UserProfileResponse`, which exposes
 * `enterpriseId` and `farmerCode` but has no provider field, and the backend has no
 * `GET /api/v1/delivery/providers/me` route (guides do have
 * `GET /api/v1/tourism/guides/me`). Tracked as gap F-1101-E1 in
 * `docs/frontend-plan.md` Section 10.
 *
 * Until the contract lands we read an optional `deliveryProviderId` off the profile.
 * When it is absent we return null so the screen can show an explicit, actionable
 * configuration error. We deliberately do NOT fall back to `user.id`, because that
 * would silently call the wrong URL and mask the missing contract behind a 404.
 */
export type ProviderProfile = UserProfileResponse & {
  deliveryProviderId?: string;
};

/**
 * Resolve the signed-in provider's own `DeliveryProvider.id`.
 *
 * Returns null when the backend has not supplied the field yet. Callers must treat that
 * as a known contract gap, not as "no jobs".
 */
export function resolveProviderId(user: UserProfileResponse | null | undefined): string | null {
  if (!user) return null;
  const candidate = (user as ProviderProfile).deliveryProviderId;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
}

/**
 * Owner shown on a job card. The backend fills `providerName` from the provider record,
 * so prefer it and fall back to the signed-in user's own name.
 */
export function resolveProviderDisplayName(
  user: UserProfileResponse | null | undefined,
  fallback?: string | null
): string {
  return user?.fullName?.trim() || fallback?.trim() || '';
}