import { describe, expect, it } from "vitest"; // Herramientas base para definir y evaluar pruebas.
import { environmentColumns, type EnvironmentRow } from "../columns"; // Definici?n de columnas que queremos validar.

describe("environmentColumns sorting", () => {
  it("expone accessorFn ordenables para tipo, bloque y capacidad", () => {
    // Fila de ejemplo que simula la respuesta del backend con relaciones anidadas y capacidad como objeto.
    const sampleRow: EnvironmentRow = {
      id: 12,
      codigo: "AMB-12",
      nombre: "Laboratorio de Redes",
      piso: 3,
      clases: true,
      activo: true,
      bloque_id: 4,
      tipo_ambiente_id: 7,
      tipo_ambiente_detalle: { nombre: "Laboratorio" },
      bloque_detalle: { nombre: "Bloque B" },
      capacidad: { total: 50, examen: 30 },
    };

    // Construimos las columnas tal como lo hace la vista.
    const columns = environmentColumns();

    // Localizamos las columnas relevantes por su meta label.
    const typeColumn = columns.find(
      (col) => col.meta?.label === "Tipo de ambiente"
    );
    const blockColumn = columns.find((col) => col.meta?.label === "Bloque");
    const capacityColumn = columns.find(
      (col) => col.meta?.label === "Capacidad"
    );

    // Todas las columnas deben exponer un accessorFn que permita ordenar.
    expect(typeColumn?.accessorFn).toBeDefined();
    expect(blockColumn?.accessorFn).toBeDefined();
    expect(capacityColumn?.accessorFn).toBeDefined();

    // Los valores calculados deben ser ordenables (string o number) y reflejar el dato mostrado.
    const typeValue = typeColumn?.accessorFn?.(
      sampleRow,
      sampleRow.id.toString()
    );
    const blockValue = blockColumn?.accessorFn?.(
      sampleRow,
      sampleRow.id.toString()
    );
    const capacityValue = capacityColumn?.accessorFn?.(
      sampleRow,
      sampleRow.id.toString()
    );

    expect(typeValue).toBe("Laboratorio");
    expect(blockValue).toBe("Bloque B");
    expect(capacityValue).toBe(50); // Usamos la capacidad total como criterio de orden.
  });
});
