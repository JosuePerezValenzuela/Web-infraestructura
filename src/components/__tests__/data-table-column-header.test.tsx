// Importamos React porque las pruebas renderizan componentes JSX.
import React from "react";
// Traemos las utilidades de Testing Library para montar componentes y leer la pantalla como lo haria una persona.
import { render, screen } from "@testing-library/react";
// userEvent nos permite simular clicks y acciones reales de la persona usuaria.
import userEvent from "@testing-library/user-event";
// Column es el tipo del encabezado de tabla que ofrece TanStack; lo usamos para que el mock respete la firma.
import type { Column } from "@tanstack/react-table";
// Importamos el componente que queremos verificar.
import { DataTableColumnHeader } from "@/components/data-table-column-header";

// Declaramos un alias para describir los posibles estados de ordenamiento que usa la tabla.
type SortState = false | "asc" | "desc";

const createColumnMock = (sortState: SortState) => {
  // Simulamos la funcion que cambia el orden; el mock nos permite inspeccionar como se llamo.
  const toggleSorting = vi.fn();
  // Simulamos la lectura del estado de orden actual devolviendo el valor recibido.
  const getIsSorted = vi.fn(() => sortState);
  // Devolvemos un objeto que cumple lo necesario de Column para las pruebas.
  return { toggleSorting, getIsSorted } as unknown as Column<unknown, unknown>;
};

describe("DataTableColumnHeader", () => {
  it("muestra un icono neutral cuando no hay orden activo", () => {
    // Creamos una columna sin orden aplicado para recrear el estado inicial.
    const column = createColumnMock(false);
    // Renderizamos el encabezado pasando la columna simulada y un titulo.
    render(<DataTableColumnHeader column={column} title="Nombre" />);
    // Buscamos el icono neutral por su etiqueta accesible para confirmar que es el que se muestra.
    expect(screen.getByLabelText("Sin orden aplicado")).toBeInTheDocument();
  });

  it("muestra la flecha hacia arriba cuando el orden es ascendente", () => {
    // Preparamos una columna que indica que ya esta ordenada de forma ascendente.
    const column = createColumnMock("asc");
    // Pintamos el encabezado con dicha columna para ver el indicador que se elige.
    render(<DataTableColumnHeader column={column} title="Codigo" />);
    // Verificamos que el icono con flecha hacia arriba sea el visible para la persona usuaria.
    expect(screen.getByLabelText("Orden ascendente")).toBeInTheDocument();
    // Confirmamos que no se muestra el icono de orden descendente en este estado.
    expect(screen.queryByLabelText("Orden descendente")).not.toBeInTheDocument();
  });

  it("muestra la flecha hacia abajo cuando el orden es descendente", () => {
    // Configuramos la columna como descendente para recrear el segundo estado posible.
    const column = createColumnMock("desc");
    // Renderizamos el encabezado con esta columna simulada.
    render(<DataTableColumnHeader column={column} title="Estado" />);
    // Revisamos que el icono de flecha hacia abajo sea el presentado.
    expect(screen.getByLabelText("Orden descendente")).toBeInTheDocument();
    // Aseguramos que el icono ascendente no aparezca mientras el orden es descendente.
    expect(screen.queryByLabelText("Orden ascendente")).not.toBeInTheDocument();
  });

  it("solicita el cambio de orden en el sentido correcto al hacer clic", async () => {
    // Creamos un usuario para simular interacciones reales con el encabezado.
    const user = userEvent.setup();
    // Definimos una columna en estado ascendente para observar el parametro enviado al cambiar.
    const column = createColumnMock("asc");
    // Renderizamos el componente con esa columna.
    render(<DataTableColumnHeader column={column} title="Facultad" />);
    // Disparamos el clic sobre el boton usando su etiqueta accesible.
    await user.click(screen.getByRole("button", { name: "Ordenar por Facultad" }));
    // Comprobamos que toggleSorting se llamo con "true", lo que indica pasar a descendente.
    expect(column.toggleSorting).toHaveBeenCalledWith(true);
  });
});
