import { z } from "zod";

// Utilidad para transformar cadenas provenientes de inputs numÃ©ricos en nÃºmeros reales.
const numberFromInput = z
  .coerce
  .number()
  .refine(Number.isFinite, { message: "Debe ser numerico" });

// Esquema base compartido entre creaciÃ³n y ediciÃ³n de facultades.
const facultyBaseSchema = z.object({
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
  campus_id: z
    .coerce
    .number({ error: "Seleccione un campus valido" })
    .int({ message: "Seleccione un campus valido" })
    .min(1, { message: "Seleccione un campus valido" }),
  lat: numberFromInput
    .min(-90, { message: "Latitud invalida" })
    .max(90, { message: "Latitud invalida" }),
  lng: numberFromInput
    .min(-180, { message: "Longitud invalida" })
    .max(180, { message: "Longitud invalida" }),
});

// Esquema de validacio para crear una facultad, alineado con la HU 5.
export const facultyCreateSchema = facultyBaseSchema;

// Esquema de validacion para actualizar una facultad, alineado con la HU 7.
export const facultyUpdateSchema = facultyBaseSchema.extend({
  activo: z.boolean({ error: "Indique si la facultad esta activa" }),
});

export type FacultyCreateInput = z.output<typeof facultyCreateSchema>;
export type FacultyUpdateInput = z.output<typeof facultyUpdateSchema>;

