import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import BlockTypeEditForm from "../BlockTypeEditForm";
import type { BlockTypeRow } from "../../list/columns";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BlockTypeEditForm", () => {
  afterEach(() => {
    // Reiniciamos los mocks despues de cada prueba para eliminar estados residuales.
    vi.clearAllMocks();
  });

  it("actualiza un tipo de bloque y notifica al completar la operacion", async () => {
    // Definimos un registro existente que la persona desea editar.
    const blockType: BlockTypeRow = {
      id: 3,
      nombre: "Laboratorio",
      descripcion: "Espacios equipados para experimentos.",
      activo: true,
      creado_en: "2025-01-01T10:00:00Z",
      actualizado_en: "2025-01-01T10:00:00Z",
    };

    // Simulamos que la API responde correctamente al recibir la actualizacion.
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    // Creamos una funcion espia para verificar que se avisa al componente padre.
    const onSubmitSuccess = vi.fn();

    // Renderizamos el formulario con los datos del tipo de bloque que se va a editar.
    render(
      <BlockTypeEditForm
        blockType={blockType}
        onSubmitSuccess={onSubmitSuccess}
      />
    );

    // Creamos una persona usuaria virtual para imitar la interaccion real.
    const user = userEvent.setup();

    // Localizamos el campo de nombre que viene precargado.
    const nombreInput = screen.getByLabelText(/nombre/i);

    // Limpiamos el valor actual para escribir un nombre actualizado.
    await user.clear(nombreInput);

    // Escribimos un nuevo nombre que describe mejor el tipo de bloque.
    await user.type(nombreInput, "Laboratorio de biologia");

    // Localizamos el textarea de descripcion que debera modificarse.
    const descripcionTextarea = screen.getByLabelText(/descripcion/i);

    // Reemplazamos la descripcion anterior con una explicacion mas precisa.
    await user.clear(descripcionTextarea);

    // Escribimos la nueva descripcion deseada.
    await user.type(
      descripcionTextarea,
      "Laboratorios dedicados a practicas de biologia y bioquimica."
    );

    // Identificamos el control que permite alternar el estado activo.
    const activoCheckbox = screen.getByRole("checkbox", { name: /activo/i });

    // Desmarcamos el checkbox para inactivar el tipo de bloque.
    await user.click(activoCheckbox);

    // Buscamos el boton de guardar cambios que enviara la solicitud PATCH.
    const submitButton = screen.getByRole("button", {
      name: /guardar cambios/i,
    });

    // Disparamos el envio del formulario.
    await user.click(submitButton);

    // Verificamos que la API reciba la ruta y el cuerpo correctos.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/tipo_bloques/3", {
        method: "PATCH",
        json: {
          nombre: "Laboratorio de biologia",
          descripcion:
            "Laboratorios dedicados a practicas de biologia y bioquimica.",
          activo: false,
        },
      });
    });

    // Confirmamos que se haya mostrado un mensaje de exito informando el resultado.
    expect(toast.success).toHaveBeenCalledWith("Tipo de bloque actualizado", {
      description: "Se guardaron los cambios correctamente.",
    });

    // Verificamos que se notifique al componente padre para refrescar datos o cerrar dialogos.
    expect(onSubmitSuccess).toHaveBeenCalled();
  });

  it("muestra un mensaje de error cuando la actualizacion falla", async () => {
    // Configuramos un tipo de bloque que intentaremos modificar.
    const blockType: BlockTypeRow = {
      id: 8,
      nombre: "Biblioteca",
      descripcion: "Bloques destinados a bibliotecas.",
      activo: true,
      creado_en: "2025-01-01T10:00:00Z",
      actualizado_en: "2025-01-01T10:00:00Z",
    };

    // Simulamos un error proveniente del backend.
    vi.mocked(apiFetch).mockRejectedValueOnce({
      message: "No se pudo actualizar el registro.",
    });

    // Renderizamos el formulario con el tipo de bloque anterior.
    render(<BlockTypeEditForm blockType={blockType} />);

    // Creamos una usuaria virtual para enviar el formulario sin cambios.
    const user = userEvent.setup();

    // Buscamos el boton que dispara el envio de datos.
    const submitButton = screen.getByRole("button", {
      name: /guardar cambios/i,
    });

    // Ejecutamos el click para provocar la ruta de error.
    await user.click(submitButton);

    // Esperamos a que el toast muestre un mensaje de error claro.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "No se pudo actualizar el tipo de bloque",
        {
          description: "No se pudo actualizar el registro.",
        }
      );
    });
  });
});
