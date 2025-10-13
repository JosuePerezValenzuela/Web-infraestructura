import { z } from "zod";

// Utilidad para convertir cadenas provenientes de inputs numéricos a números reales.
const numberFromInput = z
  .coerce
  .number()
  .refine(Number.isFinite, { message: "Debe ser numérico" });

// Esquema de validación para crear una facultad, alineado con HU 5.
export const facultyCreateSchema = z.object({
  codigo: z
    .string({ error: "Ingrese el código de la facultad" })
    .trim()
    .min(1, { message: "Ingrese el código de la facultad" })
    .max(16, { message: "Máximo 16 caracteres" }),
  nombre: z
    .string({ error: "Ingrese el nombre de la facultad" })
    .trim()
    .min(1, { message: "Ingrese el nombre de la facultad" })
    .max(128, { message: "Máximo 128 caracteres" }),
  nombre_corto: z
    .string({ error: "El nombre corto debe ser texto" })
    .trim()
    .max(16, { message: "Máximo 16 caracteres" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  campus_id: z
    .coerce
    .number({ error: "Seleccione un campus válido" })
    .int({ message: "Seleccione un campus válido" })
    .min(1, { message: "Seleccione un campus válido" }),
  lat: numberFromInput
    .min(-90, { message: "Latitud inválida" })
    .max(90, { message: "Latitud inválida" }),
  lng: numberFromInput
    .min(-180, { message: "Longitud inválida" })
    .max(180, { message: "Longitud inválida" }),
});

export type FacultyCreateInput = z.output<typeof facultyCreateSchema>;
