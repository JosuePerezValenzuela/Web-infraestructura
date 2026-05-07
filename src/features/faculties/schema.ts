import { z } from "zod";

// Campos compartidos entre creaciÃ³n y ediciÃ³n de facultades.
const facultySharedSchema = z.object({
  codigo: z
    .string({ error: "Ingrese el codigo de la facultad" })
    .trim()
    .min(1, { message: "Ingrese el codigo de la facultad" })
    .max(16, { message: "Maximo 16 caracteres" }),
  nombre: z
    .string({ error: "Ingrese el nombre de la facultad" })
    .trim()
    .min(1, { message: "Ingrese el nombre de la facultad" })
    .max(128, { message: "Maximo 128 caracteres" }),
  nombre_corto: z
    .string({ error: "El nombre corto debe ser texto" })
    .trim()
    .max(16, { message: "Maximo 16 caracteres" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

// Esquema de validacio para crear una facultad con uno o mas campus.
export const facultyCreateSchema = facultySharedSchema.extend({
  campus_ids: z
    .array(
      z
        .number({ error: "Seleccione un campus valido" })
        .int({ message: "Seleccione un campus valido" })
        .min(1, { message: "Seleccione un campus valido" })
    )
    .min(1, { message: "Seleccione al menos un campus" }),
});

// Esquema de validacion para actualizar una facultad, alineado con la HU 7.
export const facultyUpdateSchema = facultySharedSchema.extend({
  campus_ids: z
    .array(
      z
        .number({ error: "Seleccione un campus valido" })
        .int({ message: "Seleccione un campus valido" })
        .min(1, { message: "Seleccione un campus valido" })
    )
    .min(1, { message: "Seleccione al menos un campus" }),
  activo: z.boolean({ error: "Indique si la facultad esta activa" }),
});

export type FacultyCreateInput = z.output<typeof facultyCreateSchema>;
export type FacultyUpdateInput = z.output<typeof facultyUpdateSchema>;
