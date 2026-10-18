import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration — F-1107.
 *
 * NOT ACTIVE. `@playwright/test` is not installed in this repository, so this config is a
 * deliverable for Codex to wire up rather than something that currently runs. See
 * `docs/handoffs/F-1107.md`.
 *
 * F-1107, F-1505 (OpenCode), F-1703 (Codex) and F-1704 (Kiro) all need this, so the
 * configuration is deliberately conservative: one project for a phone-sized viewport, since
 * the app targets 360 px devices, and no retries so a failure is reported honestly.
 */
export default defineConfig({
  testDir: './e2e',
  /*
   * `*.e2e.ts` rather than `*.spec.ts`: Vitest's default `include` matches `**/*.spec.ts`, so a
   * Playwright spec in this directory would be picked up by `npm test` and fail on the missing
   * `@playwright/test` import. Using an explicit suffix keeps the e2e specs out of the unit
   * run without touching vite.config.ts, which is a shared build file.
   */
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      // The delivery provider app is used on low-end Android handsets.
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});