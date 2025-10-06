"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { campusColumns, type CampusRow } from "@/features/campus/list/columns";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import CampusForm from "@/features/campus/CampusForm";
import CampusEditForm from "@/features/campus/edit/CampusEditForm";
import { X } from "lucide-react";

const TAKE = 8;

export default function CampusListPage() {
  const [items, setItems] = useState<CampusRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [campusToEdit, setCampusToEdit] = useState<CampusRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const query = useMemo(() => search.trim(), [search]);

  async function fetchData(signal?: AbortSignal) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(TAKE),
        ...(query ? { search: query } : {}),
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/campus?${params.toString()}`,
        { signal }
      );

      if (!res.ok) {
        console.error("Error cargando campus");
        return;
      }

      const data = (await res.json()) as {
        items: CampusRow[];
        meta: { page: number; take: number; pages: number; total: number };
      };

      setItems(data.items);
      setPage(data.meta.page);
      setPages(data.meta.pages);
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

  async function handleDelete(row: CampusRow) {
    console.log("Eliminando", row.codigo);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Campus</h1>

        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar por cod, nom o dir"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
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

      {/* Modal para crear un campus*/}
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
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
    </div>
  );
}
