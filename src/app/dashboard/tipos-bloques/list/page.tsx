"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  blockTypeColumns,
  type BlockTypeRow,
} from "@/features/block-types/list/columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import BlockTypeForm from "@/features/block-types/BlockTypeForm";
import BlockTypeEditForm from "@/features/block-types/edit/BlockTypeEditForm";
import { X } from "lucide-react";

const TAKE = 8;

export default function BlockTypeListPage() {
  // Guardamos la informacion que llega desde la API para poblar la tabla.
  const [items, setItems] = useState<BlockTypeRow[]>([]);
  // Almacenamos la pagina actual para manejar la paginacion.
  const [page, setPage] = useState(1);
  // Conservamos la cantidad total de paginas informada por el backend.
  const [pages, setPages] = useState(1);
  // Mantenemos el texto de busqueda escrito por la persona usuaria.
  const [search, setSearch] = useState("");
  // Controlamos la apertura del dialogo de creacion.
  const [createOpen, setCreateOpen] = useState(false);
  // Guardamos el registro que se esta editando.
  const [blockTypeToEdit, setBlockTypeToEdit] = useState<BlockTypeRow | null>(
    null
  );
  // Controlamos la apertura del dialogo de edicion.
  const [editOpen, setEditOpen] = useState(false);

  // Limpiamos espacios innecesarios del termino de busqueda antes de enviarlo al servidor.
  const query = useMemo(() => search.trim(), [search]);

  async function fetchData(signal?: AbortSignal) {
    try {
      // Construimos los parametros de consulta que entiende la API para buscar y paginar.
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

      // Transformamos la respuesta en JSON siguiendo el formato del backend.
      const data = (await res.json()) as {
        items: BlockTypeRow[];
        meta: { page: number; take: number; pages: number; total: number };
      };

      // Actualizamos la tabla con los elementos recibidos.
      setItems(data.items);
      // Sincronizamos la pagina actual con la respuesta.
      setPage(data.meta.page);
      // Conservamos la cantidad total de paginas.
      setPages(data.meta.pages);
    } catch (error) {
      // Si la peticion fue cancelada manualmente no mostramos nada.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  useEffect(() => {
    // Creamos un controlador para poder abortar la peticion cuando el componente se desmonte.
    const controller = new AbortController();
    // Disparamos la consulta inicial y tambien cuando cambia la pagina o el termino de busqueda.
    void fetchData(controller.signal);
    // Cancelamos la peticion en curso si el componente se desmonta.
    return () => controller.abort();
  }, [page, query]);

  async function handleCreateSuccess() {
    // Volvemos a consultar la lista para reflejar el registro recien creado.
    await fetchData();
  }

  function handleEdit(blockType: BlockTypeRow) {
    // Guardamos el registro seleccionado y abrimos el dialogo de edicion.
    setBlockTypeToEdit(blockType);
    setEditOpen(true);
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tipos de bloques
        </h1>
        <p className="text-sm text-muted-foreground">
          Administra el catalogo que clasifica los bloques de la institucion.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar tipos de bloques"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nuevo tipo de bloque</Button>
      </div>

      <DataTable
        data={items}
        columns={blockTypeColumns(handleEdit)}
        page={page}
        pages={pages}
        onPageChange={(nextPage) => setPage(nextPage)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle>Crear tipo de bloque</DialogTitle>
                <DialogDescription>
                  Completa la informacion para registrar un nuevo elemento del
                  catalogo.
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <X className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Cerrar</span>
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <BlockTypeForm
            onSuccess={handleCreateSuccess}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(value) => {
          setEditOpen(value);
          if (!value) {
            setBlockTypeToEdit(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle>Editar tipo de bloque</DialogTitle>
                <DialogDescription>
                  Ajusta los datos para mantener el catalogo actualizado.
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <X className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Cerrar</span>
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          {blockTypeToEdit ? (
            <BlockTypeEditForm
              blockType={blockTypeToEdit}
              onSubmitSuccess={async () => {
                await fetchData();
                setEditOpen(false);
                setBlockTypeToEdit(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
