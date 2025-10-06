import { z } from 'zod';

const numberFromInput = z
  .coerce
  .number()
  .refine(Number.isFinite, { message: 'Debe ser numerico' });

const campusBaseSchema = z.object({
  codigo: z
    .string({ error: 'Ingrese el codigo del campus' })
    .min(1, { error: 'Ingrese el codigo del campus' })
    .max(16, { error: 'Maximo 16 caracteres' }),
  nombre: z
    .string({ error: 'Ingrese el nombre del campus' })
    .min(1, { error: 'Ingrese el nombre del campus' })
    .max(128, { error: 'Maximo 128 caracteres' }),
  direccion: z
    .string({ error: 'Ingrese la direccion del campus' })
    .min(1, { error: 'Ingrese la direccion del campus' })
    .max(256, { error: 'Maximo 256 caracteres' }),
  lat: numberFromInput
    .min(-90, { message: 'Latitud invalida' })
    .max(90, { message: 'Latitud invalida' }),
  lng: numberFromInput
    .min(-180, { message: 'Longitud invalida' })
    .max(180, { message: 'Longitud invalida' }),
});

export const campusCreateSchema = campusBaseSchema;

export const campusUpdateSchema = campusBaseSchema.extend({
  activo: z.boolean({ error: 'Indique si el campus esta activo' }),
});

export type CampusCreateInput = z.output<typeof campusCreateSchema>;
export type CampusUpdateInput = z.output<typeof campusUpdateSchema>;
