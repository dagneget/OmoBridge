# F-1706 frontend security review

Reviewed 2026-10-19 on the isolated Codex integration branch. This completes the frontend review checklist; it does **not** approve production release. The booking privacy finding below remains open with the allocated cache-cleanup owner. No live accounts, payments, production deployment or other agent's active source checkout were changed.

## Findings and remaining release work

| ID | Severity | Finding and evidence | Next action / owner |
|---|---|---|---|
| SEC-01 | High | A loaded booking confirmation remains visible after logout. `BookingConfirmationPage` uses `['booking', bookingId]` without account scope, and its public route keeps the component mounted. Firefox with demo data confirms `bookingDetailsRemainAfterLogout: true`. This is a browser-cache/UI privacy issue; no backend ownership bypass is claimed. | OpenCode F-110 cache/privacy cleanup: account-scope and guard private booking reads, abort old reads, remove old private queries on session changes, and hide details immediately on logout or buyer mismatch. Preserve the existing allocated task ownership. Add logout/account-switch regression tests before release. |
| SEC-02 | Medium | ADR-004 stores bearer tokens and the user profile in localStorage. Logout removes those entries; old-token bootstrap/401 responses are guarded. JavaScript can still read stored credentials, so CSP does not make this storage equivalent to an httpOnly session. | Keep the current dev contract explicit. Coordinate any Secure/httpOnly/SameSite cookie and CSRF/session-rotation change with the backend; do not silently change client authentication. |
| SEC-03 | Deployment gate | Production HTML now enforces CSP. The generated `dist/_headers` additionally supplies `frame-ancestors`, nosniff, referrer and permissions policies. Vite preview does not interpret `_headers`; the actual hosting provider must honor it or install equivalent response headers. | Deployment owner must verify the real HTTPS response headers and required API/map/media functionality. A meta CSP cannot enforce `frame-ancestors`. |
| SEC-04 | Deployment gate | The unchanged local default API is `http://localhost:8080`. It is an explicit CSP connection origin in local production-preview builds. | Build release artifacts with the intended HTTPS `VITE_API_BASE_URL`, or `/` with a same-origin API reverse proxy. Verify backend CORS. Do not deploy the loopback development setting. |

## Changes delivered

- Production mock handlers and their demo token/password fixtures are no longer imported eagerly. With mocks disabled, the build removes their dynamic import branches. Explicit mock builds remain available for local demos; they fail the release artifact credential check.
- The error boundary no longer keeps/displays raw exceptions. React root caught, uncaught and recoverable error callbacks log one fixed message without the error object, component stack, token, request body or personal data. Recovery text is English/Amharic and no longer makes an unverified claim that user data is safe.
- A build-only Vite plugin generates an enforced meta CSP and hosting `_headers`. Scripts allow only `'self'`, with no inline script or eval exception. Connections allow only self plus the configured API origin. Objects, base tags and nested frames are blocked; forms remain same-origin. Maps currently require inline styles, so `style-src` explicitly allows them. HTTPS catalog images remain allowed. Camera and geolocation remain same-origin for QR/location features.
- Production source maps are explicitly disabled. `npm run security:check` scans the built output for missing/weakened script policy, missing deployment-header artifacts, published maps/map references, mock credentials, private-key markers, AWS access-key patterns and JWT literals. Failures print paths and finding labels, never the matched credential. These are bounded pattern checks, not a guarantee that every possible secret is absent.

## Checklist and evidence

- [x] CSP reviewed and production policy exercised in Firefox: app loads; an appended inline script and an unapproved connection are blocked with `script-src-elem` and `connect-src` violation events.
- [x] XSS/rendering reviewed: no untrusted HTML insertion/eval sinks found in application feature/page/service sources. Leaflet attribution is a static authored HTML string. A review containing an HTML event-handler payload renders as text in My reviews; no image node or handler execution occurs.
- [x] Token and session handling reviewed: localStorage token/profile entries and logout cleanup inspected; existing stale-token/session tests remain in the suite. Residual storage risk and booking-cache defect are recorded above.
- [x] Dependency audit executed against the npm registry, including dev dependencies: **0 known vulnerabilities**. Metadata and lockfile SHA-256 are preserved in [frontend-dependency-audit.json](frontend-dependency-audit.json). This is a point-in-time advisory result.
- [x] Production artifact scan passed; default production output contains no detected mock credentials, supported secret patterns, source maps or map references.
- [x] Application logging reviewed and error-object logging removed; focused tests verify that synthetic token/phone/password content reaches neither fallback text nor the application's error logger.
- [x] Source-map policy is explicit in build config and enforced by artifact checks. Private diagnostic maps, if later needed, require a separate authenticated upload workflow.
- [x] Regression tests cover safe recovery, Amharic text, allowed/unsafe API configuration, artifact failures and credential redaction. Verification passed: **730 frontend tests in 79 files**, typecheck, lint, production build, and `security:check` (124 artifact files). Only the existing enterprise inspection lint warnings remain. The previous oversized mock-containing main bundle is no longer shipped in the default production build.

The 360 px Firefox checks use the real production bundle for CSP and dev MSW fixtures for the review-XSS and logout-cache reproductions. Reproduction artifacts are ignored under `.tmp-verification/f1706-*`. They contain no live user data. The production preview's temporary host page is removed after the check.

## Verification and use

From `frontend/`, run `npm run build`, `npm run security:check`, `npm run test`, `npm run typecheck`, and `npm run lint`. Re-run `npm audit --package-lock-only --json` when dependencies or advisories change. Build with mocks disabled for release checks. Preserve the source-map and script-policy checks when adapting hosting configuration. The artifact gate is available as an npm script; no CI pipeline or deployed header enforcement is claimed by this task.

References: [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), and [OWASP HTML5 storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html). These support the policy and storage limitations; repository tests and browser evidence support the implementation findings.
