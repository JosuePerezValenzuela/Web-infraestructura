"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Building2 } from "lucide-react";
import {
  environmentTypeColumns,
  type EnvironmentTypeRow,
} from "@/features/environment-types/list/columns";
import EnvironmentTypeForm from "@/features/environment-types/EnvironmentTypeForm";
import EnvironmentTypeEditForm from "@/features/environment-types/edit/EnvironmentTypeEditForm";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import { env } from "@/lib/env";

const API_BASE = env.API_BASE_URL;

// Definimos la cantidad de filas que solicitaremos por pagina para mantener una altura consistente.
const TAKE = 5;

export default function EnvironmentTypeListPage() {
  // Guardamos las filas recibidas desde la API para mostrarlas en la tabla.
  const [items, setItems] = useState<EnvironmentTypeRow[]>([]);
  // Conservamos la pagina actual que se esta mostrando.
  const [page, setPage] = useState(1);
  // Almacenamos la cantidad total de paginas para habilitar o deshabilitar la paginacion.
  const [pages, setPages] = useState(1);
  // Mantenemos el termino de busqueda escrito por la persona usuaria.
  const [search, setSearch] = useState("");
  // Controlamos la apertura del modal dedicado a crear tipos de ambientes.
  const [createOpen, setCreateOpen] = useState(false);
  // Guardamos el tipo seleccionado para edicion.
  const [environmentTypeToEdit, setEnvironmentTypeToEdit] =
    useState<EnvironmentTypeRow | null>(null);
  // Controlamos el modal de edicion.
  const [editOpen, setEditOpen] = useState(false);
  // Guardamos el tipo seleccionado para eliminacion.
  const [environmentTypeToDelete, setEnvironmentTypeToDelete] =
    useState<EnvironmentTypeRow | null>(null);
  // Controlamos el modal de eliminacion.
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Indicamos cuando la peticion DELETE esta en progreso.
  const [deleting, setDeleting] = useState(false);

  // Estado para el diálogo de conflicto (409: tipo de ambiente con ambientes dependientes)
  const [conflictAmbientes, setConflictAmbientes] = useState<BlockedAmbiente[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictTitle, setConflictTitle] = useState("");

  type BlockedAmbiente = {
    id: number;
    codigo: string;
    nombre: string;
    activo: boolean;
  };

  // Normalizamos el termino de busqueda quitando espacios extra para evitar consultas innecesarias.
  const query = useMemo(() => search.trim(), [search]);

  // Cada vez que cambia el termino de busqueda regresamos a la primera pagina.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Encapsulamos la llamada al backend para poder reutilizarla despues de paginar o crear registros nuevos.
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
        `${API_BASE}/tipo_ambientes?${params.toString()}`,
        { signal }
      );

      // Si el backend responde con error simplemente abandonamos el flujo.
      if (!res.ok) {
        return;
      }

      // Interpretamos el cuerpo como JSON siguiendo el contrato documentado.
      const data = (await res.json()) as {
        items: EnvironmentTypeRow[];
        meta: {
          page: number;
          pages?: number;
          total?: number;
          take?: number;
          hasNextPage?: boolean;
          hasPreviousPage?: boolean;
        };
      };

      // Actualizamos la tabla con las filas recibidas.
      setItems(data.items);
      // Sincronizamos la pagina actual con la confirmada por el backend.
      setPage(data.meta.page);
      // Guardamos la cantidad de paginas para el componente de paginacion.
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
      // Si abortamos la solicitud manualmente ignoramos el error lanzado por fetch.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  async function handleCreateSuccess() {
    // Reutilizamos la llamada al backend para refrescar el listado tras una creacion exitosa.
    await fetchData();
  }

  function handleEdit(environmentType: EnvironmentTypeRow) {
    setEnvironmentTypeToEdit(environmentType);
    setEditOpen(true);
  }

  function handleCloseEditDialog() {
    setEditOpen(false);
    setEnvironmentTypeToEdit(null);
  }

  async function handleEditSuccess() {
    await fetchData();
    handleCloseEditDialog();
  }

  /** Extrae ambientes bloqueantes. Soporta entidades inline e anidadas */
  function extractBlockedAmbientes(raw: unknown): BlockedAmbiente[] {
    if (!raw || typeof raw !== "object") return [];
    const details = (raw as Record<string, unknown>).details;
    if (!Array.isArray(details)) return [];

    return details
      .map((d: unknown) => {
        if (typeof d !== "object" || d === null) return null;
        const obj = d as Record<string, unknown>;

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
          } as BlockedAmbiente;
        }

        if ("id" in obj && "nombre" in obj) {
          return {
            id: Number(obj.id) || 0,
            codigo: String(obj.codigo ?? ""),
            nombre: String(obj.nombre ?? ""),
            activo: obj.activo === true,
          } as BlockedAmbiente;
        }

        return null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }

  function handleDelete(environmentType: EnvironmentTypeRow) {
    setEnvironmentTypeToDelete(environmentType);
    setDeleteOpen(true);
  }

  function resetDeleteState() {
    setEnvironmentTypeToDelete(null);
    setDeleteOpen(false);
    setDeleting(false);
  }

  async function confirmDelete() {
    if (!environmentTypeToDelete) return;

    try {
      setDeleting(true);
      await apiFetch(`/tipo_ambientes/${environmentTypeToDelete.id}`, {
        method: "DELETE",
      });
      notify.success({
        title: "Tipo de ambiente eliminado",
        description: "El registro se elimino correctamente.",
      });
      await fetchData();
      resetDeleteState();
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; raw?: unknown };

      resetDeleteState();

      if (error?.status === 409) {
        const ambientes = extractBlockedAmbientes(error.raw);

        if (ambientes.length > 0) {
          setConflictAmbientes(ambientes);
          setConflictTitle(error?.message ?? "El tipo de ambiente tiene ambientes dependientes");
          setConflictOpen(true);
        } else {
          notify.error({
            title: "No se pudo eliminar el tipo de ambiente",
            description: error?.message ?? "El tipo de ambiente tiene dependencias relacionadas.",
          });
        }
      } else if (error?.status === 404) {
        notify.error({
          title: "Tipo de ambiente no encontrado",
          description: "El tipo de ambiente no existe o ya fue eliminado.",
        });
      } else {
        notify.error({
          title: "No se pudo eliminar el tipo de ambiente",
          description: error?.message ?? "Error desconocido al eliminar el tipo de ambiente.",
        });
      }
    } finally {
      setDeleting(false);
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
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar tipos de ambientes"
          />
        </div>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          Nuevo tipo de ambientes
        </Button>
      </div>

      <DataTable
        data={items}
        columns={environmentTypeColumns(handleEdit, handleDelete)}
        page={page}
        pages={pages}
        onPageChange={(nextPage) => setPage(nextPage)}
        showViewOptions
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle>Crear tipo de ambiente</DialogTitle>
                <DialogDescription>
                  Completa los datos para agregar un nuevo clasificador al
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

          <EnvironmentTypeForm
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
            setEnvironmentTypeToEdit(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle>Editar tipo de ambiente</DialogTitle>
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

          {environmentTypeToEdit ? (
            <EnvironmentTypeEditForm
              environmentType={environmentTypeToEdit}
              onSubmitSuccess={handleEditSuccess}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar (AlertDialog) */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(value) => {
          setDeleteOpen(value);
          if (!value) setEnvironmentTypeToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo de ambiente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el tipo de ambiente.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Confirma que deseas eliminar este registro.</p>
            {environmentTypeToDelete ? (
              <p>
                Tipo de ambiente:{" "}
                <span className="font-semibold">
                  {environmentTypeToDelete.nombre}
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

      {/* Diálogo de conflicto: muestra los ambientes bloqueantes */}
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

          {conflictAmbientes.length > 0 && (
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
                  {conflictAmbientes.map((amb) => (
                    <tr key={amb.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2.5 font-mono text-xs">{amb.codigo}</td>
                      <td className="px-3 py-2.5 text-sm">{amb.nombre}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={amb.activo ? "secondary" : "outline"} className="text-xs">
                          {amb.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conflictAmbientes.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Mostrando {conflictAmbientes.length} ambientes
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
