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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import { X, Building2 } from "lucide-react";
import { env } from "@/lib/env";

const API_BASE = env.API_BASE_URL;

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

  // Estado para el diálogo de conflicto (409: tipo de bloque con bloques dependientes)
  const [conflictBlocks, setConflictBlocks] = useState<BlockedBlock[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictTitle, setConflictTitle] = useState("");

  type BlockedBlock = {
    id: number;
    codigo: string;
    nombre: string;
    activo: boolean;
  };

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

  /** Extrae bloques bloqueantes. Soporta tanto entidades anidadas (details[].objeto) como inline */
  function extractBlockedBlocks(raw: unknown): BlockedBlock[] {
    if (!raw || typeof raw !== "object") return [];
    const details = (raw as Record<string, unknown>).details;
    if (!Array.isArray(details)) return [];

    return details
      .map((d: unknown) => {
        if (typeof d !== "object" || d === null) return null;
        const obj = d as Record<string, unknown>;

        // Intento 1: entidad anidada en una propiedad del detail
        const nested = Object.values(obj).find(
          (v): v is Record<string, unknown> =>
            typeof v === "object" && v !== null && "id" in v && "nombre" in v,
        );
        if (nested) {
          return {
            id: Number(nested.id) || 0,
            codigo: String(nested.codigo ?? ""),
            nombre: String(nested.nombre ?? ""),
            activo: nested.activo === true,
          } as BlockedBlock;
        }

        // Intento 2: el detail mismo tiene id y nombre (inline)
        if ("id" in obj && "nombre" in obj) {
          return {
            id: Number(obj.id) || 0,
            codigo: String(obj.codigo ?? ""),
            nombre: String(obj.nombre ?? ""),
            activo: obj.activo === true,
          } as BlockedBlock;
        }

        return null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }

  function handleDelete(blockType: BlockTypeRow) {
    setBlockTypeToDelete(blockType);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!blockTypeToDelete) return;

    try {
      setDeleting(true);

      await apiFetch(`/tipo_bloques/${blockTypeToDelete.id}`, {
        method: "DELETE",
      });

      notify.success({
        title: "Tipo de bloque eliminado",
        description: "El registro se elimino correctamente.",
      });

      await fetchData();
      setDeleteOpen(false);
      setBlockTypeToDelete(null);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; raw?: unknown };

      // Cerrar el diálogo de confirmación
      setDeleteOpen(false);

      if (error?.status === 409) {
        const blocks = extractBlockedBlocks(error.raw);

        if (blocks.length > 0) {
          setConflictBlocks(blocks);
          setConflictTitle(error?.message ?? "El tipo de bloque tiene bloques dependientes");
          setConflictOpen(true);
        } else {
          notify.error({
            title: "No se pudo eliminar el tipo de bloque",
            description: error?.message ?? "El tipo de bloque tiene dependencias relacionadas.",
          });
        }
      } else if (error?.status === 404) {
        notify.error({
          title: "Tipo de bloque no encontrado",
          description: "El tipo de bloque no existe o ya fue eliminado.",
        });
      } else {
        notify.error({
          title: "No se pudo eliminar el tipo de bloque",
          description: error?.message ?? "Error desconocido al eliminar el tipo de bloque.",
        });
      }
    } finally {
      setDeleting(false);
      setBlockTypeToDelete(null);
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

      {/* Diálogo de confirmación para eliminar (AlertDialog) */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(value) => {
          setDeleteOpen(value);
          if (!value) setBlockTypeToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo de bloque</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el tipo de bloque.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Confirma que deseas eliminar este registro.</p>
            {blockTypeToDelete ? (
              <p>
                Tipo de bloque:{" "}
                <span className="font-semibold">
                  {blockTypeToDelete.nombre}
                </span>
              </p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de conflicto: muestra los bloques bloqueantes */}
      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-destructive" />
              No se puede eliminar
            </AlertDialogTitle>
            <AlertDialogDescription>
              {conflictTitle}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {conflictBlocks.length > 0 && (
            <div className="max-h-[180px] overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Código</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {conflictBlocks.map((blk) => (
                    <tr key={blk.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2.5 font-mono text-xs">{blk.codigo}</td>
                      <td className="px-3 py-2.5 text-sm">{blk.nombre}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={blk.activo ? "secondary" : "outline"} className="text-xs">
                          {blk.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conflictBlocks.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Mostrando {conflictBlocks.length} bloques
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setConflictOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
