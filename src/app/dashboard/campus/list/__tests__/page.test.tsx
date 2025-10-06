import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CampusListPage from '../page';

describe('CampusListPage edit flow', () => {
  const campusResponse = {
    items: [
      {
        id: 3,
        codigo: 'CMP-01',
        nombre: 'Campus Principal',
        direccion: 'Av Siempre Viva 742',
        lat: -17.38,
        lng: -66.14,
        activo: true,
        creado_en: '2025-01-01T12:00:00Z',
        actualizado_en: '2025-01-01T12:00:00Z',
      },
    ],
    meta: {
      page: 1,
      take: 8,
      pages: 1,
      total: 1,
    },
  };

  beforeEach(() => {
    // Stub de fetch global para que la pagina pueda cargar los datos iniciales.
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => campusResponse,
    } as unknown as Response);
  });

  afterEach(() => {
    // Restauramos la implementacion original de fetch despues de cada prueba.
    vi.restoreAllMocks();
  });

  it('opens the edit modal with the selected campus information', async () => {
    // Creamos un usuario simulado para ejecutar interacciones humanas.
    const user = userEvent.setup();

    // Renderizamos la pagina que lista los campus.
    render(<CampusListPage />);

    // Esperamos a que los datos iniciales aparezcan en la tabla.
    await screen.findByText('Campus Principal');

    // Buscamos el boton de editar asociado a la fila y lo activamos.
    const editButton = screen.getByTitle(/editar/i);

    // Abrimos el modal de edicion haciendo clic en el boton.
    await user.click(editButton);

    // Confirmamos que el modal muestra el encabezado correcto.
    await screen.findByRole('heading', { name: /editar campus/i });

    // Verificamos que el formulario muestre el nombre original del campus.
    expect(screen.getByDisplayValue('Campus Principal')).toBeInTheDocument();

    // Revisamos que el control de estado activo se encuentre marcado.
    expect(screen.getByRole('checkbox', { name: /activo/i })).toBeChecked();
  });
});
