import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import CampusEditForm from '../CampusEditForm';
import type { CampusRow } from '../../list/columns';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CampusEditForm', () => {
  afterEach(() => {
    // Reiniciamos todos los espias al finalizar cada prueba para evitar fugas de estado.
    vi.clearAllMocks();
  });

  it('allows updating a campus and shows a success toast', async () => {
    // Definimos un campus de ejemplo para rellenar el formulario con datos reales.
    const campus: CampusRow = {
      id: 5,
      codigo: 'ABC123',
      nombre: 'Campus Principal',
      direccion: 'Av. Central 123',
      lat: -17.39,
      lng: -66.15,
      activo: true,
      creado_en: '2025-01-01T00:00:00Z',
      actualizado_en: '2025-01-02T00:00:00Z',
    };

    // Configuramos el mock para que la peticion al API se resuelva correctamente.
    vi.mocked(apiFetch).mockResolvedValueOnce({});

    // Creamos una funcion espia para verificar que se notifica el exito al padre.
    const onSubmitSuccess = vi.fn();

    // Renderizamos el formulario de edicion con los datos del campus de ejemplo.
    render(<CampusEditForm campus={campus} onSubmitSuccess={onSubmitSuccess} />);

    // Obtenemos el campo de nombre para poder modificarlo.
    const nombreInput = screen.getByLabelText(/nombre/i);

    // Obtenemos el campo que permite marcar si el campus esta activo.
    const activoCheckbox = screen.getByRole('checkbox', { name: /activo/i });

    // Obtenemos el boton de guardar que dispara el envio del formulario.
    const submitButton = screen.getByRole('button', { name: /guardar cambios/i });

    // Creamos un usuario virtual para simular interacciones reales.
    const user = userEvent.setup();

    // Borramos el texto anterior del nombre para ingresar un nuevo valor.
    await user.clear(nombreInput);

    // Escribimos un nombre actualizado para el campus.
    await user.type(nombreInput, 'Campus Actualizado');

    // Desmarcamos el campus para dejarlo inactivo durante la prueba.
    await user.click(activoCheckbox);

    // Enviamos el formulario haciendo clic en el boton de guardar.
    await user.click(submitButton);

    // Esperamos a que la peticion al API se realice con los datos esperados.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/campus/5', {
        method: 'PUT',
        json: {
          codigo: 'ABC123',
          nombre: 'Campus Actualizado',
          direccion: 'Av. Central 123',
          lat: -17.39,
          lng: -66.15,
          activo: false,
        },
      });
    });

    // Verificamos que se haya mostrado un toast de exito.
    expect(toast.success).toHaveBeenCalled();

    // Confirmamos que se notifico al componente padre para refrescar datos o cerrar el modal.
    expect(onSubmitSuccess).toHaveBeenCalled();
  });

  it('notifies the error toast when the update fails', async () => {
    // Definimos un campus de ejemplo para la prueba de error.
    const campus: CampusRow = {
      id: 7,
      codigo: 'XYZ789',
      nombre: 'Campus Norte',
      direccion: 'Calle Secundaria 45',
      lat: -17.4,
      lng: -66.16,
      activo: true,
      creado_en: '2025-01-01T00:00:00Z',
      actualizado_en: '2025-01-02T00:00:00Z',
    };

    // Simulamos que la peticion falla devolviendo un objeto de error.
    vi.mocked(apiFetch).mockRejectedValueOnce({ message: 'Fallo al actualizar' });

    // Renderizamos el formulario con el campus de ejemplo.
    render(<CampusEditForm campus={campus} />);

    // Obtenemos el boton de guardar para enviarlo sin cambiar datos.
    const submitButton = screen.getByRole('button', { name: /guardar cambios/i });

    // Creamos un usuario virtual para simular el clic.
    const user = userEvent.setup();

    // Disparamos el envio del formulario.
    await user.click(submitButton);

    // Verificamos que se haya mostrado un toast de error con el mensaje esperado.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No se pudo actualizar el campus', {
        description: 'Fallo al actualizar',
      });
    });
  });
});
