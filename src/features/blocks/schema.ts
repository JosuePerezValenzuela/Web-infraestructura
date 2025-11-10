"use client";

import { z } from "zod";

function createOptionalCoordinateField(
  rangeMessage: string,
  min: number,
  max: number
) {
  return z
    .union([z.string(), z.number(), z.undefined(), z.null()])
    .transform((value) => {
      if (value === "" || value === undefined || value === null) {
        return undefined;
      }

      if (typeof value === "number") {
        return value;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? NaN : parsed;
    })
    .refine(
      (value) =>
        value === undefined ||
        (!Number.isNaN(value) && value >= min && value <= max),
      {
        message: rangeMessage,
      }
    );
}

const latField = createOptionalCoordinateField(
  "La latitud debe estar entre -90 y 90",
  -90,
  90
);

const lngField = createOptionalCoordinateField(
  "La longitud debe estar entre -180 y 180",
  -180,
  180
);

const foreignKeyField = z
  .union([z.coerce.number().int().positive(), z.literal("")])
  .transform((value) => (value === "" ? undefined : value));

const blockSharedFields = {
  codigo: z
    .string()
    .trim()
    .min(1, "El codigo es obligatorio")
    .max(16, "El codigo no puede superar 16 caracteres"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(128, "El nombre no puede superar 128 caracteres"),
  nombre_corto: z
    .string()
    .trim()
    .max(16, "El nombre corto no puede superar 16 caracteres")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
  pisos: z
    .coerce.number()
    .int()
    .min(1, "Debe tener al menos un piso")
    .max(99, "El limite maximo es 99 pisos"),
  lat: latField,
  lng: lngField,
  facultad_id: foreignKeyField,
  tipo_bloque_id: foreignKeyField,
} as const;

const blockCreateObjectSchema = z.object({
  ...blockSharedFields,
  activo: z.boolean().default(true),
});

const blockUpdateObjectSchema = z
  .object({
    ...blockSharedFields,
    activo: z.boolean().optional(),
  })
  .partial();

function sanitizeBlockData<
  T extends {
    lat?: number;
    lng?: number;
    facultad_id?: number;
    tipo_bloque_id?: number;
  }
>(data: T) {
  return {
    ...data,
    lat: typeof data.lat === "number" ? data.lat : undefined,
    lng: typeof data.lng === "number" ? data.lng : undefined,
    facultad_id:
      typeof data.facultad_id === "number" ? data.facultad_id : undefined,
    tipo_bloque_id:
      typeof data.tipo_bloque_id === "number" ? data.tipo_bloque_id : undefined,
  };
}

export const blockCreateSchema = blockCreateObjectSchema
  .superRefine((data, ctx) => {
    const hasLat = typeof data.lat === "number";
    const hasLng = typeof data.lng === "number";

    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitud y longitud deben enviarse juntas",
        path: hasLat ? ["lng"] : ["lat"],
      });
    }

    if (data.facultad_id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona una facultad",
        path: ["facultad_id"],
      });
    }

    if (data.tipo_bloque_id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un tipo de bloque",
        path: ["tipo_bloque_id"],
      });
    }
  })
  .transform((data) => ({
    ...sanitizeBlockData(data),
    facultad_id: data.facultad_id as number,
    tipo_bloque_id: data.tipo_bloque_id as number,
  }));

export type BlockCreateInput = z.input<typeof blockCreateSchema>;
export type BlockCreateOutput = z.output<typeof blockCreateSchema>;

export const blockUpdateSchema = blockUpdateObjectSchema
  .superRefine((data, ctx) => {
    const hasLat = typeof data.lat === "number";
    const hasLng = typeof data.lng === "number";

    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitud y longitud deben enviarse juntas",
        path: hasLat ? ["lng"] : ["lat"],
      });
    }
  })
  .transform((data) => sanitizeBlockData(data));

export type BlockUpdateInput = z.input<typeof blockUpdateSchema>;
export type BlockUpdateOutput = z.output<typeof blockUpdateSchema>;
