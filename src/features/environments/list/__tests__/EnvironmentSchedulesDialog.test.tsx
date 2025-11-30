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
  it("envia hora_apertura, hora_cierre, periodo y franjas al guardar", async () => {
    // Creamos un ambiente activo con identificador y nombres para que el dialogo tenga contexto realista.
    const environment: EnvironmentRow = {
      id: 5,
      nombre: "Aula 101",
      codigo: "A101",
      activo: true,
    } as EnvironmentRow;
    // Preparamos al usuario de testing para simular escritura y clics como en el navegador.
    const user = userEvent.setup();

    // Renderizamos el dialogo abierto para poder interactuar directamente con sus campos y botones.
    render(
      <EnvironmentSchedulesDialog
        open
        environment={environment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Localizamos el campo de hora inicio mediante su etiqueta accesible para escribir la hora de apertura requerida.
    const startInput = screen.getByLabelText("Hora inicio");
    // Escribimos 07:00 para que el backend reciba la hora de apertura correcta.
    await user.type(startInput, "07:00");

    // Localizamos el campo de hora fin para capturar la hora de cierre que necesita el nuevo payload.
    const endInput = screen.getByLabelText("Hora fin");
    // Escribimos 09:00 como hora de cierre para cubrir dos franjas de 60 minutos.
    await user.type(endInput, "09:00");

    // Obtenemos el input del periodo en minutos para enviar la duracion de las franjas.
    const periodInput = screen.getByLabelText("Periodo (min)");
    // Borramos el valor por defecto para escribir el periodo requerido en la peticion.
    await user.clear(periodInput);
    // Escribimos 60 minutos para que el backend reciba el campo periodo.
    await user.type(periodInput, "60");

    // Hacemos clic en el boton Generar grilla para que se creen las celdas seleccionables.
    await user.click(screen.getByRole("button", { name: "Generar grilla" }));

    // Esperamos a que aparezca el boton de la primera franja (Lunes 07:00), lo que indica que la tabla se renderizo.
    const firstSlot = await screen.findByRole("button", {
      name: "Lunes 07:00",
    });

    // Seleccionamos la franja de Lunes a las 07:00 para que se incluya en el payload como rango.
    await user.click(firstSlot);

    // Pulsamos Guardar horarios para disparar la llamada al endpoint con el nuevo formato.
    await user.click(screen.getByRole("button", { name: "Guardar horarios" }));

    // Esperamos a que la funcion apiFetch sea llamada, confirmando que se intento enviar la informacion.
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    // Tomamos la llamada realizada y extraemos la configuracion enviada al backend para validarla.
    const [url, options] = apiFetchMock.mock.calls[0] ?? [];

    // Verificamos que se use el endpoint con el identificador del ambiente seleccionado.
    expect(url).toBe("/ambientes/5/horarios");
    // Confirmamos que la peticion se haga con el metodo PUT requerido.
    expect((options as { method?: string })?.method).toBe("PUT");
    // Validamos que el cuerpo incluya hora_apertura, hora_cierre, periodo y las franjas seleccionadas.
    expect((options as { json?: unknown })?.json).toEqual({
      hora_apertura: "07:00",
      hora_cierre: "09:00",
      periodo: 60,
      franjas: [{ dia: 0, hora_inicio: "07:00", hora_fin: "08:00" }],
    });
  });
});
