"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";
import { assetColumns, type AssetRow } from "@/features/assets/list/columns";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AssetDetailDialog } from "@/features/assets/list/AssetDetailDialog";
import { fetchGoodsByNia, type GoodsApiItem } from "@/lib/goods-api";

const TAKE = 8;
const DEBOUNCE_MS = process.env.NODE_ENV === "test" ? 0 : 400;

type AssetListResponse = {
  items: AssetRow[];
  meta: {
    total?: number;
    page: number;
    take?: number;
    pages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

export default function AssetListPage() {
  // Guardamos las filas de activos que mostraremos en la tabla.
  const [items, setItems] = useState<AssetRow[]>([]);
  // Llevamos el control de la página actual.
  const [page, setPage] = useState(1);
  // Guardamos cuántas páginas hay disponibles según la API.
  const [pages, setPages] = useState(1);
  // Texto de búsqueda libre (NIA, nombre o descripción).
  const [search, setSearch] = useState("");
  // Valor de búsqueda aplicado con debounce.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Indicador de carga de la tabla.
  const [loadingTable, setLoadingTable] = useState(false);
  // Controla la apertura del modal de detalle.
  const [detailOpen, setDetailOpen] = useState(false);
  // Almacena el detalle del activo traído desde el API externo.
  const [detail, setDetail] = useState<GoodsApiItem | null>(null);

  // Armamos la query string con los filtros y paginación vigentes.
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(TAKE));
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    }
    return params.toString();
  }, [page, debouncedSearch]);

  // Aplica debounce a la búsqueda cuando la persona deja de escribir.
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [search]);

  // Cargamos los activos cada vez que cambia la query calculada.
  useEffect(() => {
    const controller = new AbortController();
    async function loadAssets() {
      try {
        setLoadingTable(true);
        const data = await apiFetch<AssetListResponse>(`/activos?${queryString}`, {
          signal: controller.signal,
        });
        setItems(data.items ?? []);
        const total = typeof data.meta?.total === "number" ? data.meta.total : null;
        const take =
          typeof data.meta?.take === "number" && data.meta.take > 0
            ? data.meta.take
            : TAKE;
        const pagesFromMeta =
          typeof data.meta?.pages === "number" && data.meta.pages > 0
            ? data.meta.pages
            : null;
        const pagesFromTotal =
          total !== null ? Math.max(1, Math.ceil(total / take)) : null;
        const resolved = pagesFromMeta ?? pagesFromTotal ?? 1;
        setPages(data.meta?.hasNextPage && page >= resolved ? page + 1 : resolved);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        notify.error({
          title: "No pudimos cargar los activos",
          description: "Revisa la conexión o intenta de nuevo.",
        });
      } finally {
        setLoadingTable(false);
      }
    }
    void loadAssets();
    return () => controller.abort();
  }, [queryString, page]);

  // Consulta el detalle del activo en el API externo y abre el modal.
  async function handleViewDetail(row: AssetRow) {
    try {
      setDetail(null);
      const data = await fetchGoodsByNia(row.nia, {});
      setDetail(Array.isArray(data) && data.length ? data[0] : null);
      setDetailOpen(true);
    } catch (error) {
      notify.error({
        title: "No pudimos obtener el detalle",
        description: "Revisa la configuración del servicio de bienes.",
      });
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Activos</h1>
        <p className="text-sm text-muted-foreground">
          Consulta y filtra los activos registrados en el inventario.
        </p>
      </header>

      <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="asset-search">Buscar</Label>
          <Input
            id="asset-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Busca por NIA, nombre o descripción"
            aria-label="Buscar activos"
          />
        </div>
      </div>

      <DataTable
        columns={assetColumns(handleViewDetail)}
        data={items}
        page={page}
        pages={pages}
        onPageChange={setPage}
        showViewOptions={false}
        emptyState={{
          title: loadingTable ? "Cargando activos..." : "No encontramos activos",
          description: loadingTable
            ? "Traendo la información desde el servidor."
            : "Ajusta los filtros o prueba con otra búsqueda.",
        }}
      />

      <AssetDetailDialog
        open={detailOpen}
        asset={detail}
        onClose={() => setDetailOpen(false)}
      />
    </section>
  );
}
