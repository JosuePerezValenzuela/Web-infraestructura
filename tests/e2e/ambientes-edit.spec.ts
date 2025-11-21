import { test, expect, type Page } from '@playwright/test';
import { shouldMock } from './utils/mocks';

type EnvironmentRow = {
  id: number;
  codigo: string;
  nombre: string;
  nombre_corto?: string;
  piso: number;
  clases: boolean;
  activo: boolean;
  bloque_id: number;
  tipo_ambiente_id: number;
  bloque?: string;
  tipo_ambiente?: string;
  capacidad?: {
    total: number;
    examen: number;
  };
  dimension?: {
    largo: number;
    ancho: number;
    alto: number;
    unid_med: string;
  };
} & Record<string, unknown>;

const catalogFixtures = {
  blocks: [
    { id: 5, nombre: 'Bloque Laboratorios' },
    { id: 10, nombre: 'Bloque Central' },
  ],
  environmentTypes: [
    { id: 20, nombre: 'Laboratorio' },
    { id: 30, nombre: 'Aula de innovacion' },
  ],
  faculties: [{ id: 40, nombre: 'Facultad de Ingenieria' }],
};

const API_PATHS = {
  environments: ['/ambientes', '/api/ambientes'],
  environmentDetailPrefixes: ['/ambientes/', '/api/ambientes/'],
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
    codigo: 'AMB-200',
    nombre: 'Laboratorio UX',
    nombre_corto: 'UX',
    piso: 2,
    clases: true,
    activo: true,
    bloque_id: 10,
    tipo_ambiente_id: 20,
    bloque: 'Bloque Central',
    tipo_ambiente: 'Laboratorio',
    capacidad: { total: 80, examen: 40 },
    dimension: { largo: 12, ancho: 6, alto: 3, unid_med: 'metros' },
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

async function openEditDialog(page: Page, index = 0) {
  const editButton = page.getByRole('button', { name: /editar ambiente/i }).nth(index);
  await editButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Editar ambiente' })).toBeVisible();
  return dialog;
}

test.describe('Edicion de ambientes', () => {
  test.skip(!shouldMock, 'Estas pruebas dependen de mocks del backend.');
  test('abre el modal desde la tabla y precarga los campos', async ({ page }) => {
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
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openEditDialog(page);
    await expect(dialog.getByLabel('Codigo')).toHaveValue(row.codigo);
    await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue(row.nombre);
    await expect(dialog.locator('#env-edit-bloque')).toContainText('Bloque Central');
    await expect(dialog.locator('#env-edit-tipo')).toContainText('Laboratorio');
  });

  test('guarda los cambios y recarga la tabla', async ({ page }) => {
    await mockCatalogRequests(page);
    const originalRow = buildEnvironmentRow();
    const updatedRow = { ...originalRow, nombre: 'Laboratorio actualizado' };
    let listRequestCount = 0;
    let patchBody: Record<string, unknown> | null = null;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        listRequestCount += 1;
        const payload = listRequestCount === 1 ? buildListResponse([originalRow]) : buildListResponse([updatedRow]);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
        return;
      }
      if (request.method() === 'PATCH' && matchesApiPrefix(request.url(), API_PATHS.environmentDetailPrefixes)) {
        patchBody = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedRow),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openEditDialog(page);
    await dialog.getByLabel('Nombre', { exact: true }).fill('Laboratorio actualizado');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Ambiente actualizado')).toBeVisible();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('table').getByText('Laboratorio actualizado')).toBeVisible();
    expect(listRequestCount).toBeGreaterThanOrEqual(2);
    expect(patchBody).toMatchObject({ nombre: 'Laboratorio actualizado' });
  });

  test('impide enviar datos invalidos a traves de la validacion local', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow();
    let patchCount = 0;
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
      if (request.method() === 'PATCH' && matchesApiPrefix(request.url(), API_PATHS.environmentDetailPrefixes)) {
        patchCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(row),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openEditDialog(page);
    await dialog.getByLabel('Codigo').fill('');
    await dialog.getByLabel('Capacidad total').fill('10');
    await dialog.getByLabel('Capacidad examen').fill('20');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialog.getByText('El codigo es obligatorio')).toBeVisible();
    await expect(dialog.getByText('La capacidad de examen no puede superar a la total')).toBeVisible();
    expect(patchCount).toBe(0);
  });

  test('mantiene el modal abierto cuando el backend devuelve un error', async ({ page }) => {
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
      if (request.method() === 'PATCH' && matchesApiPrefix(request.url(), API_PATHS.environmentDetailPrefixes)) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'El codigo ya existe' }),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openEditDialog(page);
    await dialog.getByLabel('Codigo').fill('AMB-DUP');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('No se pudo actualizar el ambiente')).toBeVisible();
    await expect(page.getByText('El codigo ya existe')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Codigo')).toHaveValue('AMB-DUP');
  });

  test('muestra opciones derivadas cuando el catalogo no contiene el bloque o tipo', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow({
      bloque_id: 99,
      bloque: 'Bloque Fantasma',
      tipo_ambiente_id: 77,
      tipo_ambiente: 'Sala especial',
    });
    let capturedBody: Record<string, unknown> | null = null;
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
      if (request.method() === 'PATCH' && matchesApiPrefix(request.url(), API_PATHS.environmentDetailPrefixes)) {
        capturedBody = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(row),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openEditDialog(page);
    await expect(dialog.locator('#env-edit-bloque')).toContainText('Bloque Fantasma');
    await expect(dialog.locator('#env-edit-tipo')).toContainText('Sala especial');
    await dialog.locator('#env-edit-bloque').click();
    await page.getByRole('option', { name: 'Bloque Central' }).click();
    await dialog.locator('#env-edit-tipo').click();
    await page.getByRole('option', { name: 'Laboratorio' }).click();
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toMatchObject({ bloque_id: 10, tipo_ambiente_id: 20 });
  });

  test('reinicia los valores cuando se selecciona otro ambiente', async ({ page }) => {
    await mockCatalogRequests(page);
    const firstRow = buildEnvironmentRow({ codigo: 'AMB-111', nombre: 'Sala Norte' });
    const secondRow = buildEnvironmentRow({ id: 2, codigo: 'AMB-222', nombre: 'Sala Sur' });
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([firstRow, secondRow])),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const firstDialog = await openEditDialog(page, 0);
    await expect(firstDialog.getByLabel('Codigo')).toHaveValue('AMB-111');
    await firstDialog.getByRole('button', { name: 'Cerrar' }).click();
    await expect(firstDialog).not.toBeVisible();
    const secondDialog = await openEditDialog(page, 1);
    await expect(secondDialog.getByLabel('Codigo')).toHaveValue('AMB-222');
  });

  test('envia el payload normalizado al guardar cambios', async ({ page }) => {
    await mockCatalogRequests(page);
    const row = buildEnvironmentRow();
    let capturedBody: Record<string, unknown> | null = null;
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
      if (request.method() === 'PATCH' && matchesApiPrefix(request.url(), API_PATHS.environmentDetailPrefixes)) {
        capturedBody = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(row),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openEditDialog(page);
    await dialog.getByLabel('Largo').fill('15.5');
    await dialog.getByLabel('Ancho').fill('7.2');
    await dialog.getByLabel('Alto').fill('4');
    await dialog.getByLabel('Dicta clases').click();
    await dialog.getByLabel('Activo').click();
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialog).not.toBeVisible();
    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toMatchObject({
      clases: false,
      activo: false,
      dimension: {
        largo: 15.5,
        ancho: 7.2,
        alto: 4,
        unid_med: 'metros',
      },
    });
  });

  test('muestra un mensaje cuando no hay un ambiente valido para editar', async ({ page }) => {
    await mockCatalogRequests(page);
    const invalidRow = buildEnvironmentRow({ id: 0 });
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET' && matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([invalidRow])),
        });
        return;
      }
      await route.continue();
    });
    await goToEnvironmentList(page);
    const dialog = await openEditDialog(page);
    await expect(dialog.getByText('Selecciona un ambiente valido para editarlo.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
  });
});
