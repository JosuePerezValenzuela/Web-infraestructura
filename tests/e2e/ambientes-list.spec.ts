import { test, expect } from '@playwright/test';

test.describe('Listado de ambientes', () => {
  test('muestra la tabla y permite abrir el modal de creación', async ({ page }) => {
    // Navegamos al listado de ambientes usando la URL base definida en playwright.config.ts.
    await page.goto('/dashboard/ambientes/list');

    // Esperamos que la cabecera principal de la vista esté visible.
    await expect(page.getByRole('heading', { name: 'Ambientes' })).toBeVisible();

    // Verificamos que el botón para crear ambientes esté habilitado.
    const newEnvironmentButton = page.getByRole('button', { name: /nuevo ambiente/i });
    await expect(newEnvironmentButton).toBeEnabled();

    // Esperamos a que la tabla principal esté presente aunque no existan filas todavía.
    await expect(page.getByRole('table')).toBeVisible();

    // Abrimos el modal de creación y confirmamos que muestra el formulario.
    await newEnvironmentButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Registrar ambiente' })).toBeVisible();

    // Cerramos el modal para dejar la UI limpia para futuros tests.
    await dialog.getByRole('button', { name: /cerrar/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});
