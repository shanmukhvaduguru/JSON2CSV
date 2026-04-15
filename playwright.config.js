// playwright.config.js — Json2excel E2E test configuration
// CommonJS — no ESM
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // CRITICAL: workers must be 1.
  // express-session uses MemoryStore (in-process). Parallel workers share
  // the same server process, so sessions from one worker bleed into another.
  // Single worker keeps tests deterministic without needing a database.
  fullyParallel: false,
  workers: 1,

  // Retry once in CI to tolerate transient timing issues
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    // Capture trace on first retry — open playwright-report/index.html to view
    trace: 'on-first-retry',
    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Playwright starts the dev server automatically before any test runs.
  // Locally: reuses an already-running server to keep the inner loop fast.
  // CI: always starts fresh.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
