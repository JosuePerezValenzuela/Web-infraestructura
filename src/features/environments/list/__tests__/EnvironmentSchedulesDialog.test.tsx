import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EnvironmentRow } from "../columns";
import { EnvironmentSchedulesDialog } from "../EnvironmentSchedulesDialog";

const apiFetchMock = vi.fn();
const notifyInfoMock = vi.fn();
const notifySuccessMock = vi.fn();
const notifyErrorMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("@/lib/notify", () => ({
  notify: {
    info: (...args: unknown[]) => notifyInfoMock(...args),
    success: (...args: unknown[]) => notifySuccessMock(...args),
    error: (...args: unknown[]) => notifyErrorMock(...args),
  },
}));

vi.mock("@/components/ui/input", () => {
  const { forwardRef } = require("react");
  return {
    Input: forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
      (props, ref) => <input ref={ref} {...props} />
    ),
  };
});

vi.mock("@/components/ui/label", () => ({
  Label: (props: React.ComponentProps<"label">) => <label {...props} />,
}));

vi.mock("@/components/ui/button", () => {
  const { forwardRef } = require("react");
  return {
    Button: forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
      (props, ref) => <button ref={ref} {...props} />
    ),
  };
});

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange?: (value: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <div />,
}));

vi.mock("lucide-react", () => ({
  Clock3: () => <svg aria-label="clock" />, 
  Trash2: () => <svg aria-label="trash" />,
}));

describe("EnvironmentSchedulesDialog", () => {
  beforeEach(() => {
    // Limpiamos todas las llamadas de los mocks para que cada prueba empiece desde cero.
    vi.clearAllMocks();
  });

  it("envia hora_apertura, hora_cierre, periodo y franjas al guardar", async () => {
    // Definimos un ambiente activo para que el dialogo pueda operar.
    const environment: EnvironmentRow = {
      id: 5,
      nombre: "Aula 101",
      codigo: "A101",
      activo: true,
    } as EnvironmentRow;
    // Creamos el usuario de pruebas que simula a la persona usando el teclado y el mouse.
    const user = userEvent.setup();

    // Renderizamos el dialogo abierto para poder interactuar con sus campos y botones.
    render(
      <EnvironmentSchedulesDialog
        open
        environment={environment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Escribimos la hora de apertura esperada en el input de inicio.
    const startInput = screen.getByLabelText("Hora inicio");
    await user.type(startInput, "07:00");

    // Escribimos la hora de cierre esperada en el input correspondiente.
    const endInput = screen.getByLabelText("Hora fin");
    await user.type(endInput, "09:00");

    // Ajustamos el periodo a 60 minutos para que se use en el payload.
    const periodInput = screen.getByLabelText("Periodo (min)");
    await user.clear(periodInput);
    await user.type(periodInput, "60");

    // Generamos la grilla para poder seleccionar la franja.
    await user.click(screen.getByRole("button", { name: "Generar grilla" }));

    // Esperamos a que aparezca la celda de Lunes 07:00 y la seleccionamos.
    const firstSlot = await screen.findByRole("button", {
      name: "Lunes 07:00",
    });
    await user.click(firstSlot);

    // Guardamos los horarios para disparar la llamada al backend.
    await user.click(screen.getByRole("button", { name: "Guardar horarios" }));

    // Verificamos que se haya llamado a la API (deberia incluir GET inicial y el PUT de guardado).
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    // Buscamos la llamada PUT para inspeccionar el cuerpo enviado.
    const putCall = apiFetchMock.mock.calls.find(([, opts]) => {
      const method = (opts as { method?: string })?.method;
      return method === "PUT";
    });

    const [url, options] = putCall ?? [];

    // Endpoint correcto con el ID del ambiente.
    expect(url).toBe("/ambientes/5/horarios");
    // Metodo PUT segun el contrato.
    expect((options as { method?: string })?.method).toBe("PUT");
    // Payload completo con horas base, periodo y franjas seleccionadas.
    expect((options as { json?: unknown })?.json).toEqual({
      hora_apertura: "07:00",
      hora_cierre: "09:00",
      periodo: 60,
      franjas: [{ dia: 0, hora_inicio: "07:00", hora_fin: "08:00" }],
    });
  });

  it("carga horarios existentes y regenera la grilla al cambiar horas base", async () => {
    // Ambiente valido para la carga inicial.
    const environment: EnvironmentRow = {
      id: 7,
      nombre: "Laboratorio 1",
      codigo: "LAB1",
      activo: true,
    } as EnvironmentRow;

    // La API responde con configuracion y una franja preseleccionada.
    apiFetchMock.mockResolvedValueOnce({
      hora_apertura: "07:00",
      hora_cierre: "09:00",
      periodo: 60,
      items: [{ dia: 0, hora_inicio: "07:00", hora_fin: "08:00" }],
    });

    const user = userEvent.setup();

    // Abrimos el dialogo para disparar el fetch de horarios existentes.
    render(
      <EnvironmentSchedulesDialog
        open
        environment={environment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Confirmamos que se hizo la llamada GET al endpoint de horarios.
    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/ambientes/7/horarios",
        expect.objectContaining({ method: "GET" })
      )
    );

    // Los campos deben mostrar la configuracion recibida.
    expect((screen.getByLabelText("Hora inicio") as HTMLInputElement).value).toBe("07:00");
    expect((screen.getByLabelText("Hora fin") as HTMLInputElement).value).toBe("09:00");
    expect((screen.getByLabelText("Periodo (min)") as HTMLInputElement).value).toBe("60");

    // La grilla debe aparecer ya seleccionada segun la respuesta.
    const initialSlot = await screen.findByRole("button", { name: "Lunes 07:00" });
    expect(initialSlot).toHaveAttribute("aria-pressed", "true");

    // Si cambiamos la hora inicio, la grilla se regenera y se limpian selecciones.
    const startInput = screen.getByLabelText("Hora inicio");
    await user.clear(startInput);
    await user.type(startInput, "08:00");

    // Verificamos que la nueva grilla comience en 08:00 y sin seleccion previa.
    await waitFor(() => {
      const rebuiltSlot = screen.getByRole("button", { name: "Lunes 08:00" });
      expect(rebuiltSlot).toHaveAttribute("aria-pressed", "false");
    });

    // La antigua celda ya no debe existir porque la grilla se reconstruyo.
    expect(screen.queryByRole("button", { name: "Lunes 07:00" })).not.toBeInTheDocument();
  });

  it("pinta la grilla con todas las franjas devueltas por la API", async () => {
    // Ambiente activo para recuperar sus horarios.
    const environment: EnvironmentRow = {
      id: 9,
      nombre: "Sala Reuniones",
      codigo: "SR-1",
      activo: true,
    } as EnvironmentRow;

    // La API retorna dos franjas en dias distintos; deben verse seleccionadas.
    apiFetchMock.mockResolvedValueOnce({
      hora_apertura: "07:00",
      hora_cierre: "11:00",
      periodo: 60,
      items: [
        { dia: 0, hora_inicio: "08:00", hora_fin: "10:00" },
        { dia: 2, hora_inicio: "09:00", hora_fin: "11:00" },
      ],
    });

    // Renderizamos con el dialogo abierto para disparar el GET.
    render(
      <EnvironmentSchedulesDialog
        open
        environment={environment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Esperamos la llamada GET para asegurar que los datos se hayan cargado.
    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/ambientes/9/horarios",
        expect.objectContaining({ method: "GET" })
      )
    );

    // La celda de Lunes 08:00 debe estar seleccionada segun la franja 08:00-10:00.
    const monday = await screen.findByRole("button", { name: "Lunes 08:00" });
    expect(monday).toHaveAttribute("aria-pressed", "true");

    // La celda de Miercoles 09:00 debe estar seleccionada por la franja 09:00-11:00.
    const wednesday = await screen.findByRole("button", { name: "Miercoles 09:00" });
    expect(wednesday).toHaveAttribute("aria-pressed", "true");

    // Y la grilla debe haber generado la fila 11:00 (hora fin) aunque no sea seleccionable.
    expect(screen.getByText("11:00")).toBeInTheDocument();
  });
});
