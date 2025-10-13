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
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";

const TAKE = 8;

type FacultyListResponse = {
  items: FacultyRow[];
  meta: {
    page: number;
    pages: number;
    total: number;
    take: number;
  };
};

export default function FacultyListPage() {
  const [items, setItems] = useState<FacultyRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [openCreate, setOpenCreate] = useState<boolean>(false);
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyRow | null>(null);

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

        setItems(data.items);
        setPages(data.meta.pages > 0 ? data.meta.pages : 1);
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
    console.log("Eliminar facultad", row.codigo);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Facultades</h1>

        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            placeholder="Buscar por cod, nom o campus"
            value={search}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSearch(nextValue);
              if (page !== 1) {
                setPage(1);
              }
            }}
            className="max-w-sm"
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
        onPageChange={setPage}
      />

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-h-[90vh] max-w-full overflow-auto pb-2 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Registrar nueva facultad</DialogTitle>
            <DialogDescription>
              Completa los datos necesarios para registrar la facultad.
            </DialogDescription>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </DialogHeader>

          <FacultyForm
            submitLabel="Crear facultad"
            onSubmitSuccess={async () => {
              setPage(1);
              await fetchData();
              setOpenCreate(false);
            }}
          />
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
        <DialogContent className="max-h-[90vh] max-w-full overflow-auto pb-2 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar facultad</DialogTitle>
            <DialogDescription>
              Este formulario permitira actualizar los datos de la facultad seleccionada.
            </DialogDescription>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </DialogHeader>

          {selectedFaculty ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Codigo seleccionado:{" "}
                <span className="font-semibold">{selectedFaculty.codigo}</span>
              </p>
              <p>
                Nombre actual:{" "}
                <span className="font-semibold">{selectedFaculty.nombre}</span>
              </p>
              <p>
                Este dialogo se completara cuando el flujo de edicion este disponible.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
