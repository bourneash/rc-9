import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5600',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5600 --strictPort --open false',
    url: 'http://127.0.0.1:5600',
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  }
});
