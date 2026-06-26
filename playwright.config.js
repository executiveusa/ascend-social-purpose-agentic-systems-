export default {
  testDir: './tests/e2e',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000' },
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
};
