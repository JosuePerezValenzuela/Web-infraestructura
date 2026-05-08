"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  facultyColumns,
  type FacultyRow,
} from "@/features/faculties/list/columns";
import FacultyForm from "@/features/faculties/FacultyForm";
import FacultyEditForm from "@/features/faculties/edit/FacultyEditForm";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [deleting, setDeleting] = useState<boolean>(false);

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

        const normalizedItems: FacultyRow[] = data.items.map((item) => {
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
    // Guardamos la facultad que la persona desea eliminar y mostramos el dialogo de confirmacion.
    setFacultyToDelete(row);
    setOpenDelete(true);
  }

  async function confirmDelete() {
    // Si no hay una facultad seleccionada no ejecutamos ninguna accion adicional.
    if (!facultyToDelete) {
      return;
    }

    // Activamos el estado de carga para deshabilitar los controles mientras dura el proceso.
    setDeleting(true);

    try {
      // Invocamos el endpoint DELETE con el identificador de la facultad seleccionada.
      await apiFetch(`/facultades/${facultyToDelete.id}`, {
        method: "DELETE",
      });

      // Notificamos a la persona usuaria que la eliminacion se completo de forma exitosa.
      notify.success({
        title: "Facultad eliminada",
        description: "La facultad y sus dependencias se eliminaron correctamente.",
      });

      // Solicitamos nuevamente los datos para reflejar la eliminacion en la tabla principal.
      await fetchData();

      // Cerramos el dialogo y limpiamos la seleccion para evitar estados inconsistentes.
      setOpenDelete(false);
      setFacultyToDelete(null);
    } catch (error) {
      // Normalizamos el mensaje de la excepcion para mostrar un detalle amigable.
      const apiError = error as {
        message?: string;
        details?: unknown;
      };
      const description =
        Array.isArray(apiError?.details)
          ? (apiError.details as string[]).join("\n")
          : typeof apiError?.message === "string"
          ? apiError.message
          : "Error desconocido.";

      // Informamos a la persona usuaria que no se pudo completar la eliminacion.
      notify.error({
        title: "No se pudo eliminar la facultad",
        description,
      });
    } finally {
      // Restablecemos el estado de carga para reactivar los botones del dialogo.
      setDeleting(false);
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
            onChange={(event) => {
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

      <Dialog
        open={openEdit}
        onOpenChange={(value) => {
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

      <Dialog
        open={openDelete}
        onOpenChange={(value) => {
          setOpenDelete(value);
          if (!value) {
            setFacultyToDelete(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-full overflow-auto pb-2 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Desactivar facultad</DialogTitle>
            <DialogDescription>
              Esta acción desactivará el registro y sus dependientes.
            </DialogDescription>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Los bloques y ambientes quedarán desactivados junto con la facultad seleccionada.
            </p>
            {facultyToDelete ? (
              <p>
                Facultad seleccionada:{" "}
                <span className="font-semibold">{facultyToDelete.nombre}</span>
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
              onClick={() => {
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
