"use client";

import { render, screen, waitFor } from "@testing-library/react"; // Renderizamos componentes y consultamos el DOM virtual.
import userEvent from "@testing-library/user-event"; // Simulamos las acciones de una persona usando la interfaz.
import { vi } from "vitest"; // Utilizamos los helpers para crear mocks y espiar llamadas.
import BlockEditForm from "../BlockEditForm"; // Componente que estamos validando.
import { apiFetch } from "@/lib/api"; // Cliente HTTP centralizado que vamos a espiar.
import { toast } from "sonner"; // Sistema de notificaciones utilizado por el formulario.
import type { BlockRow } from "../../list/columns"; // Tipado de las filas que provienen del listado.

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedToast = vi.mocked(toast);

const baseBlock: BlockRow = {
  id: 44,
  codigo: "BLO-044",
  nombre: "Bloque Central",
  nombre_corto: "Central",
  pisos: 4,
  activo: true,
  facultad_id: 7,
  tipo_bloque_id: 2,
  lat: -17.39,
  lng: -66.15,
  creado_en: "2025-01-01T12:00:00.000Z",
};

const facultiesCatalog = [
  { id: 7, nombre: "Facultad de Tecnologia" },
  { id: 8, nombre: "Facultad de Ingenieria" },
];

const blockTypesCatalog = [
  { id: 2, nombre: "Academico" },
  { id: 5, nombre: "Administrativo" },
];

describe("BlockEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Garantizamos que cada prueba comience con los mocks limpios.
  });

  it("permite actualizar un bloque y envia solo los campos modificados", async () => {
    const user = userEvent.setup(); // Preparamos a la persona usuaria virtual.
    mockedApiFetch.mockResolvedValueOnce({ id: baseBlock.id } as never); // Definimos la respuesta exitosa del PATCH.
    const onSubmitSuccess = vi.fn(); // Espiamos la funcion que el padre invoca cuando todo sale bien.

    render(
      <BlockEditForm
        block={baseBlock}
        faculties={facultiesCatalog}
        blockTypes={blockTypesCatalog}
        onSubmitSuccess={onSubmitSuccess}
      />
    ); // Montamos el formulario con los catálogos disponibles.

    await screen.findByLabelText(/codigo/i); // Esperamos cualquier campo para confirmar que el formulario esta listo.

    const nombreInput = screen.getByLabelText(/^nombre$/i); // Obtenemos el campo de nombre completo.
    await user.clear(nombreInput); // Limpiamos el valor anterior.
    await user.type(nombreInput, "Bloque Actualizado"); // Escribimos el nuevo nombre que se quiere guardar.

    const pisosInput = screen.getByLabelText(/pisos/i); // Referenciamos el input numérico.
    await user.clear(pisosInput); // Eliminamos el valor previo.
    await user.type(pisosInput, "5"); // Indicamos que ahora el bloque tendrá cinco pisos.

    const activeCheckbox = screen.getByRole("checkbox", { name: /activo/i }); // Localizamos el control que marca si el bloque sigue activo.
    await user.click(activeCheckbox); // Lo desmarcamos para simular la desactivación.

    const facultyTrigger = screen.getByLabelText(/facultad/i); // Buscamos el selector de facultad.
    await user.click(facultyTrigger); // Abrimos el desplegable con un clic.
    await user.click(
      await screen.findByRole("option", { name: /facultad de ingenieria/i })
    ); // Elegimos la segunda opción para indicar el nuevo dueño del bloque.

    const typeTrigger = screen.getByLabelText(/tipo de bloque/i); // Repetimos el proceso para el tipo de bloque.
    await user.click(typeTrigger); // Abrimos el selector.
    await user.click(
      await screen.findByRole("option", { name: /administrativo/i })
    ); // Seleccionamos un tipo distinto al original.

    await user.clear(screen.getByTestId("lat-input")); // Actualizamos la latitud usando el campo oculto pensado para las pruebas.
    await user.type(screen.getByTestId("lat-input"), "-17.4"); // Registramos la nueva coordenada.
    await user.clear(screen.getByTestId("lng-input")); // Repetimos para la longitud.
    await user.type(screen.getByTestId("lng-input"), "-66.2"); // Guardamos la longitud que corresponde al mismo punto.

    await user.click(screen.getByRole("button", { name: /guardar cambios/i })); // Enviamos el formulario con los datos ajustados.

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(`/bloques/${baseBlock.id}`, {
        method: "PATCH",
        json: {
          nombre: "Bloque Actualizado",
          pisos: 5,
          activo: false,
          facultad_id: 8,
          tipo_bloque_id: 5,
          lat: -17.4,
          lng: -66.2,
        },
      });
    }); // Confirmamos que solo se envíen los campos que realmente cambiaron.

    expect(mockedToast.success).toHaveBeenCalledWith("Bloque actualizado", {
      description:
        "Los datos del bloque se guardaron y los ambientes dependientes reflejarán su nuevo estado.",
    }); // Validamos el mensaje amigable mostrado a la persona usuaria.
    expect(onSubmitSuccess).toHaveBeenCalled(); // El componente padre debe ser notificado para refrescar la tabla.
  });

  it("exige capturar la pareja de coordenadas antes de guardar", async () => {
    const user = userEvent.setup(); // Usuario virtual para este escenario.
    render(
      <BlockEditForm
        block={baseBlock}
        faculties={facultiesCatalog}
        blockTypes={blockTypesCatalog}
      />
    ); // Renderizamos el formulario con los datos por defecto.

    await screen.findByLabelText(/codigo/i); // Nos aseguramos de que el formulario este montado.

    await user.clear(screen.getByTestId("lat-input")); // Modificamos unicamente la latitud.
    await user.type(screen.getByTestId("lat-input"), "-17.45"); // Registramos un nuevo valor.
    await user.clear(screen.getByTestId("lng-input")); // Dejamos la longitud vacia para forzar el error.

    await user.click(screen.getByRole("button", { name: /guardar cambios/i })); // Intentamos guardar sin completar la pareja.

    expect(
      await screen.findByText(/latitud y longitud deben enviarse juntas/i)
    ).toBeInTheDocument(); // El mensaje de validación debe guiar a la persona usuaria.
    expect(mockedApiFetch).not.toHaveBeenCalled(); // No se debe emitir ninguna solicitud si hay errores.
  });
});
