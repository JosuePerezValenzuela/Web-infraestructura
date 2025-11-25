import { z } from "zod";

// Definimos el esquema minimo esperado por el servicio externo de bienes.
export const goodsItemSchema = z.object({
  nia: z.union([z.string(), z.number()]),
  descripcion: z.string().nullable().optional(),
  descripcionExt: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  unidadMedida: z.string().nullable().optional(),
});

// Validamos que la respuesta sea siempre un arreglo de bienes.
export const goodsResponseSchema = z.array(goodsItemSchema);

export type GoodsApiItem = z.infer<typeof goodsItemSchema>;

export async function fetchGoodsByNia(
  nia: string,
  options: { signal?: AbortSignal } = {}
): Promise<GoodsApiItem[]> {
  // Tomamos el NIA recibido y lo limpiamos de espacios para no enviar caracteres vacios.
  const trimmedNia = nia.trim();
  // Si no hay NIA ingresado, devolvemos un arreglo vacio porque no hay nada que buscar.
  if (!trimmedNia.length) {
    return [];
  }
  // Consumimos el endpoint interno (Route Handler) para evitar problemas de CORS desde el cliente.
  const url = `/api/goods/${encodeURIComponent(trimmedNia)}`;
  // Ejecutamos la llamada HTTP usando fetch nativo y respetando la señal de abortar cuando se cierre el modal.
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
    },
  });
  // Si la respuesta no es exitosa, devolvemos un error controlado para mostrar en la UI.
  if (!response.ok) {
    throw new Error("No pudimos obtener datos del activo externo.");
  }
  // Intentamos leer el cuerpo como JSON; si falla, asumimos una respuesta vacia.
  const rawData = await response.json().catch(() => []);
  // Validamos la forma de la data usando Zod para proteger la UI de datos inesperados.
  const parsed = goodsResponseSchema.safeParse(rawData);
  // Si la validacion falla, entregamos un arreglo vacio para evitar fallos en el renderizado.
  if (!parsed.success) {
    return [];
  }
  // Normalizamos el NIA a numero cuando sea posible para mantener consistencia en la tabla.
  return parsed.data.map((item) => ({
    ...item,
    nia: typeof item.nia === "string" ? item.nia.trim() : item.nia,
  }));
}
