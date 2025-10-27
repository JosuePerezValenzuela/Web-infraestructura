import { z } from "zod";

export const blockTypeCreateSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio.")
    .max(64, "El nombre no puede superar 64 caracteres."),
  descripcion: z
    .string()
    .min(1, "La descripcion es obligatoria.")
    .max(256, "La descripcion no puede superar 256 caracteres."),
  activo: z.boolean(),
});

export type BlockTypeCreateInput = z.input<typeof blockTypeCreateSchema>;
export type BlockTypeCreateOutput = z.output<typeof blockTypeCreateSchema>;
