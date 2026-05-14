"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { campusColumns, type CampusRow } from "@/features/campus/list/columns";
import { Plus, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import CampusForm from "@/features/campus/CampusForm";
import CampusEditForm from "@/features/campus/edit/CampusEditForm";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import { env } from "@/lib/env";

const API_BASE = env.API_BASE_URL;

const TAKE = 8;

/** Error tipado devuelto por apiFetch */
type ApiError = {
  status: number;
  message: string;
  details?: string[];
  raw?: { message?: string; details?: Array<{ field: string; message: string; faculty: BlockingFaculty }> };
};

/** Forma de una facultad bloqueante devuelta por el backend en errores 409 */
type BlockingFaculty = {
  id: number;
  codigo: string;
  nombre: string;
  nombre_corto: string | null;
  activo: boolean;
};

export default function CampusListPage() {
  const [items, setItems] = useState<CampusRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [campusToEdit, setCampusToEdit] = useState<CampusRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [campusToDelete, setCampusToDelete] = useState<CampusRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Estado para el diálogo de conflicto (409: campus con facultades relacionadas)
  const [conflictFaculties, setConflictFaculties] = useState<BlockingFaculty[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);

  const query = useMemo(() => search.trim(), [search]);

  async function fetchData(signal?: AbortSignal) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(TAKE),
        ...(query ? { search: query } : {}),
      });

      const res = await fetch(`${API_BASE}/campus?${params.toString()}`, {
        signal,
      });

      if (!res.ok) {
        console.error("Error cargando campus");
        return;
      }

      const data = (await res.json()) as {
        items: CampusRow[];
        meta: {
          page: number;
          take?: number;
          pages?: number;
          total?: number;
          hasNextPage?: boolean;
          hasPreviousPage?: boolean;
        };
      };

      setItems(data.items);
      setPage(typeof data.meta?.page === "number" ? data.meta.page : page);
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
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [page, query]);

  function handleEdit(row: CampusRow) {
    setCampusToEdit(row);
    setEditOpen(true);
  }

  function handleDelete(row: CampusRow) {
    setCampusToDelete(row);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!campusToDelete) return;

    try {
      setDeleting(true);

      await apiFetch(`/campus/${campusToDelete.id}`, {
        method: "DELETE",
      });

      // Éxito: 204 No Content
      notify.success({
        title: "Campus eliminado",
        description: "El registro se eliminó correctamente.",
      });

      await fetchData();
      setDeleteOpen(false);
      setCampusToDelete(null);
    } catch (err: unknown) {
      // Cerrar el diálogo de confirmación
      setDeleteOpen(false);

      const error = err as ApiError;
      const status = error?.status;

      if (status === 409) {
        // Conflicto: el campus tiene facultades relacionadas
        const faculties: BlockingFaculty[] =
          error?.raw?.details
            ?.filter((d): d is { field: string; message: string; faculty: BlockingFaculty } => "faculty" in d)
            .map((d) => d.faculty) ?? [];

        if (faculties.length > 0) {
          setConflictFaculties(faculties);
          setConflictOpen(true);
        } else {
          notify.error({
            title: "No se pudo eliminar el campus",
            description:
              error?.message ??
              "El campus tiene dependencias relacionadas.",
          });
        }
      } else if (status === 404) {
        // No encontrado
        notify.error({
          title: "Campus no encontrado",
          description: "El campus no existe o ya fue eliminado.",
        });
      } else {
        // Otro error
        const description =
          error?.message ?? "Error desconocido al eliminar el campus.";

        notify.error({
          title: "No se pudo eliminar el campus",
          description,
        });
      }
    } finally {
      setDeleting(false);
      setCampusToDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Campus</h1>

        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar por codigo, nombre o direccion"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-[270px]"
          />

          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo campus
          </Button>
        </div>
      </div>

      <DataTable
        columns={campusColumns(handleEdit, handleDelete)}
        data={items}
        page={page}
        pages={pages}
        onPageChange={setPage}
      />

      {/* Modal para crear un campus */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] max-w-full overflow-auto pb-2">
          <DialogHeader>
            <DialogTitle>Crear nuevo campus</DialogTitle>
            <DialogClose
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background 
                   transition-opacity hover:opacity-100 focus:outline-none 
                   focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </DialogHeader>

          <CampusForm
            submitLabel="Crear campus"
            onSubmitSuccess={async () => {
              await fetchData();
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para editar un campus */}
      <Dialog
        open={editOpen}
        onOpenChange={(value) => {
          setEditOpen(value);
          if (!value) setCampusToEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] max-w-full overflow-auto pb-2">
          <DialogHeader>
            <DialogTitle>Editar campus</DialogTitle>
            <DialogClose
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background 
                   transition-opacity hover:opacity-100 focus:outline-none 
                   focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </DialogHeader>

          {campusToEdit && (
            <CampusEditForm
              campus={campusToEdit}
              onSubmitSuccess={async () => {
                await fetchData();
                setEditOpen(false);
                setCampusToEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar (AlertDialog) */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar campus</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara permanentemente el campus. Esta accion no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Confirma que deseas eliminar este registro.</p>
            {campusToDelete ? (
              <p>
                Campus seleccionado:{" "}
                <span className="font-semibold">{campusToDelete.nombre}</span>
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

      {/* Diálogo de conflicto: muestra las facultades bloqueantes en tabla */}
      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-destructive" />
              No se puede eliminar
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este campus tiene las siguientes facultades relacionadas.
              Eliminalas antes de eliminar el campus.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Tabla de facultades bloqueantes */}
          <div className="max-h-[180px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {conflictFaculties.map((fac) => (
                  <tr key={fac.id} className="hover:bg-muted/50">
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {fac.codigo}
                    </td>
                    <td className="px-3 py-2.5 text-sm">{fac.nombre}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={fac.activo ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {fac.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {conflictFaculties.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Mostrando {conflictFaculties.length} facultades
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setConflictOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
