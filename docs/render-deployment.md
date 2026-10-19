# Deploy OmoBridge to Render

The root `render.yaml` provisions a PostgreSQL database, Docker API, and React
static site. It defaults to free evaluation resources. Free PostgreSQL expires
after 30 days, and a free API can sleep. Upgrade both before production use.
No Render resources are created by merely adding these files.

## Deploy

1. Integrate and review all agents' work, resolve any Git conflicts, run the
   checks below, and push the intended deployment branch to GitHub. Local
   uncommitted changes are not deployed.
2. Generate a JWT secret locally with `openssl rand -base64 32`. Do not commit it.
3. In Render choose **New > Blueprint**, connect the repository, select the
   deployment branch, and use `render.yaml` at its root.
4. Review the service names, region and plans. The API and database must remain
   in the same region. The Blueprint prompts for:

   | Service | Variable | Value |
   | --- | --- | --- |
   | API | `JWT_SECRET` | Generated Base64 secret |
   | API | `CORS_ALLOWED_ORIGINS` | Exact frontend HTTPS origin; comma-separated if multiple |
   | Frontend | `VITE_API_BASE_URL` | API HTTPS origin, without `/api/v1` or a trailing slash |

   If assigned URLs are not yet available, use the expected service URLs for
   initial setup, then replace them with the actual URLs after provisioning.
   Render may add a suffix. Redeploy the API after changing CORS and rebuild the
   frontend after changing its API URL. Never use `*` as a credentialed origin.
5. Apply the Blueprint. Database credentials and internal host/port/database
   are connected automatically. Spring resolves the `${DB_HOST}`, `${DB_PORT}`
   and `${DB_NAME}` placeholders in `SPRING_DATASOURCE_URL` at startup; Render
   does not need to interpolate this string. Existing Flyway migrations run on
   startup. The `prod` profile keeps the development data seeder disabled.
6. Wait for the API to become healthy. Open its `/actuator/health`; expect
   `{"status":"UP"}`. Inspect Render logs if migrations or startup fail.
7. Check the frontend's actual API URL and API's actual CORS origin. Register
   a real test account; mock accounts are disabled and the new database is empty
   apart from migrations. Provision privileged users through your approved
   administrative workflow; do not enable the development seeder publicly.
8. Verify login, dashboard refresh/deep links, responsive navigation, logout,
   account switching, and applicable order/booking flows. Check browser Network
   and Console for CORS/CSP errors and requests to localhost.

## What the Blueprint configures

- Java 21 Docker build, non-root runtime, container memory limits for the JVM,
  a health check, port 10000, and a small database connection pool.
- Node 22 frontend build with mocks disabled and production artifact checks.
- SPA rewrite to `/index.html` and security response headers declared directly
  in Render, rather than relying on Render interpreting `dist/_headers`.
- The build-generated CSP meta tag includes the chosen API origin. The HTTP
  CSP adds `frame-ancestors 'self'`; both policies apply together. Changing the
  API origin therefore requires rebuilding, not editing a fixed CSP hostname.
- Public health output without database details; only health/info exposed.
- Database external access disabled through `ipAllowList: []`. For maintenance,
  temporarily allow only the necessary client IP and remove it afterwards.

## Checks before pushing

From `frontend`:

```sh
npm ci
npm test
npm run typecheck
npm run lint
VITE_API_BASE_URL=https://your-api.onrender.com VITE_USE_MOCKS=false npm run build
npm run security:check
```

From `backend`, with Java 21 and Docker available for integration tests:

```sh
./mvnw test
docker build -t omobridge-api .
```

Validate `render.yaml` using Render's Blueprint setup validation or its CLI.
Infrastructure readiness is separate from unfinished product tasks and the
release findings in `docs/frontend-security-review.md`. Reverify the recorded
booking logout privacy finding before exposing real customer data.

## Updates and domains

Use one reviewed deployment branch for both services. Configure automatic
deployment according to the team's release workflow. Back up persistent data
before schema changes; rolling back application code does not undo migrations.
When adding a frontend custom domain, update CORS. When changing the API domain,
update `VITE_API_BASE_URL` and rebuild. Keep secrets in Render's environment UI.

References: [Blueprint specification](https://render.com/docs/blueprint-spec),
[free resource limits](https://render.com/docs/free),
[static headers](https://render.com/docs/static-site-headers),
[monorepo support](https://render.com/docs/monorepo-support).
