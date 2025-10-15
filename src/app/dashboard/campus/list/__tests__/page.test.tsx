import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import CampusListPage from '../page';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

  afterEach(() => {
    // Reiniciamos los dobles de prueba para que cada escenario sea independiente.
    vi.clearAllMocks();
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

  it('shows the delete confirmation dialog with the campus details', async () => {
    // Configuramos un usuario virtual para realizar los clics de la interfaz.
    const user = userEvent.setup();

    // Renderizamos la pagina principal de campus.
    render(<CampusListPage />);

    // Esperamos a que la fila del campus se muestre en la tabla.
    await screen.findByText('Campus Principal');

    // Localizamos el boton de eliminar de la fila actual.
    const deleteButton = screen.getByTitle(/eliminar/i);

    // Disparamos la apertura del dialogo de confirmacion.
    await user.click(deleteButton);

    // Verificamos que el titulo del dialogo corresponda a la accion de eliminar.
    await screen.findByRole('heading', { name: /eliminar campus/i });

    // Confirmamos que el mensaje muestre el nombre del campus a eliminar.
    expect(
      screen.getByText(/Campus Principal/i, { selector: 'span' })
    ).toBeInTheDocument();
  });

  it('deletes the campus and shows a success toast', async () => {
    // Configuramos los datos que regresara la llamada para recargar la tabla.
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => campusResponse,
    } as unknown as Response);

    // Preparamos el mock del API para que la eliminacion sea exitosa.
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    // Preparamos un usuario virtual para ejecutar la accion dentro de la UI.
    const user = userEvent.setup();

    // Renderizamos la pagina que gestiona el listado de campus.
    render(<CampusListPage />);

    // Esperamos la aparicion de los datos en la tabla para continuar.
    await screen.findByText('Campus Principal');

    // Identificamos el boton de eliminar asociado a la fila.
    const deleteButton = screen.getByTitle(/eliminar/i);

    // Abrimos el dialogo haciendo clic en el boton de eliminar.
    await user.click(deleteButton);

    // Obtenemos el boton primario que confirma la eliminacion.
    const confirmButton = await screen.findByRole('button', { name: /Eliminar/i });

    // Ejecutamos la accion definitiva de eliminar el campus.
    await user.click(confirmButton);

    // Esperamos a que la llamada al API de eliminacion ocurra con los datos correctos.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/campus/3', {
        method: 'DELETE',
      });
    });

    // Verificamos que se haya mostrado un mensaje de exito para la persona usuaria.
    expect(toast.success).toHaveBeenCalledWith('Campus eliminado', {
      description: 'El registro se elimino correctamente.',
    });

    // Confirmamos que se volvio a pedir el listado para refrescar la tabla.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows an error toast when the deletion fails', async () => {
    // Establecemos que la eliminacion retornara un error simulado.
    vi.mocked(apiFetch).mockRejectedValueOnce({
      message: 'Fallo al eliminar',
    });

    // Creamos una persona usuaria virtual para interactuar con la UI.
    const user = userEvent.setup();

    // Renderizamos la pantalla principal de campus.
    render(<CampusListPage />);

    // Esperamos que los datos iniciales lleguen a la tabla.
    await screen.findByText('Campus Principal');

    // Localizamos el boton de eliminar dentro de la fila.
    const deleteButton = screen.getByTitle(/eliminar/i);

    // Abrimos el dialogo de confirmacion.
    await user.click(deleteButton);

    // Buscamos el boton de confirmacion dentro del dialogo.
    const confirmButton = await screen.findByRole('button', { name: /Eliminar/i });

    // Intentamos ejecutar la eliminacion que esta configurada para fallar.
    await user.click(confirmButton);

    // Validamos que se informe el error mediante un toast adecuado.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No se pudo eliminar el campus', {
        description: 'Fallo al eliminar',
      });
    });
  });
});
