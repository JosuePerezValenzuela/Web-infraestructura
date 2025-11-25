import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Column } from "@tanstack/react-table";

export function DataTableColumnHeader<T>({
  column,
  title,
}: {
  column: Column<T, unknown>;
  title: string;
}) {
  // Guardamos el estado de orden actual para decidir icono y el siguiente sentido al hacer clic.
  const sorted = column.getIsSorted();
  // Elegimos que icono y etiqueta accesible mostrar segun el estado actual.
  const { Icon, label } =
    sorted === "asc"
      ? { Icon: ArrowUp, label: "Orden ascendente" }
      : sorted === "desc"
        ? { Icon: ArrowDown, label: "Orden descendente" }
        : { Icon: ArrowUpDown, label: "Sin orden aplicado" };

  return (
    <Button
      // Usamos un boton fantasma para que luzca como encabezado clickeable sin exceso de color.
      variant="ghost"
      // Quitamos padding lateral para alinear con el estilo de tabla y resaltamos el peso del texto.
      className="px-0 font-semibold"
      // Al hacer clic pedimos al componente de tabla que invierta el sentido; si ya es ascendente, pasara a descendente.
      onClick={() => column.toggleSorting(sorted === "asc")}
      // Etiqueta accesible que explica que accion realiza este boton para lectores de pantalla.
      aria-label={`Ordenar por ${title}`}
    >
      {/* Agrupamos titulo e icono para mantenerlos juntos y con un pequeño espacio. */}
      <span className="flex items-center gap-2">
        {/* Mostramos el nombre de la columna tal como lo espera la persona usuaria. */}
        <span>{title}</span>
        {/* Renderizamos el icono que corresponde al estado de orden actual e incluimos su etiqueta accesible. */}
        <Icon className="h-4 w-4" aria-label={label} />
        {/* Agregamos texto solo para lectores de pantalla que explica el estado actual de orden. */}
        <span className="sr-only">
          {sorted === "asc"
            ? "Orden ascendente activo"
            : sorted === "desc"
              ? "Orden descendente activo"
              : "Sin orden activo"}
        </span>
      </span>
    </Button>
  );
}
