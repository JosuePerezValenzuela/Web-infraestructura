"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  environmentTypeColumns,
  type EnvironmentTypeRow,
} from "@/features/environment-types/list/columns";

// Definimos la cantidad de filas que solicitaremos por pagina para mantener una altura consistente.
const TAKE = 8;

export default function EnvironmentTypeListPage() {
  // Guardamos las filas recibidas desde la API para mostrarlas en la tabla.
  const [items, setItems] = useState<EnvironmentTypeRow[]>([]);
  // Conservamos la pagina actual que se esta mostrando.
  const [page, setPage] = useState(1);
  // Almacenamos la cantidad total de paginas para habilitar o deshabilitar la paginacion.
  const [pages, setPages] = useState(1);
  // Mantenemos el termino de busqueda escrito por la persona usuaria.
  const [search, setSearch] = useState("");

  // Normalizamos el termino de busqueda quitando espacios extra para evitar consultas innecesarias.
  const query = useMemo(() => search.trim(), [search]);

  // Cada vez que cambia el termino de busqueda regresamos a la primera pagina.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Encapsulamos la llamada al backend para poder reutilizarla despues de paginar.
  async function fetchData(signal?: AbortSignal) {
    try {
      // Construimos los parametros aceptados por la API: pagina, limite y filtro opcional.
      const params = new URLSearchParams({
        page: String(page),
        limit: String(TAKE),
        ...(query ? { search: query } : {}),
      });

      // Realizamos la peticion GET al endpoint publico configurado.
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/tipo_ambientes?${params.toString()}`,
        { signal }
      );

      // Si el backend responde con error simplemente abandonamos el flujo.
      if (!res.ok) {
        return;
      }

      // Interpretamos el cuerpo como JSON siguiendo el contrato documentado.
      const data = (await res.json()) as {
        items: EnvironmentTypeRow[];
        meta: { page: number; pages: number };
      };

      // Actualizamos la tabla con las filas recibidas.
      setItems(data.items);
      // Sincronizamos la pagina actual con la confirmada por el backend.
      setPage(data.meta.page);
      // Guardamos la cantidad de paginas para el componente de paginacion.
      setPages(data.meta.pages);
    } catch (error) {
      // Si abortamos la solicitud manualmente ignoramos el error lanzado por fetch.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  // Ejecutamos la consulta inicial y la repetimos cada vez que cambian la pagina o el termino de busqueda.
  useEffect(() => {
    // Creamos un controlador para cancelar la peticion si el componente se desmonta.
    const controller = new AbortController();
    // Disparamos la peticion sin bloquear el renderizado.
    void fetchData(controller.signal);
    // Cancelamos la peticion en curso cuando el componente deja de existir.
    return () => controller.abort();
  }, [page, query]);

  // Renderizamos la seccion principal con los controles de busqueda y la tabla.
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tipos de ambientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Consulta y gestiona los tipos de ambientes que se usan para clasificar los espacios institucionales.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-md items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar tipos de ambientes"
          />
        </div>
        <Button type="button" className="w-full sm:w-auto">
          Nuevo tipo de ambientes
        </Button>
      </div>

      <DataTable
        data={items}
        columns={environmentTypeColumns()}
        page={page}
        pages={pages}
        onPageChange={(nextPage) => setPage(nextPage)}
        showViewOptions={false}
      />
    </section>
  );
}
