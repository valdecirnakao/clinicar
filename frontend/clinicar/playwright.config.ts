import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4301',
    headless: true,
    ...(process.env['CI'] ? {} : { channel: 'chrome' }),
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node node_modules/@angular/cli/bin/ng.js serve --host=127.0.0.1 --port=4301',
    url: 'http://127.0.0.1:4301',
    reuseExistingServer: false,
    timeout: 120000
  }
});
