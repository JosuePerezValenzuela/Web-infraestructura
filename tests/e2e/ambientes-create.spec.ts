import { test, expect, type Locator, type Page } from '@playwright/test';
import { shouldMock } from './utils/mocks';

type EnvironmentApiItem = {
  id: number;
  codigo: string;
  nombre: string;
  piso: number;
  clases: boolean;
  activo: boolean;
  bloque_id: number;
  tipo_ambiente_id: number;
  bloque: string;
  tipo_ambiente: string;
  capacidad: {
    total: number;
    examen: number;
  };
};

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

const baseFormValues = {
  codigo: 'AMB-UX-900',
  nombre: 'Laboratorio UX',
  piso: '2',
  capacidadTotal: '80',
  capacidadExamen: '40',
  largo: '12',
  ancho: '6',
  alto: '3',
  bloque: 'Bloque Central',
  tipo: 'Laboratorio',
};

const API_PATHS = {
  environments: ['/ambientes', '/api/ambientes'],
  blocks: ['/bloques', '/api/bloques'],
  environmentTypes: ['/tipo_ambientes', '/api/tipo_ambientes'],
  faculties: ['/facultades', '/api/facultades'],
};

function matchesApiPath(url: string, validPaths: string[]) {
  const { pathname } = new URL(url);
  return validPaths.includes(pathname);
}

function buildListResponse(items: EnvironmentApiItem[]) {
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

async function fillEnvironmentForm(
  dialog: Locator,
  overrides: Partial<typeof baseFormValues> = {},
  options: { skipCatalogs?: boolean } = {}
) {
  const values = { ...baseFormValues, ...overrides };
  await dialog.getByLabel('Codigo').fill(values.codigo);
  await dialog.getByLabel('Nombre', { exact: true }).fill(values.nombre);
  await dialog.getByLabel('Piso').fill(values.piso);
  await dialog.getByLabel('Capacidad total').fill(values.capacidadTotal);
  await dialog.getByLabel('Capacidad examen').fill(values.capacidadExamen);
  await dialog.getByLabel('Largo').fill(values.largo);
  await dialog.getByLabel('Ancho').fill(values.ancho);
  await dialog.getByLabel('Alto').fill(values.alto);
  if (!options.skipCatalogs) {
    await selectCatalogOption(dialog, '#env-bloque', values.bloque);
    await selectCatalogOption(dialog, '#env-tipo', values.tipo);
  }
}

async function selectCatalogOption(
  dialog: Locator,
  selector: string,
  optionLabel: string
) {
  await dialog.locator(selector).click();
  await dialog.getByRole('option', { name: optionLabel }).click();
}

test.describe('Creacion de ambientes', () => {
  test.skip(!shouldMock, 'Estas pruebas dependen de mocks del backend.');
  test('crea un ambiente y actualiza la tabla', async ({ page }) => {
    // Explicamos que interceptamos los catalogos para trabajar con datos fijos.
    await mockCatalogRequests(page);
    // Definimos la fila que existira antes de abrir el modal.
    const initialRow: EnvironmentApiItem = {
      id: 1,
      codigo: 'AMB-100',
      nombre: 'Laboratorio de redes',
      piso: 1,
      clases: true,
      activo: true,
      bloque_id: 10,
      tipo_ambiente_id: 20,
      bloque: 'Bloque Central',
      tipo_ambiente: 'Laboratorio',
      capacidad: { total: 40, examen: 20 },
    };
    // Definimos la fila esperada despues de enviar el formulario exitosamente.
    const createdRow: EnvironmentApiItem = {
      id: 2,
      codigo: baseFormValues.codigo,
      nombre: baseFormValues.nombre,
      piso: Number(baseFormValues.piso),
      clases: true,
      activo: true,
      bloque_id: 10,
      tipo_ambiente_id: 20,
      bloque: 'Bloque Central',
      tipo_ambiente: 'Laboratorio',
      capacidad: { total: Number(baseFormValues.capacidadTotal), examen: Number(baseFormValues.capacidadExamen) },
    };
    // Usamos este contador para asegurar que la tabla se recarga despues de crear.
    let listRequestCount = 0;
    // Interceptamos el endpoint de ambientes para controlar GET y POST.
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        listRequestCount += 1;
        const payload =
          listRequestCount === 1
            ? buildListResponse([initialRow])
            : buildListResponse([createdRow]);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
        return;
      }
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createdRow),
        });
        return;
      }
      await route.continue();
    });
    // Abrimos la pantalla del listado usando la URL base definida en Playwright.
    await page.goto('/dashboard/ambientes/list');
    // Confirmamos que el encabezado principal este visible para asegurar que la UI cargo.
    await expect(page.getByRole('heading', { name: 'Ambientes' })).toBeVisible();
    // Buscamos el boton para crear y lo pulsamos para abrir el modal.
    const createButton = page.getByRole('button', { name: /nuevo ambiente/i });
    await createButton.click();
    // Identificamos el dialogo para poder trabajar dentro de el.
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Registrar ambiente' })
    ).toBeVisible();
    // Llenamos el formulario con los datos base definidos arriba.
    await fillEnvironmentForm(dialog);
    // Enviamos el formulario para disparar el POST al backend.
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    // Validamos que aparezca la notificacion de exito.
    await expect(page.getByText('Ambiente registrado')).toBeVisible();
    // Nos aseguramos de que el modal se cierre automaticamente.
    await expect(dialog).not.toBeVisible();
    // Revisamos que el nuevo ambiente aparezca en la tabla recargada.
    await expect(
      page.getByRole('table').getByText(createdRow.nombre)
    ).toBeVisible();
    // Finalmente comprobamos que hubo al menos dos GET (inicial y recarga).
    expect(listRequestCount).toBeGreaterThanOrEqual(2);
  });

  test('evita enviar datos cuando la validacion local encuentra errores', async ({
    page,
  }) => {
    // Interceptamos los catalogos para que los selects funcionen sin ir a un backend real.
    await mockCatalogRequests(page);
    // Definimos una respuesta estatica para los GET del listado.
    const listResponse = buildListResponse([]);
    // Contador para asegurarnos de que nunca se emite un POST.
    let postRequests = 0;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(listResponse),
        });
        return;
      }
      if (request.method() === 'POST') {
        postRequests += 1;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
        return;
      }
      await route.continue();
    });
    // Abrimos la pantalla de ambientes.
    await page.goto('/dashboard/ambientes/list');
    // Lanzamos el modal de creacion.
    await page.getByRole('button', { name: /nuevo ambiente/i }).click();
    const dialog = page.getByRole('dialog');
    // Completamos casi todo el formulario con datos validos.
    await fillEnvironmentForm(dialog, { capacidadTotal: '10', capacidadExamen: '20' });
    // Dejamos el codigo vacio para provocar el mensaje obligatorio.
    const codeInput = dialog.getByLabel('Codigo');
    await codeInput.fill('');
    await codeInput.blur();
    // Intentamos enviar el formulario aun con los datos incorrectos.
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    // Confirmamos que aparecen los mensajes de validacion esperados.
    await expect(dialog.getByText('El codigo es obligatorio')).toBeVisible();
    await expect(
      dialog.getByText('La capacidad de examen no puede superar a la total')
    ).toBeVisible();
    // Verificamos que jamas se lanzo una peticion POST.
    expect(postRequests).toBe(0);
  });

  test('muestra la notificacion de error cuando el backend rechaza la creacion', async ({
    page,
  }) => {
    // Una vez mas interceptamos los catalogos necesarios.
    await mockCatalogRequests(page);
    // Preparamos una lista inicial vacia para no distraer la prueba.
    const listResponse = buildListResponse([]);
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(listResponse),
        });
        return;
      }
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'El codigo AMB-UX-900 ya existe',
          }),
        });
        return;
      }
      await route.continue();
    });
    // Cargamos la pagina objetivo de la prueba.
    await page.goto('/dashboard/ambientes/list');
    // Abrimos el modal de registro.
    await page.getByRole('button', { name: /nuevo ambiente/i }).click();
    const dialog = page.getByRole('dialog');
    // Rellenamos el formulario con datos correctos.
    await fillEnvironmentForm(dialog);
    // Enviamos el formulario para provocar el error 409.
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    // Esperamos el mensaje de error general.
    await expect(
      page.getByText('No se pudo registrar el ambiente')
    ).toBeVisible();
    // Tambien verificamos que se muestre el detalle entregar por la API.
    await expect(
      page.getByText('El codigo AMB-UX-900 ya existe')
    ).toBeVisible();
    // Confirmamos que el dialogo permanece abierto para permitir correcciones.
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Codigo')).toHaveValue(baseFormValues.codigo);
  });

  test('permite buscar en los catalogos y envia el payload normalizado', async ({
    page,
  }) => {
    // Inicializamos los catalogos para que los selects muestren opciones.
    await mockCatalogRequests(page);
    // Fijamos la respuesta inicial del listado.
    const listResponse = buildListResponse([]);
    // Aqui guardaremos el ultimo body enviado al POST.
    let capturedBody: Record<string, unknown> | null = null;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(listResponse),
        });
        return;
      }
      if (request.method() === 'POST') {
        capturedBody = await request.postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 99,
          }),
        });
        return;
      }
      await route.continue();
    });
    // Entramos a la pantalla que sera probada.
    await page.goto('/dashboard/ambientes/list');
    // Abrimos el modal para simular la creacion.
    await page.getByRole('button', { name: /nuevo ambiente/i }).click();
    const dialog = page.getByRole('dialog');
    // Empezamos llenando los campos basicos con datos especificos.
    await fillEnvironmentForm(dialog, {
      codigo: 'AMB-PAYLOAD',
      nombre: 'Sala experimental',
      piso: '3',
      capacidadTotal: '45',
      capacidadExamen: '20',
      largo: '10.5',
      ancho: '6.2',
      alto: '3.5',
    });
    // Abrimos el catalogo de bloques para usar la barra de busqueda incluida.
    await dialog.locator('#env-bloque').click();
    // Escribimos el termino para filtrar solo la opcion deseada.
    await page.getByPlaceholder('Buscar bloque').fill('laboratorios');
    // Confirmamos que el bloque indeseado ya no aparece en la lista filtrada.
    await expect(
      page.getByRole('option', { name: 'Bloque Central' })
    ).toHaveCount(0);
    // Elegimos el bloque que quedo tras el filtrado.
    await page.getByRole('option', { name: 'Bloque Laboratorios' }).click();
    // Verificamos que el boton ahora muestre el nombre correcto.
    await expect(dialog.locator('#env-bloque')).toContainText(
      'Bloque Laboratorios'
    );
    // Hacemos lo mismo con el catalogo de tipo para ejercitar el buscador.
    await dialog.locator('#env-tipo').click();
    await page.getByPlaceholder('Buscar tipo de ambiente').fill('laboratorio');
    await page.getByRole('option', { name: 'Laboratorio' }).click();
    // Desactivamos las casillas para enviar false hacia el backend.
    await dialog.getByLabel('Dicta clases').click();
    await dialog.getByLabel('Activo').click();
    // Enviamos el formulario para capturar el cuerpo final.
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    // Confirmamos que el modal se cierre como en el flujo exitoso normal.
    await expect(dialog).not.toBeVisible();
    // Revisamos que realmente hayamos capturado un payload.
    expect(capturedBody).not.toBeNull();
    // Validamos que el backend recibiria la forma normalizada definida en el schema.
    expect(capturedBody).toMatchObject({
      codigo: 'AMB-PAYLOAD',
      nombre: 'Sala experimental',
      piso: 3,
      clases: false,
      activo: false,
      capacidad: {
        total: 45,
        examen: 20,
      },
      dimension: {
        largo: 10.5,
        ancho: 6.2,
        alto: 3.5,
        unid_med: 'metros',
      },
      bloque_id: 5,
      tipo_ambiente_id: 20,
    });
  });

  test('permite corregir datos tras un error y completar la creacion', async ({
    page,
  }) => {
    await mockCatalogRequests(page);
    const initialRow: EnvironmentApiItem = {
      id: 1,
      codigo: 'AMB-100',
      nombre: 'Laboratorio de redes',
      piso: 1,
      clases: true,
      activo: true,
      bloque_id: 10,
      tipo_ambiente_id: 20,
      bloque: 'Bloque Central',
      tipo_ambiente: 'Laboratorio',
      capacidad: { total: 40, examen: 20 },
    };
    const correctedRow: EnvironmentApiItem = {
      id: 2,
      codigo: 'AMB-RESUELTO',
      nombre: 'Laboratorio UX',
      piso: 2,
      clases: true,
      activo: true,
      bloque_id: 10,
      tipo_ambiente_id: 20,
      bloque: 'Bloque Central',
      tipo_ambiente: 'Laboratorio',
      capacidad: { total: 80, examen: 40 },
    };
    let listRequestCount = 0;
    let postAttempts = 0;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        listRequestCount += 1;
        const payload =
          listRequestCount === 1
            ? buildListResponse([initialRow])
            : buildListResponse([correctedRow]);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
        return;
      }
      if (request.method() === 'POST') {
        postAttempts += 1;
        if (postAttempts === 1) {
          await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Hay errores en el formulario',
            }),
          });
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(correctedRow),
        });
        return;
      }
      await route.continue();
    });
    await page.goto('/dashboard/ambientes/list');
    await page.getByRole('button', { name: /nuevo ambiente/i }).click();
    const dialog = page.getByRole('dialog');
    await fillEnvironmentForm(dialog, { codigo: 'AMB-DUP' });
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    await expect(
      page.getByText('No se pudo registrar el ambiente')
    ).toBeVisible();
    await expect(
      page.getByText('Hay errores en el formulario')
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Codigo').fill('AMB-RESUELTO');
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    await expect(page.getByText('Ambiente registrado')).toBeVisible();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('table').getByText('AMB-RESUELTO')).toBeVisible();
    expect(postAttempts).toBe(2);
    expect(listRequestCount).toBeGreaterThanOrEqual(2);
  });

  test('requiere seleccionar bloque y tipo de ambiente antes de enviar', async ({
    page,
  }) => {
    await mockCatalogRequests(page);
    let postCount = 0;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([])),
        });
        return;
      }
      if (request.method() === 'POST') {
        postCount += 1;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/dashboard/ambientes/list');
    await page.getByRole('button', { name: /nuevo ambiente/i }).click();
    const dialog = page.getByRole('dialog');
    await fillEnvironmentForm(dialog, {}, { skipCatalogs: true });
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();

    await expect(dialog.getByText('Selecciona un bloque')).toBeVisible();
    await expect(dialog.getByText('Selecciona un tipo de ambiente')).toBeVisible();
    expect(postCount).toBe(0);
  });

  test('restablece el formulario despues de crear correctamente', async ({ page }) => {
    await mockCatalogRequests(page);
    const createdRow: EnvironmentApiItem = {
      id: 3,
      codigo: baseFormValues.codigo,
      nombre: baseFormValues.nombre,
      piso: Number(baseFormValues.piso),
      clases: true,
      activo: true,
      bloque_id: 10,
      tipo_ambiente_id: 20,
      bloque: 'Bloque Central',
      tipo_ambiente: 'Laboratorio',
      capacidad: { total: Number(baseFormValues.capacidadTotal), examen: Number(baseFormValues.capacidadExamen) },
    };
    let listCount = 0;
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        listCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse(listCount === 1 ? [] : [createdRow])),
        });
        return;
      }
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createdRow),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/dashboard/ambientes/list');
    const openButton = page.getByRole('button', { name: /nuevo ambiente/i });
    await openButton.click();
    let dialog = page.getByRole('dialog');
    await fillEnvironmentForm(dialog);
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    await expect(page.getByText('Ambiente registrado')).toBeVisible();
    await expect(dialog).not.toBeVisible();

    await openButton.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Codigo')).toHaveValue('');
    await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('');
    await expect(dialog.getByLabel('Dicta clases')).toBeChecked();
    await expect(dialog.getByLabel('Activo')).toBeChecked();
  });

  test('muestra el mensaje del backend cuando falla la solicitud', async ({ page }) => {
    await mockCatalogRequests(page);
    await page.route('**/ambientes**', async (route) => {
      const request = route.request();
      if (!matchesApiPath(request.url(), API_PATHS.environments)) {
        await route.continue();
        return;
      }
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildListResponse([])),
        });
        return;
      }
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'La base de datos no respondio',
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/dashboard/ambientes/list');
    await page.getByRole('button', { name: /nuevo ambiente/i }).click();
    const dialog = page.getByRole('dialog');
    await fillEnvironmentForm(dialog);
    await dialog.getByRole('button', { name: 'Registrar ambiente' }).click();
    await expect(page.getByText('No se pudo registrar el ambiente')).toBeVisible();
    await expect(page.getByText('La base de datos no respondio')).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});
