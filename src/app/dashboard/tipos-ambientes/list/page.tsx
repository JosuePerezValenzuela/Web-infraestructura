"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import {
  environmentTypeColumns,
  type EnvironmentTypeRow,
} from "@/features/environment-types/list/columns";
import EnvironmentTypeForm from "@/features/environment-types/EnvironmentTypeForm";
import EnvironmentTypeEditForm from "@/features/environment-types/edit/EnvironmentTypeEditForm";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import { env } from "@/lib/env";

export const API_BASE = env.API_BASE_URL;

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
    if (!environmentTypeToDelete) {
      return;
    }

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
    } catch (error) {
      const description =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message?: unknown }).message)
          : "Error desconocido.";

      notify.error({
        title: "No se pudo eliminar el tipo de ambiente",
        description,
      });
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

      <Dialog
        open={deleteOpen}
        onOpenChange={(value) => {
          setDeleteOpen(value);
          if (!value) {
            setEnvironmentTypeToDelete(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle>Eliminar tipo de ambiente</DialogTitle>
                <DialogDescription>
                  Esta accion eliminara el tipo de ambiente seleccionado y los
                  ambientes de dicho tipo y dejara libres los activos asociados
                  a esos ambientes. No se puede deshacer.
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
            <p>
              Confirma el nombre antes de continuar. Los ambientes dependientes
              se eliminaran en cadena.
            </p>
            {environmentTypeToDelete ? (
              <p>
                Tipo de ambiente:{" "}
                <span className="font-semibold">
                  {environmentTypeToDelete.nombre}
                </span>
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={deleting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
