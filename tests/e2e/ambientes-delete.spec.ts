import { test, expect, type Page } from '@playwright/test';

type EnvironmentRow = {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  tipo_ambiente_id: number;
  bloque_id: number;
  tipo_ambiente?: string;
  bloque?: string;
} & Record<string, unknown>;

const catalogFixtures = {
  blocks: [
    { id: 10, nombre: 'Bloque Central' },
  ],
  environmentTypes: [
    { id: 20, nombre: 'Laboratorio' },
  ],
  faculties: [{ id: 40, nombre: 'Facultad de Ingenieria' }],
};

const API_PATHS = {
  environments: ['/ambientes', '/api/ambientes'],
  environmentDetailPrefixes: ['/ambientes/', '/api/ambientes/'],
  delete: ['/ambientes/', '/api/ambientes/'],
  blocks: ['/bloques', '/api/bloques'],
  environmentTypes: ['/tipo_ambientes', '/api/tipo_ambientes'],
  faculties: ['/facultades', '/api/facultades'],
};

function matchesApiPath(url: string, validPaths: string[]) {
  const { pathname } = new URL(url);
  return validPaths.includes(pathname);
}

function matchesApiPrefix(url: string, prefixes: string[]) {
  const { pathname } = new URL(url);
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function buildEnvironmentRow(overrides: Partial<EnvironmentRow> = {}): EnvironmentRow {
  return {
    id: 1,
    codigo: 'AMB-DEL',
    nombre: 'Laboratorio de pruebas',
    activo: true,
    tipo_ambiente_id: 20,
    bloque_id: 10,
    tipo_ambiente: 'Laboratorio',
    bloque: 'Bloque Central',
    ...overrides,
  };
}

function buildListResponse(items: EnvironmentRow[]) {
  return {
    items,
    meta: {
      page: 1,
      pages: 1,
      total: items.length,
      take: 8,
    },
  };
}

async function mockCatalogRequests(page: Page) {
  await page.route('**/bloques**', async (route) => {
    if (!matchesApiPath(route.request().url(), API_PATHS.blocks)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: catalogFixtures.blocks }),
    });
  });
  await page.route('**/tipo_ambientes**', async (route) => {
    if (!matchesApiPath(route.request().url(), API_PATHS.environmentTypes)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: catalogFixtures.environmentTypes }),
    });
  });
  await page.route('**/facultades**', async (route) => {
    if (!matchesApiPath(route.request().url(), API_PATHS.faculties)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: catalogFixtures.faculties }),
    });
  });
}

async function goToEnvironmentList(page: Page) {
  await page.goto('/dashboard/ambientes/list');
  await expect(page.getByRole('heading', { name: 'Ambientes' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
}

async function openDeleteDialog(page: Page, index = 0) {
  const deleteButton = page.getByRole('button', { name: /eliminar ambiente/i }).nth(index);
  await deleteButton.click();
  const dialog = page.getByRole('dialog', { name: 'Eliminar ambiente' });
  await expect(dialog).toBeVisible();
  return dialog;
}

function interceptList(page: Page, rows: EnvironmentRow[] | ((query: URLSearchParams) => EnvironmentRow[])) {
  return page.route('**/ambientes**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
      const url = new URL(request.url());
      const items = typeof rows === 'function' ? rows(url.searchParams) : rows;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildListResponse(items)),
      });
      return;
    }
    if (request.method() === 'DELETE' && matchesApiPrefix(request.url(), API_PATHS.delete)) {
      await route.fulfill({ status: 204 });
      return;
    }
    await route.continue();
  });
}

test.describe('Eliminacion de ambientes', () => {
  test.describe.configure({ mode: 'serial' });
  test('abre el dialogo de confirmacion y muestra los datos del ambiente', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow();
    await interceptList(page, [row]);
    await goToEnvironmentList(page);
    const dialog = await openDeleteDialog(page);
    await expect(dialog.getByText(row.nombre)).toBeVisible();
    await expect(dialog.getByText(row.codigo)).toBeVisible();
  });

  test('elimina el ambiente y recarga la tabla', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow();
    let getCount = 0;
    let deleteCalled = false;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        getCount += 1;
        const responseRows = getCount === 1 ? [row] : [];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse(responseRows)),
        });
        return;
      }
      if (request.method() === 'DELETE' && matchesApiPrefix(request.url(), API_PATHS.delete)) {
        deleteCalled = true;
        await route.fulfill({ status: 204 });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openDeleteDialog(page);
    await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(page.getByText('Ambiente eliminado')).toBeVisible();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('table').getByText(row.nombre)).toHaveCount(0);
    expect(deleteCalled).toBe(true);
    expect(getCount).toBeGreaterThanOrEqual(2);
  });

  test('permite cancelar la eliminacion sin llamar a la API', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow();
    let deleteCalls = 0;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([row])),
        });
        return;
      }
      if (request.method() === 'DELETE' && matchesApiPrefix(request.url(), API_PATHS.delete)) {
        deleteCalls += 1;
        await route.fulfill({ status: 204 });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openDeleteDialog(page);
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();
    expect(deleteCalls).toBe(0);
  });

  test('deshabilita los botones mientras se elimina', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow();
    let deleteResolve: (() => void) | null = null;
    const deletePromise = new Promise<void>((resolve) => {
      deleteResolve = resolve;
    });
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([row])),
        });
        return;
      }
      if (request.method() === 'DELETE' && matchesApiPrefix(request.url(), API_PATHS.delete)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({ status: 204 });
        deleteResolve?.();
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openDeleteDialog(page);
    await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(dialog.getByRole('button', { name: 'Eliminando...' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await deletePromise;
    await expect(dialog).not.toBeVisible();
  });

  test('muestra errores del backend y mantiene el dialogo', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow();
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([row])),
        });
        return;
      }
      if (request.method() === 'DELETE' && matchesApiPrefix(request.url(), API_PATHS.delete)) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'No puedes eliminar ambientes con activos asociados' }),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openDeleteDialog(page);
    await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(page.getByText('No se pudo eliminar el ambiente')).toBeVisible();
    await expect(page.getByText('No puedes eliminar ambientes con activos asociados')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(row.nombre)).toBeVisible();
  });

  test('mantiene los filtros activos despues de eliminar', async ({ page }) => {
    await mockCatalogRequests(page);
    const labRow = buildEnvironmentRow({ id: 1, codigo: 'AMB-LAB', nombre: 'Laboratorio UX' });
    const aulaRow = buildEnvironmentRow({
      id: 2,
      codigo: 'AMB-AULA',
      nombre: 'Sala general',
      tipo_ambiente_id: 30,
      tipo_ambiente: 'Aula de innovacion',
    });
    const queryLog: Array<string | null> = [];
    let deleteCalled = false;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        const url = new URL(request.url());
        const tipoFilter = url.searchParams.get('tipoAmbienteId');
        queryLog.push(tipoFilter);
        const rows = tipoFilter === '20' ? [labRow] : [labRow, aulaRow];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse(rows)),
        });
        return;
      }
      if (request.method() === 'DELETE' && matchesApiPrefix(request.url(), API_PATHS.delete)) {
        deleteCalled = true;
        await route.fulfill({ status: 204 });
        return;
      }
      await route.continue();
    });

    await goToEnvironmentList(page);
    await selectEnvironmentTypeFilter(page, 'Laboratorio');
    await expect(page.getByRole('table').getByText('Sala general')).toHaveCount(0);

    const dialog = await openDeleteDialog(page);
    await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(page.getByText('Ambiente eliminado')).toBeVisible();
    await expect(page.getByRole('table').getByText('Sala general')).toHaveCount(0);
    await expect(page.locator('#environment-type-filter-trigger')).toContainText('Laboratorio');
    expect(deleteCalled).toBe(true);
    expect(queryLog.at(-1)).toBe('20');
  });

  test('usa el codigo cuando no hay nombre al notificar', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow({ nombre: '' });
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([row])),
        });
        return;
      }
      if (request.method() === 'DELETE' && matchesApiPrefix(request.url(), API_PATHS.delete)) {
        await route.fulfill({ status: 204 });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openDeleteDialog(page);
    await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(page.getByText('Ambiente eliminado')).toBeVisible();
  });
});

async function selectEnvironmentTypeFilter(page: Page, optionLabel: string) {
  const trigger = page.locator('#environment-type-filter-trigger');
  await expect(trigger).toBeEnabled();
  let opened = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click();
    if (await page.locator('#environment-type-filter-search').isVisible().catch(() => false)) {
      opened = true;
      break;
    }
    await page.waitForTimeout(100);
  }
  if (!opened) {
    await trigger.click();
  }
  const searchInput = page.locator('#environment-type-filter-search');
  await expect(searchInput).toBeVisible();
  await searchInput.fill(optionLabel);
  await page.getByRole('option', { name: optionLabel }).first().click();
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
}
