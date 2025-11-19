import { describe, expect, it } from "vitest";
import { mapEnvironmentDetailToFormValues } from "../mappers";

describe("mapEnvironmentDetailToFormValues", () => {
  it("normaliza los campos numericos y anidados del ambiente", () => {
    const values = mapEnvironmentDetailToFormValues({
      id: 1,
      codigo: "AMB-001",
      nombre: "Laboratorio principal",
      nombre_corto: null,
      piso: 3,
      clases: false,
      activo: true,
      capacidad: JSON.stringify({ total: "80", examen: "60" }),
      dimension: { largo: "10.5", ancho: "8", alto: 3, unid_med: "metros" },
      bloque_id: 2,
      tipo_ambiente_id: 5,
    });

    expect(values).toMatchObject({
      codigo: "AMB-001",
      nombre: "Laboratorio principal",
      nombre_corto: "",
      piso: "3",
      capacidad_total: "80",
      capacidad_examen: "60",
      dimension_largo: "10.5",
      dimension_ancho: "8",
      dimension_alto: "3",
      dimension_unidad: "metros",
      clases: false,
      activo: true,
      bloque_id: "2",
      tipo_ambiente_id: "5",
    });
  });

  it("aplica valores por defecto cuando faltan datos en el detalle", () => {
    const values = mapEnvironmentDetailToFormValues({
      id: 2,
      codigo: "AMB-200",
      nombre: "Aula sin datos",
      clases: true,
      activo: false,
      piso: null,
      capacidad_total: 20,
      capacidad_examen: 10,
      dimension_largo: "5",
      dimension_ancho: "4",
      dimension_alto: "2.5",
      dimension_unidad: null,
      bloque_id: 7,
      tipo_ambiente_id: 9,
    });

    expect(values).toMatchObject({
      piso: "",
      capacidad_total: "20",
      capacidad_examen: "10",
      dimension_largo: "5",
      dimension_ancho: "4",
      dimension_alto: "2.5",
      dimension_unidad: "metros",
      clases: true,
      activo: false,
      bloque_id: "7",
      tipo_ambiente_id: "9",
    });
  });

  it("soporta identificadores en camelCase y relaciones anidadas", () => {
    const values = mapEnvironmentDetailToFormValues({
      id: 3,
      codigo: "AMB-300",
      nombre: "Laboratorio remoto",
      clases: true,
      activo: true,
      tipoAmbienteId: "11",
      bloqueId: "15",
      tipoAmbiente: { nombre: "Laboratorio remoto" },
      bloque: { nombre: "Bloque Virtual" },
    });

    expect(values.tipo_ambiente_id).toBe("11");
    expect(values.bloque_id).toBe("15");
  });
});
