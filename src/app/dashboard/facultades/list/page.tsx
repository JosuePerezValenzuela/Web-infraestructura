"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import {
  facultyColumns,
  type FacultyRow,
} from "@/features/faculties/list/columns";
import FacultyForm from "@/features/faculties/FacultyForm";
import FacultyEditForm from "@/features/faculties/edit/FacultyEditForm";
import { Plus, X, Building2 } from "lucide-react";
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
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";

const TAKE = 7;

type FacultyCampus = {
  id: number;
  nombre: string;
};

type FacultyApiItem = {
  id: number;
  codigo: string;
  nombre: string;
  nombre_corto: string | null;
  campus_ids?: number[];
  campuses?: FacultyCampus[];
  activo: boolean;
  lat: number | null;
  lng: number | null;
  creado_en: string;
};

type FacultyListResponse = {
  items: FacultyApiItem[];
  meta: {
    page: number;
    pages?: number;
    total?: number;
    take?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

/** Error tipado devuelto por apiFetch */
type ApiError = {
  status: number;
  message: string;
  details?: unknown;
  raw?: { message?: string; details?: Array<Record<string, unknown>> };
};

/** Entidad bloqueante genérica (extraída dinámicamente del detail del error 409) */
type BlockedEntity = {
  id: number;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
};

export default function FacultyListPage() {
  const [items, setItems] = useState<FacultyRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [openCreate, setOpenCreate] = useState<boolean>(false);
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyRow | null>(null);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [facultyToDelete, setFacultyToDelete] = useState<FacultyRow | null>(null);
  const [deleteCampusId, setDeleteCampusId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Estado para el diálogo de conflicto (409: facultad con entidades relacionadas)
  const [blockedEntities, setBlockedEntities] = useState<BlockedEntity[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictTitle, setConflictTitle] = useState("");

  const query = useMemo(() => search.trim(), [search]);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(TAKE),
        ...(query ? { search: query } : {}),
      });

      try {
        const data = await apiFetch<FacultyListResponse>(
          `/facultades?${params.toString()}`,
          { signal }
        );

        const normalizedItems: FacultyRow[] = data.items.map((item: FacultyApiItem) => {
          const campuses = Array.isArray(item.campuses) ? item.campuses : [];
          const campusIds = Array.isArray(item.campus_ids) ? item.campus_ids : [];
          const primaryCampus = campuses[0];

          return {
            id: item.id,
            codigo: item.codigo,
            nombre: item.nombre,
            nombre_corto: item.nombre_corto,
            campus_ids: campusIds,
            campuses,
            campus_nombre: primaryCampus?.nombre ?? "-",
            activo: item.activo,
            creado_en: item.creado_en,
            campus_id: primaryCampus?.id ?? campusIds[0] ?? 0,
            lat: typeof item.lat === "number" ? item.lat : null,
            lng: typeof item.lng === "number" ? item.lng : null,
          };
        });

        setItems(normalizedItems);
        setTotal(typeof data.meta?.total === "number" ? data.meta.total : 0);
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
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Error al cargar facultades", error);
      }
    },
    [page, query]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  function handleEdit(row: FacultyRow) {
    setSelectedFaculty(row);
    setOpenEdit(true);
  }

  function handleDelete(row: FacultyRow) {
    setFacultyToDelete(row);
    setDeleteCampusId(Array.isArray(row.campuses) && row.campuses.length > 0 ? row.campuses[0].id : null);
    setOpenDelete(true);
  }

  /**
   * Extrae entidades bloqueantes del detalle de un error 409.
   * Busca la primer propiedad que contenga un objeto con { id, nombre }
   * dentro de cada elemento del array details[].
   */
  function extractBlockedEntities(raw: unknown): BlockedEntity[] {
    if (!raw || typeof raw !== "object") return [];
    const details = (raw as Record<string, unknown>).details;
    if (!Array.isArray(details)) return [];

    return details
      .map((d: unknown) => {
        if (typeof d !== "object" || d === null) return null;
        const obj = d as Record<string, unknown>;
        // Buscar la primer propiedad que sea un objeto con id y nombre
        const entity = Object.values(obj).find(
          (v): v is Record<string, unknown> =>
            typeof v === "object" &&
            v !== null &&
            "id" in v &&
            "nombre" in v,
        );
        if (!entity) return null;
        return {
          id: Number(entity.id) || 0,
          codigo: String(entity.codigo ?? ""),
          nombre: String(entity.nombre ?? ""),
          activo: entity.activo === true,
        } as BlockedEntity;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }

  async function confirmDelete() {
    if (!facultyToDelete || deleteCampusId === null) return;

    setDeleting(true);

    try {
      // DELETE /api/facultades/:id/campus/:campusId
      // Elimina la relación específica entre facultad y campus.
      // Si la facultad queda sin relaciones, también se elimina físicamente.
      await apiFetch(`/facultades/${facultyToDelete.id}/campus/${deleteCampusId}`, {
        method: "DELETE",
      });

      notify.success({
        title: "Facultad eliminada",
        description: "El registro se eliminó correctamente.",
      });

      await fetchData();
      setOpenDelete(false);
      setFacultyToDelete(null);
      setDeleteCampusId(null);
    } catch (err: unknown) {
      const error = err as ApiError;

      // Cerrar el diálogo de confirmación
      setOpenDelete(false);

      if (error?.status === 409) {
        // Conflicto: la relación tiene bloques dependientes
        const entities = extractBlockedEntities(error.raw);

        if (entities.length > 0) {
          setBlockedEntities(entities);
          setConflictTitle(error?.message ?? "Hay bloques que dependen de esta relación");
          setConflictOpen(true);
        } else {
          notify.error({
            title: "No se pudo eliminar la facultad",
            description:
              error?.message ?? "Hay dependencias relacionadas.",
          });
        }
      } else if (error?.status === 404) {
        notify.error({
          title: "No encontrado",
          description: error?.message ?? "La facultad o el campus no existe.",
        });
      } else if (error?.status === 400) {
        notify.error({
          title: "Relación no existe",
          description: error?.message ?? "La facultad no está vinculada a este campus.",
        });
      } else {
        const description =
          error?.message ?? "Error desconocido al eliminar la facultad.";
        notify.error({
          title: "No se pudo eliminar la facultad",
          description,
        });
      }
    } finally {
      setDeleting(false);
      setFacultyToDelete(null);
      setDeleteCampusId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Facultades</h1>

        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            placeholder="Buscar por codigo, nombre o campus"
            value={search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const nextValue = event.target.value;
              setSearch(nextValue);
              if (page !== 1) {
                setPage(1);
              }
            }}
            className="flex-1 min-w-[270px]"
          />

          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva facultad
          </Button>
        </div>
      </div>

      <DataTable
        columns={facultyColumns(handleEdit, handleDelete)}
        data={items}
        page={page}
        pages={pages}
        total={total}
        take={TAKE}
        initialSorting={[{ id: "activo", desc: false }]}
        onPageChange={setPage}
      />

      {/* Modal para crear */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-h-[90vh] max-w-full overflow-hidden p-0 sm:max-w-4xl" showCloseButton={false}>
          <div className="flex max-h-[90vh] flex-col">
            <div className="flex items-center justify-between border-b px-6 py-3">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle>Registrar nueva facultad</DialogTitle>
              </DialogHeader>
              <DialogClose className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </DialogClose>
            </div>

            <FacultyForm
              submitLabel="Crear facultad"
              onCancel={() => setOpenCreate(false)}
              onSubmitSuccess={async () => {
                setPage(1);
                await fetchData();
                setOpenCreate(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para editar */}
      <Dialog
        open={openEdit}
        onOpenChange={(value: boolean) => {
          setOpenEdit(value);
          if (!value) {
            setSelectedFaculty(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-full overflow-hidden p-0 sm:max-w-4xl" showCloseButton={false}>
          <div className="flex max-h-[90vh] flex-col">
            <div className="flex items-center justify-between border-b px-6 py-3">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle>Editar facultad</DialogTitle>
              </DialogHeader>
              <DialogClose className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </DialogClose>
            </div>

            {selectedFaculty ? (
              <FacultyEditForm
                faculty={selectedFaculty}
                onCancel={() => {
                  setOpenEdit(false);
                  setSelectedFaculty(null);
                }}
                onSubmitSuccess={async () => {
                  await fetchData();
                  setOpenEdit(false);
                  setSelectedFaculty(null);
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar (AlertDialog) */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar facultad</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la relación entre la facultad y el campus
              seleccionado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {facultyToDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Facultad: <span className="font-semibold text-foreground">{facultyToDelete.nombre}</span>
              </p>

              {Array.isArray(facultyToDelete.campuses) && facultyToDelete.campuses.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Selecciona el campus a desvincular:</p>
                  <div className="space-y-1">
                    {facultyToDelete.campuses.map((campus: FacultyCampus) => (
                      <label
                        key={campus.id}
                        className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                          deleteCampusId === campus.id
                            ? "bg-destructive/5 text-foreground"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="deleteCampus"
                          value={campus.id}
                          checked={deleteCampusId === campus.id}
                          onChange={() => setDeleteCampusId(campus.id)}
                          className="accent-destructive"
                        />
                        {campus.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Esta facultad no tiene campuses asociados.</p>
              )}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void confirmDelete(); }}
              disabled={deleting || deleteCampusId === null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de conflicto: muestra las entidades bloqueantes */}
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

          {blockedEntities.length > 0 && (
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
                  {blockedEntities.map((ent) => (
                    <tr key={ent.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {ent.codigo}
                      </td>
                      <td className="px-3 py-2.5 text-sm">{ent.nombre}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={ent.activo ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {ent.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {blockedEntities.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Mostrando {blockedEntities.length} registros
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
