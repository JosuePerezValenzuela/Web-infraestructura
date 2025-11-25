import { describe, expect, it } from "vitest"; // Traemos las herramientas base de pruebas.
import { blockColumns, type BlockRow } from "../columns"; // Importamos la definicion de columnas a verificar.

describe("blockColumns sorting", () => {
  it("expone accessorFn string para ordenar por Facultad y Tipo de bloque", () => {
    // Declaramos un row con datos anidados para simular la forma en la que llega del backend.
    const sampleRow: BlockRow = {
      id: 1, // Identificador del bloque.
      codigo: "BL-01", // Codigo visible.
      nombre: "Bloque A", // Nombre del bloque.
      nombre_corto: "A", // Nombre corto.
      pisos: 3, // Cantidad de pisos.
      activo: true, // Estado activo.
      facultad_id: 10, // Id de la facultad.
      tipo_bloque_id: 5, // Id del tipo de bloque.
      facultad_detalle: { nombre: "Ingenieria" }, // Relacion con la facultad incluyendo nombre.
      tipo_bloque_detalle: { nombre: "Docente" }, // Relacion con el tipo de bloque.
      creado_en: "2024-01-01T00:00:00Z", // Fecha de creacion.
    };

    // Construimos las columnas como lo hace la pantalla, pasando callbacks vacios para las acciones.
    const columns = blockColumns(
      () => {
        // noop para editar en este escenario.
      },
      () => {
        // noop para eliminar en este escenario.
      }
    );

    // Buscamos la columna de facultad por su meta label para validar su configuracion de ordenamiento.
    const facultyColumn = columns.find(
      (col) => col.meta?.label === "Facultad"
    );
    // Buscamos la columna de tipo de bloque de igual manera.
    const typeColumn = columns.find(
      (col) => col.meta?.label === "Tipo de bloque"
    );

    // Confirmamos que ambas columnas existen en la definicion.
    expect(facultyColumn).toBeDefined();
    expect(typeColumn).toBeDefined();

    // Verificamos que la columna de facultad expone un accessorFn utilizable para ordenar por texto.
    expect(facultyColumn?.accessorFn).toBeDefined();
    // Verificamos que la columna de tipo de bloque tambien expone accessorFn.
    expect(typeColumn?.accessorFn).toBeDefined();

    // Evaluamos el valor que devuelve el accessorFn de facultad para asegurar que es un string ordenable.
    const facultyValue = facultyColumn?.accessorFn?.(
      sampleRow,
      sampleRow.id.toString()
    );
    // Evaluamos el valor que devuelve el accessorFn de tipo de bloque para la misma finalidad.
    const typeValue = typeColumn?.accessorFn?.(
      sampleRow,
      sampleRow.id.toString()
    );

    // Confirmamos que el valor calculado para facultad coincide con el nombre anidado.
    expect(facultyValue).toBe("Ingenieria");
    // Confirmamos que el valor calculado para tipo de bloque coincide con el nombre anidado.
    expect(typeValue).toBe("Docente");
  });
});
