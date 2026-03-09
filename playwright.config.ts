import { defineConfig } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3100';
const healthPath = process.env.SMOKE_HEALTH_PATH ?? '/health';
const serverCommand = process.env.SMOKE_SERVER_COMMAND;
const startupTimeout = Number.parseInt(process.env.SMOKE_STARTUP_TIMEOUT ?? '60000', 10);

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/playwright-report' }],
  ],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: serverCommand
    ? {
        command: serverCommand,
        cwd: process.cwd(),
        url: `${baseURL}${healthPath}`,
        reuseExistingServer: !process.env.CI,
        timeout: startupTimeout,
      }
    : undefined,
  globalSetup: './tests/playwright/global.setup.ts',
});
