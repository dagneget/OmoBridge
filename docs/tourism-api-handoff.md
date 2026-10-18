# Tourism API handoff for frontend development

Reviewed 2026-10-18 against controllers, services, and the committed generated
OpenAPI types. This is a source audit, not a live integration certification.
The backend was unavailable at `http://localhost:8080/v3/api-docs` during review.
No frontend files, shared task boards, application behavior, or database data
were changed for this handoff.

## Public reads

All paths below are GET requests. SecurityConfig permits these tourism reads
without a token, except the explicitly protected guide `/me` route.
Responses use `ApiResponse<T>`; list data is an array, not a paginated envelope.

| Screen/task | Path | Parameters | Generated data schema |
|---|---|---|---|
| Home/package list, F-301/F-302 | `/api/v1/tourism/packages` | Optional `category`; `lang` defaults to `en` | `TourPackageResponse[]` |
| Package detail, F-303 | `/api/v1/tourism/packages/{id}` | UUID `id`; `lang` defaults to `en` | `TourPackageResponse` |
| Session selector, F-401 | `/api/v1/tourism/packages/{packageId}/sessions` | UUID `packageId`; optional ISO date `date=YYYY-MM-DD` | `SessionResponse[]` |
| Hotels, F-305 | `/api/v1/tourism/hotels` | None declared | `Hotel[]` |
| Hotel detail | `/api/v1/tourism/hotels/{id}` | UUID `id` | `Hotel` |
| Transport, F-306 | `/api/v1/tourism/transports` | None declared | `TransportService[]` |
| Guides, F-307 | `/api/v1/tourism/guides` | None declared | `GuideResponse[]` |
| Guide detail | `/api/v1/tourism/guides/{id}` | UUID `id` | `GuideResponse` |
| Safety, F-308 | `/api/v1/tourism/guidelines` | None declared | `SafetyGuideline[]` |

Import types through the existing frontend type exports or derive them from
`components['schemas']` in `frontend/src/types/api.generated.ts`. Do not duplicate
DTO definitions or hand-edit generated types. Hotel, transport, and safety
controllers currently return entities; the table describes the shipped schema,
not an endorsement of that backend pattern.

## Behavior that affects the screens

- Package listing returns active packages. Category matching is normalized with
  uppercase and trimming. No search, page, page-size, or sort parameter is
  declared by this controller. Do not build server pagination against invented
  parameters.
- Missing or inactive package details throw `ResourceNotFoundException`.
- Use `?lang=am` or `?lang=en` explicitly for packages. The controller does not
  bind `Accept-Language`. The service translates name, overview, story,
  culturalRules, and safetyNotes. Its fallback is requested language → English
  translation → stored field, which differs from the frontend's required
  selected language → Amharic → English fallback. Keep this as a backend gap.
- Sessions return one date only. Omitting `date` selects `LocalDate.now()` on
  the server; it does not return all future sessions. Include the selected date
  in both the request and query cache key.
- The session read does not validate that the package exists or is active and
  does not filter by session status. An empty array cannot establish that a
  package exists. Display availability from the returned `availableCapacity`
  and status; booking acceptance and final pricing remain backend decisions.
- Package details include coordinates and pricing fields, but no image/gallery
  field in `TourPackageResponse`. Do not infer photo URLs from identifiers.
- Use the server price and currency for display. A displayed package price is
  not an authoritative booking total.

## Existing mock and documentation gaps

These are observed gaps for the next owner to reconcile. This handoff leaves
shared mocks untouched to avoid colliding with active frontend work.

| Location | Observation | Required follow-up |
|---|---|---|
| `docs/api.md` tourism section | Describes `/tourism/experiences` | Use the controller/generated `/tourism/packages` paths |
| `frontend/src/mocks/handlers.ts` | Transport handler uses `/tourism/transport` | Align with plural `/tourism/transports` |
| `frontend/src/mocks/handlers.ts` | No package sessions handler | Add a generated-type-based handler before session UI work |
| Package detail mock | Unknown IDs fall back to the first package | Return a realistic not-found response for unknown IDs |
| Package list mock | Does not apply category/language parameters | Exercise filters and translated/absent translations explicitly |
| `frontend/src/mocks/fixtures/catalog.ts` | IDs such as `pack-001` are not UUIDs | Use UUID fixtures before testing against the real backend |
| Backend guide `/me` | Requires `TOURISM_GUIDE`; canonical role is `TOUR_GUIDE` | Review and test backend role correction before guide dashboard work |
| Backend guide update | Has an `ADMIN` alternative | Review intended authorization; canonical admin is `SYSTEM_ADMIN` |

## Suggested frontend handoff sequence

1. Build the tourism feature API functions using generated types and the existing
   HTTP client. Keep pages thin and expose feature access through `index.ts`.
2. Include category and language in list query keys, and ID and language in
   detail keys. Do not assume server pagination.
3. Cover loading, empty, error, and offline states. Cover unknown/inactive
   package detail and no sessions for the selected date.
4. Align mocks in the same task that consumes them, after checking ownership of
   those shared files. Use valid UUIDs and realistic not-found behavior.
5. When the backend is running, regenerate/check OpenAPI types and verify public
   reads anonymously. Run the existing tourism/booking integration suite against
   its Testcontainers database before calling the integration verified.

## Verification and source references

Source mappings and schema names were checked against the committed generated
types. No runtime tests were run for this documentation-only change; a running
backend, JSON serialization, database history, and actual seed content remain
unverified.

- [Tour package controller](../backend/src/main/java/com/omobridge/tourism/api/TourPackageController.java)
- [Tour package service](../backend/src/main/java/com/omobridge/tourism/service/TourPackageService.java)
- [Session controller](../backend/src/main/java/com/omobridge/tourism/api/TourAvailabilitySessionController.java)
- [Session service](../backend/src/main/java/com/omobridge/tourism/service/TourAvailabilitySessionService.java)
- [Translation fallback](../backend/src/main/java/com/omobridge/common/translation/TranslationService.java)
- [Security configuration](../backend/src/main/java/com/omobridge/config/SecurityConfig.java)
- [Generated contract](../frontend/src/types/api.generated.ts)
- [Existing mocks](../frontend/src/mocks/handlers.ts)
- [Existing tourism/booking tests](../backend/src/test/java/com/omobridge/bookings/TourismAndBookingIntegrationTest.java)
