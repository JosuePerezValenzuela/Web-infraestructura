import { defineConfig, devices } from '@playwright/test';
import path from 'path';

function loadDotEnv(file: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv') as typeof import('dotenv');
    dotenv.config({ path: path.resolve(process.cwd(), file) });
  } catch {
    // If dotenv is not installed, skip loading and rely on process.env as-is.
  }
}

['.env.local', '.env'].forEach(loadDotEnv);

const frontendHost = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost';
const frontendPort = process.env.NEXT_PUBLIC_FRONTEND_PORT ?? '3001';

function buildFrontendBase(host: string, port: string) {
  try {
    const url = new URL(host);
    if (port) url.port = port;
    return url.origin;
  } catch {
    const base = host.replace(/\/$/, '').replace(/:$/, '');
    const portSegment = port ? `:${port}` : '';
    return `${base}${portSegment}`;
  }
}

const resolvedBaseUrl =
  process.env.E2E_BASE_URL ??
  buildFrontendBase(frontendHost, frontendPort);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: resolvedBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: resolvedBaseUrl,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
