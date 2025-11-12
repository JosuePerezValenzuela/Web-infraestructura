import { z } from "zod";

const descripcionCortaSchema = z
  .string()
  .trim()
  .max(32, "La descripcion corta no puede superar 32 caracteres.")
  .or(z.literal(""))
  .or(z.undefined())
  .transform((value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  });

// Esquema base que valida los campos exigidos por la HU 17.
export const environmentTypeCreateSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(64, "El nombre no puede superar 64 caracteres."),
  descripcion: z
    .string()
    .trim()
    .min(1, "La descripcion es obligatoria.")
    .max(256, "La descripcion no puede superar 256 caracteres."),
  descripcion_corta: descripcionCortaSchema,
});

export type EnvironmentTypeCreateInput = z.input<typeof environmentTypeCreateSchema>;
export type EnvironmentTypeCreateOutput = z.output<typeof environmentTypeCreateSchema>;

// Esquema extendido para edicion que incorpora el estado activo.
export const environmentTypeUpdateSchema = environmentTypeCreateSchema.extend({
  activo: z.boolean(),
});

export type EnvironmentTypeUpdateInput = z.input<typeof environmentTypeUpdateSchema>;
export type EnvironmentTypeUpdateOutput = z.output<typeof environmentTypeUpdateSchema>;
