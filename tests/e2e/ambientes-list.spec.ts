import { test, expect, type Page } from '@playwright/test';
import { shouldMock } from './utils/mocks';

const SEEDED_ENVIRONMENTS = [
  {
    searchTerm: '691A',
    codigo: '69111',
    nombre: '691A',
    tipo: 'Clases',
    bloque: 'Edificio Nuevo de aulas',
    capacidadLabel: 'Total: 45',
  },
  {
    searchTerm: 'Auditorio Central',
    codigo: 'AUD-001',
    nombre: 'Auditorio Central',
    tipo: 'Auditorio',
    bloque: 'Centro de Innovacion Tecnologica',
    capacidadLabel: 'Total: 250',
  },
  {
    searchTerm: 'LAB-AGR-01',
    codigo: 'LAB-AGR-01',
    nombre: 'Laboratorio de Suelos',
    tipo: 'Laboratorio de computacion',
    bloque: 'Bloque Agroindustrial',
    capacidadLabel: 'Total: 20',
  },
];

test.describe('Listado de ambientes (mock)', () => {
  test.skip(!shouldMock, 'Estas pruebas usan mocks del backend.');

  test('muestra la tabla y permite abrir el modal de creación', async ({ page }) => {
    await page.goto('/dashboard/ambientes/list');
    await expect(page.getByRole('heading', { name: 'Ambientes' })).toBeVisible();

    const newEnvironmentButton = page.getByRole('button', { name: /nuevo ambiente/i });
    await expect(newEnvironmentButton).toBeEnabled();
    await expect(page.getByRole('table')).toBeVisible();

    await newEnvironmentButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Registrar ambiente' })).toBeVisible();
    await dialog.getByRole('button', { name: /cerrar/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Listado de ambientes (datos reales)', () => {
  test.skip(shouldMock, 'Este escenario requiere el backend con datos seed.');

  test('permite buscar ambientes semilla y muestra sus detalles', async ({ page }) => {
    await page.goto('/dashboard/ambientes/list');
    const searchInput = page.getByLabel('Buscar ambientes');
    const applyFiltersButton = page.getByRole('button', { name: 'Aplicar filtros' });
    const clearButton = page.getByRole('button', { name: 'Limpiar' });
    const table = page.getByRole('table');

    for (const environment of SEEDED_ENVIRONMENTS) {
      await searchInput.fill(environment.searchTerm);
      await applyFiltersButton.click();
      const targetRow = table
        .getByRole('row')
        .filter({ hasText: environment.codigo })
        .first();
      await expect(targetRow).toBeVisible();
      console.log(environment)
      await expect(targetRow).toContainText(environment.nombre);
      console.log('nombre', environment.nombre)
      await expect(targetRow).toContainText(environment.tipo);
      await expect(targetRow).toContainText(environment.bloque);
      await expect(targetRow).toContainText(environment.capacidadLabel);
      await clearButton.click();
    }
  });

  test('filtra por tipo y bloque usando los selects avanzados', async ({ page }) => {
    await page.goto('/dashboard/ambientes/list');
    await selectEnvironmentTypeFilter(page, 'Auditorio');
    await selectBlockFilter(page, 'Centro de Innovacion Tecnologica');

    const table = page.getByRole('table');
    await expect(table.getByRole('row').filter({ hasText: 'AUD-001' })).toBeVisible();
    await expect(table.getByRole('row').filter({ hasText: '69111' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpiar' }).click();
  });

  test('muestra el estado vacio cuando no hay coincidencias', async ({ page }) => {
    await page.goto('/dashboard/ambientes/list');
    const searchInput = page.getByLabel('Buscar ambientes');
    await searchInput.fill('NoExiste-XYZ');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByText('No encontramos ambientes con esos filtros')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar' }).click();
  });
});

async function triggerSelectAndWait(
  page: Page,
  triggerId: string,
  searchId: string,
  optionLabel: string
) {
  const trigger = page.locator(`#${triggerId}`);
  await expect(trigger).toBeEnabled();
  let opened = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click();
    if (await page.locator(`#${searchId}`).isVisible().catch(() => false)) {
      opened = true;
      break;
    }
    await page.waitForTimeout(100);
  }
  if (!opened) {
    await trigger.click();
  }
  const searchInput = page.locator(`#${searchId}`);
  await expect(searchInput).toBeVisible();
  await searchInput.fill(optionLabel);
  await page.getByRole('option', { name: optionLabel }).first().click();
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
}

async function selectEnvironmentTypeFilter(page: Page, label: string) {
  await triggerSelectAndWait(page, 'environment-type-filter-trigger', 'environment-type-filter-search', label);
}

async function selectBlockFilter(page: Page, label: string) {
  await triggerSelectAndWait(page, 'block-filter-trigger', 'block-filter-search', label);
}
