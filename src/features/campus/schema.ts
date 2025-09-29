import { z } from "zod";

const numbreFromInput = z.coerce.number().refine(Number.isFinite, { message: 'Debe ser numerico'});

export const campusCreateSchema = z.object({
  codigo: z.string({ error: "Ingrese el codigo del campus"})
           .min(1, { error: "Ingrese el codigo del campus" })
            .max(16, { error: "Máximo 16 caracteres" }),
  nombre: z.string({ error: "Ingrese el nombre del campus" })
           .min(1, { error: "Ingrese el nombre del campus" })
           .max(128, { error: "Máximo 128 caracteres" }),
  direccion: z.string({ error: "Ingrese la dirección del campus" })
              .min(1, { error: "Ingrese la dirección del campus" })
              .max(256, { error: "Máximo 256 caracteres" }),
  lat: numbreFromInput.min(-90, {message: 'Latitud invalida'}).max(90, {message: 'Latitud invalida'}),
  lng: numbreFromInput.min(-180, {message: 'Longitud invalida'}).max(180, {message: 'Longitud invalida'}),
});

export type CampusCreateInput = z.output<typeof campusCreateSchema>;
