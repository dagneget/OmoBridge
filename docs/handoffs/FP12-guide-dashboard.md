# FP12 — Tour Guide Dashboard (F-1201, F-1202, F-1203, F-1204)

Task IDs: F-1201, F-1202, F-1203, F-1204 · Phase: FP12 · Owner: @opencode
Date: 2026-10-19 · Source: `f03f240` (implementation swept into this commit by a concurrent checkout commit; board/handoff update follows separately)

## Shared-file patch required: none

This is the important line for integration. **`routes/index.tsx` and `components/layout/DashboardLayout.tsx` were not edited**, so there is nothing for Codex to reconcile.

The shared router already maps both `/dashboard/guide` and `/dashboard/guide/*` to `GuideDashboardPage` behind a `RoleGuard allowedRoles={[Roles.TOUR_GUIDE, Roles.SYSTEM_ADMIN]}`. The new sections are selected from the current path *inside* that component, and navigation is an in-page tab bar. Guide query keys live in `features/guide/guideService.ts` rather than in the shared `services/queryKeys.ts`, and fixtures live in `mocks/fixtures/guide.ts` rather than in shared fixtures.

Existing sidebar entries (`Assigned Tours` → `/dashboard/guide`, `Availability Calendar` → `/dashboard/guide/sessions`) keep working; the `/sessions` path renders an explicit placeholder because availability management is outside FP12.

## Changed areas (all new or guide-scoped)

| File | Change |
|---|---|
| `src/features/guide/guideService.ts` | New. Five API calls plus local `guideKeys` |
| `src/pages/dashboard/GuideDashboardPage.tsx` | 12-line stub → tabbed shell dispatching by path |
| `src/pages/dashboard/guide/GuideProfilePage.tsx` | New (F-1201) |
| `src/pages/dashboard/guide/GuideBookingsPage.tsx` | New (F-1202) |
| `src/pages/dashboard/guide/GuideReviewsPage.tsx` | New (F-1203) |
| `src/mocks/fixtures/guide.ts` | New. Profile, assigned bookings, reviews |
| `src/mocks/handlers.ts` | Four handlers added, registered **before** the generic guide list so `/me` is not swallowed |
| `src/test/guideDashboard.test.tsx` | New. 15 cases (F-1204) |

## Generated-type API endpoints used

| Task | Endpoint | Auth on the server |
|---|---|---|
| F-1201 | `GET /api/v1/tourism/guides/me` | `hasRole('TOUR_GUIDE')` |
| F-1201 | `PUT /api/v1/tourism/guides/{id}` | `isAssignedGuide or ADMIN` |
| F-1202 | `GET /api/v1/bookings/guides/{guideId}` | `isAssignedGuide or ADMIN` |
| F-1202 | `PATCH /api/v1/bookings/{id}/status` | admin \| enterprise \| buyer \| guide |
| F-1203 | `GET /api/v1/reviews/public/target?targetType=GUIDE&targetId=` | public |

No endpoint was invented. Types come from `api.generated.ts` (`GuideResponse`, `GuideProfileRequest`, `BookingResponse`, `ReviewSummaryResponse`); the generated file was **not** modified.

## Isolation properties

- **F-1201:** the guide id used for `PUT` is read only from the `/me` response. It never comes from a route parameter or user input, so a guide cannot address another guide's record client-side even before the server's `isAssignedGuide` check refuses it. Tested directly.
- **F-1202:** bookings come from the guide-scoped endpoint, not `GET /bookings/my`, which returns the caller's bookings *as a buyer*. Tested by asserting the guide id passed.
- **F-1203:** no payment amounts are computed or guessed client-side.

## Backend gaps

**F-1203-P1 (open)** — no guide payments endpoint exists anywhere in the backend. The task said "where the API provides them", so reviews render and payments show an explicit unavailable notice naming the gap. Recorded in `frontend-plan.md` §10.

## Verification

Run:

```
npm run typecheck
npx oxlint src/features/guide src/pages/dashboard/guide src/pages/dashboard/GuideDashboardPage.tsx src/mocks/fixtures/guide.ts src/test/guideDashboard.test.tsx
npx vitest run src/test/guideDashboard.test.tsx
npm test
```

Results: typecheck clean · oxlint clean on changed files · guide suite **15/15 passed** · full suite **93 files / 853 tests** green on repeated runs.

Four-state coverage (loading / error / empty / success) is asserted for each of profile, bookings and reviews.

**Not verified by me — outstanding:** no real 360 px viewport, keyboard-only or axe browser check was run for these screens, and no physical-device pass. Those remain before FP12 can be called release-ready. An intermittent `payBooking.test.tsx` (F-405) failure was observed during full-suite runs; it has zero references to guide code and passed 6/6 in isolation, and the file was being edited concurrently in the same checkout at the time. It should be re-confirmed against a clean baseline rather than assumed mine or pre-existing.
