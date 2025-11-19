"use client";

import { z } from "zod";

const foreignKeyField = z
  .union([z.coerce.number().int().positive(), z.literal("")])
  .transform((value) => (value === "" ? undefined : value));

const optionalString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  });

const boundedDecimal = (min: number, max: number, message: string) =>
  z.coerce.number().min(min, message).max(max, message);

const environmentFormSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(1, "El codigo es obligatorio")
      .max(16, "El codigo no puede superar 16 caracteres"),
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(64, "El nombre no puede superar 64 caracteres"),
    nombre_corto: optionalString,
    piso: z
      .coerce.number()
      .int()
      .min(-5, "El piso minimo es -5 (sotano)")
      .max(80, "El piso maximo permitido es 80"),
    capacidad_total: z
      .coerce.number()
      .int()
      .min(0, "La capacidad total debe ser positiva")
      .max(5000, "Capacidad total demasiado alta"),
    capacidad_examen: z
      .coerce.number()
      .int()
      .min(0, "La capacidad para examenes debe ser positiva")
      .max(2000, "Capacidad de examenes demasiado alta"),
    dimension_largo: boundedDecimal(
      0.5,
      200,
      "El largo debe estar entre 0.5 y 200 metros"
    ),
    dimension_ancho: boundedDecimal(
      0.5,
      200,
      "El ancho debe estar entre 0.5 y 200 metros"
    ),
    dimension_alto: boundedDecimal(
      0.5,
      30,
      "El alto debe estar entre 0.5 y 30 metros"
    ),
    dimension_unidad: z
      .string()
      .trim()
      .min(1, "Define la unidad de medida")
      .max(16, "La unidad no puede superar 16 caracteres"),
    clases: z.boolean().default(true),
    activo: z.boolean().default(true),
    tipo_ambiente_id: foreignKeyField,
    bloque_id: foreignKeyField,
  })
  .superRefine((data, ctx) => {
    if (data.tipo_ambiente_id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipo_ambiente_id"],
        message: "Selecciona un tipo de ambiente",
      });
    }

    if (data.bloque_id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bloque_id"],
        message: "Selecciona un bloque",
      });
    }

    if (data.capacidad_examen > data.capacidad_total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capacidad_examen"],
        message: "La capacidad de examen no puede superar a la total",
      });
    }
  })
  .transform((data) => ({
    codigo: data.codigo.trim(),
    nombre: data.nombre.trim(),
    nombre_corto: data.nombre_corto,
    piso: data.piso,
    clases: data.clases,
    activo: data.activo,
    capacidad: {
      total: data.capacidad_total,
      examen: data.capacidad_examen,
    },
    dimension: {
      largo: data.dimension_largo,
      ancho: data.dimension_ancho,
      alto: data.dimension_alto,
      unid_med: data.dimension_unidad.trim(),
    },
    tipo_ambiente_id: data.tipo_ambiente_id as number,
    bloque_id: data.bloque_id as number,
  }));

export const environmentCreateSchema = environmentFormSchema;
export const environmentUpdateSchema = environmentFormSchema;

export type EnvironmentCreateInput = z.input<typeof environmentCreateSchema>;
export type EnvironmentCreateOutput = z.output<typeof environmentCreateSchema>;
export type EnvironmentUpdateInput = z.input<typeof environmentUpdateSchema>;
export type EnvironmentUpdateOutput = z.output<typeof environmentUpdateSchema>;
