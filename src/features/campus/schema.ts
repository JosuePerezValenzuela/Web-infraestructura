import { z } from "zod";

export const campusCreateSchema = z.object({
  nombre: z.string({ error: "Ingrese el nombre del campus" })
           .min(1, { error: "Ingrese el nombre del campus" })
           .max(128, { error: "Máximo 128 caracteres" }),
  direccion: z.string({ error: "Ingrese la dirección del campus" })
              .min(1, { error: "Ingrese la dirección del campus" })
              .max(256, { error: "Máximo 256 caracteres" }),
  lat: z.number({ error: "La latitud debe ser numérica" })
        .min(-90, { error: "Latitud inválida" })
        .max(90, { error: "Latitud inválida" }),
  lng: z.number({ error: "La longitud debe ser numérica" })
        .min(-180, { error: "Longitud inválida" })
        .max(180, { error: "Longitud inválida" }),
});

export type CampusCreateInput = z.output<typeof campusCreateSchema>;
