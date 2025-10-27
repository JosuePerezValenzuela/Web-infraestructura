"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { blockTypeColumns, type BlockTypeRow } from "@/features/block-types/list/columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BlockTypeForm from "@/features/block-types/BlockTypeForm";

const TAKE = 8;

export default function BlockTypeListPage() {
  // Guardamos los registros que se mostrarán en la tabla.
  const [items, setItems] = useState<BlockTypeRow[]>([]);
  // Controlamos la página actual para la paginación.
  const [page, setPage] = useState(1);
  // Guardamos el total de páginas disponibles que llega desde el backend.
  const [pages, setPages] = useState(1);
  // Registramos el texto de búsqueda que escribe la persona usuaria.
  const [search, setSearch] = useState("");
  // Administramos el estado de apertura del diálogo de creación.
  const [open, setOpen] = useState(false);

  // Normalizamos el término de búsqueda quitando espacios innecesarios.
  const query = useMemo(() => search.trim(), [search]);

  async function fetchData(signal?: AbortSignal) {
    try {
      // Construimos los parámetros de consulta que entenderá la API para paginar y buscar.
      const params = new URLSearchParams({
        page: String(page),
        limit: String(TAKE),
        ...(query ? { search: query } : {}),
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/tipo_bloques?${params.toString()}`,
        { signal }
      );

      if (!res.ok) {
        return;
      }

      // Interpretamos la respuesta como JSON siguiendo la forma estándar del backend.
      const data = (await res.json()) as {
        items: BlockTypeRow[];
        meta: { page: number; take: number; pages: number; total: number };
      };

      // Actualizamos el listado de filas con lo que envió la API.
      setItems(data.items);
      // Sincronizamos la página actual después de cada consulta.
      setPage(data.meta.page);
      // Guardamos la cantidad total de páginas para controlar la navegación.
      setPages(data.meta.pages);
    } catch (error) {
      // Ignoramos el error si proviene de una cancelación controlada del fetch.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  useEffect(() => {
    // Creamos un controlador para poder cancelar la petición al desmontar el componente.
    const controller = new AbortController();
    // Lanzamos la carga inicial (y cada vez que cambien la página o el término de búsqueda).
    void fetchData(controller.signal);
    // Cancelamos la petición si el componente se desmonta.
    return () => controller.abort();
  }, [page, query]);

  async function handleCreateSuccess() {
    // Reutilizamos la función de carga para refrescar el listado tras crear un nuevo registro.
    await fetchData();
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tipos de bloques
        </h1>
        <p className="text-muted-foreground text-sm">
          Administra el catalogo de tipos de bloques disponibles para clasificar los edificios.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o descripción"
            aria-label="Buscar tipos de bloques"
          />
        </div>
        <Button onClick={() => setOpen(true)}>Nuevo tipo de bloque</Button>
      </div>

      <DataTable
        data={items}
        columns={blockTypeColumns()}
        page={page}
        pages={pages}
        onPageChange={(nextPage) => setPage(nextPage)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear tipo de bloque</DialogTitle>
            <DialogDescription>
              Ingresa la información necesaria para registrar un nuevo tipo de bloque.
            </DialogDescription>
          </DialogHeader>

          <BlockTypeForm
            onSuccess={handleCreateSuccess}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
