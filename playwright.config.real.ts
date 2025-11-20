import type { PlaywrightTestConfig } from '@playwright/test';
import baseConfig from './playwright.config';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  webServer: undefined,
};

export default config;
