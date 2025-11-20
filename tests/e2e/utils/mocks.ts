import type { Page, Route } from '@playwright/test';

export const shouldMock = process.env.E2E_USE_API !== 'true';

const registeredRoutes: Route[] = [];

export async function mockApiRoute(
  page: Page,
  url: string | RegExp,
  handler: Parameters<Page['route']>[1]
) {
  if (!shouldMock) {
    return;
  }
  await page.route(url, async (route, request) => {
    registeredRoutes.push(route);
    await handler(route, request);
  });
}

export function clearRegisteredRoutes() {
  registeredRoutes.length = 0;
}
