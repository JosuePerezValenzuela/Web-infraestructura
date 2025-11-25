import { NextResponse } from "next/server";
import { goodsResponseSchema } from "@/lib/goods-api";

const GOODS_API_BASE =
  process.env.GOODS_API_BASE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_GOODS_API_BASE_URL?.replace(/\/$/, "") ||
  "";

export async function GET(
  _request: Request,
  { params }: { params: { nia: string } }
) {
  // Validamos que la base de la API externa este configurada en variables de entorno.
  if (!GOODS_API_BASE) {
    return NextResponse.json(
      { message: "Falta configurar GOODS_API_BASE_URL" },
      { status: 500 }
    );
  }

  const nia = decodeURIComponent(params.nia ?? "").trim();
  // Si no se recibio NIA devolvemos un error claro para el consumidor.
  if (!nia.length) {
    return NextResponse.json(
      { message: "NIA requerido" },
      { status: 400 }
    );
  }

  try {
    // Construimos la URL hacia el servicio externo cuidando duplicar diagonales.
    const url = `${GOODS_API_BASE}/bienes/${encodeURIComponent(nia)}`;
    // Ejecutamos la llamada en el servidor para evitar CORS en el cliente.
    const externalResponse = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    // Si la respuesta no es exitosa, propagamos el error de manera controlada.
    if (!externalResponse.ok) {
      return NextResponse.json(
        { message: "No pudimos obtener datos del activo externo." },
        { status: externalResponse.status }
      );
    }

    const rawData = await externalResponse.json().catch(() => []);
    const parsed = goodsResponseSchema.safeParse(rawData);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Respuesta de bienes no valida." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "No pudimos obtener datos del activo externo." },
      { status: 500 }
    );
  }
}
