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
  DialogFooter,
} from "@/components/ui/dialog";
import BlockTypeForm from "@/features/block-types/BlockTypeForm";
import BlockTypeEditForm from "@/features/block-types/edit/BlockTypeEditForm";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import { X } from "lucide-react";
import { env } from "@/lib/env";

export const API_BASE = env.API_BASE_URL;

const TAKE = 5;

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
  // Conservamos el registro seleccionado para eliminacion.
  const [blockTypeToDelete, setBlockTypeToDelete] =
    useState<BlockTypeRow | null>(null);
  // Administramos la apertura del dialogo de eliminacion.
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Indicamos si la peticion DELETE esta en curso.
  const [deleting, setDeleting] = useState(false);

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

      const res = await fetch(`${API_BASE}/tipo_bloques?${params.toString()}`, {
        signal,
      });

      if (!res.ok) {
        return;
      }

      // Transformamos la respuesta en JSON siguiendo el formato del backend.
      const data = (await res.json()) as {
        items: BlockTypeRow[];
        meta: {
          page: number;
          take?: number;
          pages?: number;
          total?: number;
          hasNextPage?: boolean;
          hasPreviousPage?: boolean;
        };
      };

      // Actualizamos la tabla con los elementos recibidos.
      setItems(data.items);
      // Sincronizamos la pagina actual con la respuesta.
      setPage(data.meta.page);
      // Conservamos la cantidad total de paginas.
      const totalFromMeta =
        typeof data.meta?.total === "number" ? data.meta.total : null;
      const takeFromMeta =
        typeof data.meta?.take === "number" && data.meta.take > 0
          ? data.meta.take
          : TAKE;
      const pagesFromMeta =
        typeof data.meta?.pages === "number" && data.meta.pages > 0
          ? data.meta.pages
          : null;
      const pagesFromTotal =
        totalFromMeta !== null
          ? Math.max(1, Math.ceil(totalFromMeta / takeFromMeta))
          : null;
      const basePages = pagesFromMeta ?? pagesFromTotal ?? 1;
      const resolvedPages =
        data.meta?.hasNextPage && page >= basePages ? page + 1 : basePages;
      setPages(resolvedPages);
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

  function handleDelete(blockType: BlockTypeRow) {
    // Guardamos el registro que se desea eliminar y mostramos el dialogo de confirmacion.
    setBlockTypeToDelete(blockType);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    // Si no hay registro seleccionado no continuamos.
    if (!blockTypeToDelete) {
      return;
    }

    try {
      // Avisamos que la peticion comenzo para deshabilitar los controles.
      setDeleting(true);

      // Enviamos la solicitud DELETE al backend para eliminar el registro.
      await apiFetch(`/tipo_bloques/${blockTypeToDelete.id}`, {
        method: "DELETE",
      });

      // Notificamos que la eliminacion se realizo correctamente.
      notify.success({
        title: "Tipo de bloque eliminado",
        description: "El registro se elimino correctamente.",
      });

      // Refrescamos la tabla para reflejar la eliminacion.
      await fetchData();

      // Cerramos el dialogo y limpiamos el estado seleccionado.
      setDeleteOpen(false);
      setBlockTypeToDelete(null);
    } catch (error) {
      // Obtenemos un mensaje claro para mostrar en la notificacion.
      const description =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message?: unknown }).message)
          : "Error desconocido.";

      // Indicamos que algo salio mal para que la persona usuaria pueda reintentar.
      notify.error({
        title: "No se pudo eliminar el tipo de bloque",
        description,
      });
    } finally {
      // Restablecemos el estado de carga sin importar el resultado.
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tipos de bloques
        </h1>
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
        <Button onClick={() => setCreateOpen(true)}>
          Nuevo tipo de bloque
        </Button>
      </div>

      <DataTable
        data={items}
        columns={blockTypeColumns(handleEdit, handleDelete)}
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

      <Dialog
        open={deleteOpen}
        onOpenChange={(value) => {
          setDeleteOpen(value);
          if (!value) {
            setBlockTypeToDelete(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle>Eliminar tipo de bloque</DialogTitle>
                <DialogDescription>
                  Esta accion eliminara el tipo de bloque, los bloques de ese
                  tipo, ambientes dentro de esos bloques y los activos de esos
                  ambientes quedaran libres. No se puede deshacer.
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={deleting}
                >
                  <X className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Cerrar</span>
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Confirma la eliminacion del registro seleccionado.</p>
            {blockTypeToDelete ? (
              <p>
                Tipo de bloque:{" "}
                <span className="font-semibold">
                  {blockTypeToDelete.nombre}
                </span>
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
