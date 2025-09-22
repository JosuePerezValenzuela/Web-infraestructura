import { z } from 'zod';

export const campusCreateSchema = z.object({
    nombre: z.string().min(1, 'Ingrese el nombre del campus').max(128),
    direccion: z.string().min(1, 'Ingrese la direccion del campus').max(256),
    lat: z.coerce
      .number()
      .refine(Number.isFinite, { message: 'La latitud debe ser numerica' })
      .min(-90, { message: 'Latitud invalida' })
      .max(-90, { message: 'Latitud invalida' })
      .transform(n => Number(n.toFixed(6))),
    lng: z.coerce
      .number()
      .refine(Number.isFinite, { message: 'La longitud debe ser numerica' })
      .min(-180, { message: 'Longitud invalida' })
      .max(180, { message: 'Longitud invalida' })
      .transform(n => Number(n.toFixed(6))),
});

export type CampusCreateInput = z.infer<typeof campusCreateSchema>;