"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button"; // Botones reutilizables con los estilos del sistema.
import { Input } from "@/components/ui/input"; // Campo de texto accesible y consistente.
import { Label } from "@/components/ui/label"; // Etiquetas accesibles para todos los controles.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table"; // Tabla reutilizable con ordenamiento y visibilidad de columnas.
import { DataTableViewOptions } from "@/components/data-table-view-options";
import {
  blockColumns,
  type BlockRow,
} from "@/features/blocks/list/columns"; // Columnas específicas de la entidad Bloques.
import BlockEditForm from "@/features/blocks/edit/BlockEditForm";
import { BlockCreateForm } from "@/features/blocks/BlockCreateForm";
import { apiFetch } from "@/lib/api"; // Cliente centralizado para hablar con el backend.
import { notify } from "@/lib/notify"; // Notificaciones amigables para informar el estado de las operaciones.
import type { Table as ReactTableInstance } from "@tanstack/react-table";

// Describimos el shape de la respuesta paginada del backend para el listado de bloques.
type BlockListResponse = {
  items: BlockRow[]; // Tipamos cada elemento con la estructura BlockRow.
  meta: {
    total?: number; // Total de registros en la base de datos.
    page: number; // Página actual retornada.
    pages?: number; // Total de páginas disponibles.
    take?: number; // Cantidad de elementos por página.
    hasNextPage?: boolean; // Indicador de paginación hacia adelante.
    hasPreviousPage?: boolean; // Indicador de paginación hacia atrás.
  };
};

// Cada opción de catálogo (facultades y tipos de bloque) comparte la misma forma.
type CatalogOption = {
  id: number; // Identificador del elemento en el backend.
  nombre: string; // Etiqueta ya normalizada para el select.
  lat?: number;
  lng?: number;
};

type CatalogApiItem = {
  id: number;
  nombre?: string | null;
  nombre_corto?: string | null;
  nombreCorto?: string | null;
  descripcion?: string | null;
  codigo?: string | null;
  lat?: unknown;
  lng?: unknown;
  latitud?: unknown;
  longitud?: unknown;
  coordenadas?: unknown;
  coordinates?: unknown;
};

// Resultado estándar que entrega el backend cuando se consultan catálogos simples.
type CatalogResponse = {
  items: CatalogApiItem[]; // Lista de opciones disponibles.
};

// Estado local que guardará los filtros aplicados a la grilla.
type FilterState = {
  facultadId: string; // Identificador de la facultad seleccionada o cadena vacía.
  tipoBloqueId: string; // Identificador del tipo de bloque seleccionado o cadena vacía.
  activo: string; // "true", "false" o cadena vacía para todos.
  pisosMin: string; // Límite inferior para el rango de pisos.
  pisosMax: string; // Límite superior para el rango de pisos.
};

const TAKE = 8; // Cantidad de registros por página según la historia de usuario.
const INITIAL_FILTERS: FilterState = {
  facultadId: "",
  tipoBloqueId: "",
  activo: "",
  pisosMin: "",
  pisosMax: "",
}; // Estado base que nos permite restaurar los filtros rápidamente.
const ALL_VALUE = "all"; // Valor centinela requerido por Radix Select para representar la opcion de "todos".

function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function parsePointString(value: string): { lat?: number; lng?: number } {
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return {};
  }
  const numbers = matches
    .map((item) => Number(item))
    .filter((num) => Number.isFinite(num));
  if (numbers.length < 2) {
    return {};
  }
  if (value.trim().toUpperCase().startsWith("POINT")) {
    return { lng: numbers[0], lat: numbers[1] };
  }
  return { lat: numbers[0], lng: numbers[1] };
}

function resolveCatalogCoordinates(item: CatalogApiItem): {
  lat?: number;
  lng?: number;
} {
  const record = item as Record<string, unknown>;

  const latDirect =
    toNumberOrUndefined(item.lat) ??
    toNumberOrUndefined(item.latitud) ??
    toNumberOrUndefined(record.y);
  const lngDirect =
    toNumberOrUndefined(item.lng) ??
    toNumberOrUndefined(item.longitud) ??
    toNumberOrUndefined(record.x);

  if (typeof latDirect === "number" && typeof lngDirect === "number") {
    return { lat: latDirect, lng: lngDirect };
  }

  const pointCandidate =
    (record.coordenadas as unknown) ??
    (record.coordinates as unknown) ??
    (record.coordenadas_text as unknown);
  if (typeof pointCandidate === "string") {
    const parsed = parsePointString(pointCandidate);
    return {
      lat: toNumberOrUndefined(parsed.lat),
      lng: toNumberOrUndefined(parsed.lng),
    };
  }
  if (Array.isArray(pointCandidate) && pointCandidate.length >= 2) {
    const [lng, lat] = pointCandidate;
    return {
      lat: toNumberOrUndefined(lat),
      lng: toNumberOrUndefined(lng),
    };
  }
  if (pointCandidate && typeof pointCandidate === "object") {
    const coords = pointCandidate as Record<string, unknown>;
    return {
      lat:
        toNumberOrUndefined(coords.lat) ??
        toNumberOrUndefined(coords.latitude) ??
        toNumberOrUndefined(coords.latitud) ??
        toNumberOrUndefined(coords.y),
      lng:
        toNumberOrUndefined(coords.lng) ??
        toNumberOrUndefined(coords.lon) ??
        toNumberOrUndefined(coords.longitude) ??
        toNumberOrUndefined(coords.longitud) ??
        toNumberOrUndefined(coords.x),
    };
  }

  return { lat: latDirect, lng: lngDirect };
}

function normalizeCatalogOptions(
  items: CatalogApiItem[],
  fallbackPrefix: string
): CatalogOption[] {
  return items
    .map((item) => {
      if (typeof item.id !== "number") {
        return null;
      }
      const label =
        item.nombre ??
        item.nombre_corto ??
        item.nombreCorto ??
        item.descripcion ??
        item.codigo;

      const finalLabel =
        typeof label === "string" && label.trim().length
          ? label.trim()
          : `${fallbackPrefix} ${item.id}`;

      const coordinates = resolveCatalogCoordinates(item);

      return {
        id: item.id,
        nombre: finalLabel,
        ...(typeof coordinates.lat === "number" &&
        typeof coordinates.lng === "number"
          ? { lat: coordinates.lat, lng: coordinates.lng }
          : {}),
      };
    })
    .filter((option): option is CatalogOption => Boolean(option));
}

function BlockListPageContent() {
  const router = useRouter();
    const searchParams = useSearchParams();
  
  function isAbortError(error: unknown): boolean {
    if (!error) return false;
    if (error instanceof DOMException) {
      return error.name === "AbortError";
    }
    if (error instanceof Error) {
      return error.name === "AbortError";
    }
    return false;
  }
  
  
  const [items, setItems] = useState<BlockRow[]>([]); // Contendrá las filas visibles en la tabla.
  const [page, setPage] = useState(1); // Página actual que estamos mostrando.
  const [pages, setPages] = useState(1); // Cantidad total de páginas disponibles.
  const [search, setSearch] = useState(""); // Texto que la persona escribe en el campo de búsqueda.
  
  const [filters, setFilters] = useState<FilterState>(() => {
    const facultadId = searchParams.get("facultadId") || "";
    const tipoBloqueId = searchParams.get("tipoBloqueId") || "";
    const activo = searchParams.get("activo") || "";
    const pisosMin = searchParams.get("pisosMin") || "";
    const pisosMax = searchParams.get("pisosMax") || "";
    return { facultadId, tipoBloqueId, activo, pisosMin, pisosMax };
  });
  
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(filters);
  
  // Sync filters to URL and applied state
  const syncFiltersToUrl = useCallback((currentFilters: FilterState, currentSearch: string) => {
    setAppliedFilters(currentFilters);
    setPage(1);
    
    const params = new URLSearchParams();
    const normalizedSearch = currentSearch.trim();
    if (normalizedSearch) params.set("search", normalizedSearch);
    if (currentFilters.facultadId) params.set("facultadId", currentFilters.facultadId);
    if (currentFilters.tipoBloqueId) params.set("tipoBloqueId", currentFilters.tipoBloqueId);
    if (currentFilters.activo) params.set("activo", currentFilters.activo);
    if (currentFilters.pisosMin) params.set("pisosMin", currentFilters.pisosMin);
    if (currentFilters.pisosMax) params.set("pisosMax", currentFilters.pisosMax);
    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : "/dashboard/bloques/list");
  }, [router]);

  // Initialize appliedFilters from URL params
  useEffect(() => {
    setAppliedFilters(filters);
  }, [filters]);

  // Debounce for search
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      syncFiltersToUrl(filters, search);
    }, 500);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, filters, syncFiltersToUrl]);

  const [facultiesFilter, setFacultiesFilter] = useState<CatalogOption[]>([]); // Opciones de facultad para filtros (todas).
  const [blockTypesFilter, setBlockTypesFilter] = useState<CatalogOption[]>([]); // Opciones de tipo de bloque para filtros (todas).
  const [facultiesActive, setFacultiesActive] = useState<CatalogOption[]>([]); // Opciones activas para formularios.
  const [blockTypesActive, setBlockTypesActive] = useState<CatalogOption[]>([]); // Opciones activas para formularios.
  const [loadingCatalogs, setLoadingCatalogs] = useState(true); // Indicador para mostrar que aún cargamos los catálogos.
  const [isFetching, setIsFetching] = useState(false); // Indicador que muestra cuando se consulta el listado principal.
  const [tableInstance, setTableInstance] =
    useState<ReactTableInstance<BlockRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false); // Controla la apertura del diálogo de eliminación.
  const [blockToDelete, setBlockToDelete] = useState<BlockRow | null>(null); // Guarda el registro seleccionado para eliminar.
  const [deleting, setDeleting] = useState(false); // Marca si la petición DELETE está en curso.
  const [editOpen, setEditOpen] = useState(false); // Controla la apertura del diálogo de edición.
  const [blockToEdit, setBlockToEdit] = useState<BlockRow | null>(null); // Mantiene el bloque que se está editando.
  const [reloadKey, setReloadKey] = useState(0); // Permite forzar la recarga del listado tras eliminar.

  function resolveRowLabel(
    row: BlockRow,
    options: { directKeys: string[]; relationKeys?: string[] }
  ): string {
    const record = row as Record<string, unknown>;
    for (const key of options.directKeys) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length) {
        return value.trim();
      }
    }
    for (const relationKey of options.relationKeys ?? []) {
      const relation = record[relationKey];
      if (
        relation &&
        typeof relation === "object" &&
        !Array.isArray(relation)
      ) {
        const relationRecord = relation as Record<string, unknown>;
        const candidate =
          relationRecord.nombre ??
          relationRecord.nombre_corto ??
          relationRecord.nombreCorto ??
          relationRecord.descripcion ??
          relationRecord.codigo;
        if (typeof candidate === "string" && candidate.trim().length) {
          return candidate.trim();
        }
      }
    }
    return "";
  }

  function findCatalogIdByLabel(
    options: CatalogOption[],
    label: string
  ): number | undefined {
    const normalized = label.trim().toLowerCase();
    if (!normalized.length) {
      return undefined;
    }
    const exact = options.find(
      (option) => option.nombre.trim().toLowerCase() === normalized
    );
    if (exact) {
      return exact.id;
    }
    const partial = options.find((option) =>
      option.nombre.trim().toLowerCase().includes(normalized)
    );
    return partial?.id;
  }

  function guessFacultyIdFromRow(row: BlockRow): number | undefined {
    const label = resolveRowLabel(row, {
      directKeys: [
        "facultad",
        "facultad_nombre",
        "facultadName",
        "facultad_label",
      ],
      relationKeys: [
        "facultad_detalle",
        "facultadInfo",
        "facultad_relacion",
        "facultadData",
      ],
    });
    if (!label) {
      return undefined;
    }
    return findCatalogIdByLabel(facultiesActive, label);
  }

  function guessBlockTypeIdFromRow(row: BlockRow): number | undefined {
    const label = resolveRowLabel(row, {
      directKeys: [
        "tipo_bloque",
        "tipoBloque",
        "tipo_bloque_nombre",
        "tipoBloqueNombre",
      ],
      relationKeys: [
        "tipo_bloque_detalle",
        "tipoBloqueInfo",
        "tipo_bloque_relacion",
        "tipoBloqueData",
      ],
    });
    if (!label) {
      return undefined;
    }
    return findCatalogIdByLabel(blockTypesActive, label);
  }

  function isValidId(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
  }

  // Esta función auxilia se encarga de consultar los catálogos necesarios apenas carga la pantalla.
  useEffect(() => {
    // Creamos un abort controller para cancelar la petición si la persona abandona la vista.
    const controller = new AbortController();

    async function loadCatalogs() {
      try {
        setLoadingCatalogs(true); // Marcamos que estamos cargando la data de los selects.
        // Consultamos catálogos completos para filtros y solo activos para formularios.
        const [
          facultiesAllData,
          facultiesActiveData,
          blockTypesAllData,
          blockTypesActiveData,
        ] = await Promise.all([
          apiFetch<CatalogResponse>("/facultades?page=1&limit=200", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>("/facultades?page=1&limit=200&activo=true", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>("/tipo_bloques?page=1&limit=200", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>("/tipo_bloques?page=1&limit=200&activo=true", {
            signal: controller.signal,
          }),
        ]);
        setFacultiesFilter(
          normalizeCatalogOptions(facultiesAllData.items, "Facultad")
        ); // Guardamos las facultades para filtros (incluye inactivas).
        setFacultiesActive(
          normalizeCatalogOptions(facultiesActiveData.items, "Facultad")
        ); // Facultades activas para crear/editar.
        setBlockTypesFilter(
          normalizeCatalogOptions(blockTypesAllData.items, "Tipo de bloque")
        ); // Tipos de bloque para filtros (todos).
        setBlockTypesActive(
          normalizeCatalogOptions(blockTypesActiveData.items, "Tipo de bloque")
        ); // Tipos de bloque activos para formularios.
      } catch (error) {
        if (isAbortError(error)) {
          return; // Si abortamos manualmente salimos silenciosamente.
        }
        notify.error({
          title: "No se pudieron cargar los catálogos",
          description: "Facultades y tipos de bloque no están disponibles. Intenta nuevamente.",
        }); // Mostramos un mensaje amable cuando falla la carga.
      } finally {
        setLoadingCatalogs(false); // Restablecemos el indicador en cualquier caso.
      }
    }

    void loadCatalogs(); // Disparamos la carga.
    return () => {
      if (!controller.signal.aborted) {
        controller.abort("Component unmounted");
      }
    };
  }, []);

  // Construimos la query string cada vez que la página, los filtros o la búsqueda cambian.
  const queryString = useMemo(() => {
    const params = new URLSearchParams(); // Preparamos el objeto que traduciremos a ?clave=valor.
    params.set("page", String(page)); // Siempre enviamos la p?gina actual.
    params.set("limit", String(TAKE)); // El backend necesita saber cu?ntos registros devolver.
    if (search.trim()) {
      params.set("search", search.trim()); // Agregamos la b?squeda.
    }
    if (appliedFilters.facultadId) {
      params.set("facultadId", appliedFilters.facultadId); // Traduce el filtro de facultades.
    }
    if (appliedFilters.tipoBloqueId) {
      params.set("tipoBloqueId", appliedFilters.tipoBloqueId); // Traduce el filtro por tipo.
    }
    if (appliedFilters.activo) {
      params.set("activo", appliedFilters.activo); // true/false seg?n la opci?n seleccionada.
    }
    if (appliedFilters.pisosMin.trim() !== "") {
      const parsedMin = Number(appliedFilters.pisosMin.trim()); // Intentamos convertir el m?nimo a n?mero.
      if (!Number.isNaN(parsedMin)) {
        params.set("pisosMin", String(parsedMin)); // S?lo enviamos el valor cuando es v?lido.
      }
    }
    if (appliedFilters.pisosMax.trim() !== "") {
      const parsedMax = Number(appliedFilters.pisosMax.trim()); // Repetimos el proceso para el m?ximo.
      if (!Number.isNaN(parsedMax)) {
        params.set("pisosMax", String(parsedMax));
      }
    }
    return params.toString(); // Finalmente devolvemos la cadena para ejecutar la solicitud.
  }, [page, search, appliedFilters]);


  // Cada vez que la query string cambia consultamos el backend para actualizar la tabla.
  useEffect(() => {
    const controller = new AbortController(); // Creamos un controlador para abortar la petición si es necesario.

    async function loadBlocks() {
      try {
        setIsFetching(true); // Indicamos que estamos sincronizando datos.
        const data = await apiFetch<BlockListResponse>(
          `/bloques?${queryString}`,
          {
            signal: controller.signal,
          }
        ); // Realizamos la consulta principal de bloques.
        setItems(Array.isArray(data.items) ? data.items : []); // Guardamos las filas recibidas.
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
        setPages(resolvedPages); // Ajustamos la paginación incluso si el backend omite pages.
      } catch (error) {
        if (isAbortError(error)) {
          return; // Si abortamos manualmente no mostramos errores.
        }
        notify.error({
          title: "No pudimos cargar el listado de bloques",
          description: "Reintenta en unos segundos.",
        }); // Comunicamos el fallo a la persona usuaria de manera controlada.
      } finally {
        setIsFetching(false); // Siempre restablecemos el indicador.
      }
    }

    void loadBlocks(); // Ejecutamos la consulta.
    return () => {
      if (!controller.signal.aborted) {
        controller.abort("Effect cleanup");
      }
    };
  }, [queryString, reloadKey]);

  // Handlers auxiliares para mantener el componente ordenado.
  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    syncFiltersToUrl(filters, search);
  }

  function updateFilter<Key extends keyof FilterState>(
    key: Key,
    value: string
  ) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    syncFiltersToUrl(newFilters, search);
  }

  function handleClearFilters() {
    setFilters(INITIAL_FILTERS);
    setSearch("");
    router.push("/dashboard/bloques/list");
  }

  function handleEdit(block: BlockRow) {
    const enriched = { ...block } as Record<string, unknown>;

    if (!isValidId(enriched.facultad_id)) {
      const guessedFaculty = guessFacultyIdFromRow(block);
      if (typeof guessedFaculty === "number") {
        enriched.facultad_id = guessedFaculty;
      }
    }

    if (!isValidId(enriched.tipo_bloque_id)) {
      const guessedBlockType = guessBlockTypeIdFromRow(block);
      if (typeof guessedBlockType === "number") {
        enriched.tipo_bloque_id = guessedBlockType;
      }
    }

    setBlockToEdit(enriched as BlockRow); // Guardamos la fila seleccionada para popular el formulario.
    setEditOpen(true); // Abrimos el dialogo de edicion.
  }


  function handleDelete(block: BlockRow) {
    setBlockToDelete(block); // Guardamos el bloque que se desea eliminar.
    setDeleteOpen(true); // Mostramos el diálogo de confirmación.
  }

  async function confirmDelete() {
    if (!blockToDelete) {
      return; // Si por alguna razón no hay registro seleccionado, no continuamos.
    }

    try {
      setDeleting(true); // Deshabilitamos los controles mientras invocamos la API.
      await apiFetch(`/bloques/${blockToDelete.id}`, {
        method: "DELETE",
      }); // Invocamos el endpoint definido en HU 16.

      notify.success({
        title: "Bloque eliminado",
        description: "El bloque se eliminó correctamente.",
      }); // Avisamos a la persona usuaria que la operación concluyó.

      setDeleteOpen(false); // Cerramos el diálogo de confirmación.
      setBlockToDelete(null); // Limpiamos la referencia.
      setReloadKey((previous) => previous + 1); // Forzamos la recarga del listado para reflejar el cambio.
    } catch (error) {
      const errorDetails =
        typeof error === "object" && error && "details" in error
          ? (error as { details?: unknown }).details
          : undefined;
      const errorMessage =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message ?? "")
          : "";

      const description = Array.isArray(errorDetails) && errorDetails.length
        ? errorDetails.join("\n")
        : errorMessage || "Revisa los datos e inténtalo nuevamente.";

      notify.error({
        title: "No se pudo eliminar el bloque",
        description,
      }); // Mostramos el detalle del fallo.
    } finally {
      setDeleting(false); // Restablecemos los controles sin importar el resultado.
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Bloques</h1>
      </header>

      <form
        onSubmit={handleSearchSubmit}
        className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:min-w-[280px]">
            <Label htmlFor="block-search">Buscar</Label>
            <Input
              id="block-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por codigo, nombre o nombre corto"
              aria-label="Buscar bloques"
            />
          </div>

          <div className="flex w-full flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center lg:w-auto">
            <Button type="submit" className="w-full min-[480px]:w-auto">
              Buscar
            </Button>
            <Button
              type="button"
          variant="outline"
          onClick={handleClearFilters}
          className="w-full min-[480px]:w-auto"
        >
          Limpiar filtros
        </Button>
        <Button
          type="button"
          className="w-full min-[480px]:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          Nuevo bloque
        </Button>
      </div>
    </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SearchableSelect
            id="facultad-filter"
            label="Filtrar por facultad"
            searchPlaceholder="Buscar facultad"
            emptyLabel="No se encontraron facultades"
            allLabel="Todas las facultades"
            value={filters.facultadId}
            onChange={(value) => updateFilter("facultadId", value)}
            options={facultiesFilter.map(f => ({ value: String(f.id), label: f.nombre }))}
            loading={loadingCatalogs}
          />

          <SearchableSelect
            id="tipo-bloque-filter"
            label="Filtrar por tipo de bloque"
            searchPlaceholder="Buscar tipo de bloque"
            emptyLabel="No se encontraron tipos"
            allLabel="Todos los tipos"
            value={filters.tipoBloqueId}
            onChange={(value) => updateFilter("tipoBloqueId", value)}
            options={blockTypesFilter.map(t => ({ value: String(t.id), label: t.nombre }))}
            loading={loadingCatalogs}
          />

          <div className="space-y-2">
            <Label id="estado-filter-label">Filtrar por estado</Label>
            <Select
              value={filters.activo || ALL_VALUE}
              onValueChange={(value) =>
                updateFilter("activo", value === ALL_VALUE ? "" : value)
              }
            >
              <SelectTrigger
                aria-labelledby="estado-filter-label"
                aria-label="Filtrar por estado"
              >
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos los estados</SelectItem>
                <SelectItem value="true">Solo activos</SelectItem>
                <SelectItem value="false">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pisos-min">Pisos mínimos</Label>
            <Input
              id="pisos-min"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              placeholder="Ej. 2"
              aria-label="Pisos mínimos"
              value={filters.pisosMin}
              onChange={(event) => updateFilter("pisosMin", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pisos-max">Pisos máximos</Label>
            <Input
              id="pisos-max"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              placeholder="Ej. 10"
              aria-label="Pisos máximos"
              value={filters.pisosMax}
              onChange={(event) => updateFilter("pisosMax", event.target.value)}
            />
          </div>

          {tableInstance ? (
            <div className="flex items-end justify-end">
              <DataTableViewOptions table={tableInstance} />
            </div>
          ) : (
            <div aria-hidden />
          )}
        </div>
      </form>

      <DataTable
        columns={blockColumns(handleEdit, handleDelete)}
        data={items}
        page={page}
        pages={pages}
        onPageChange={setPage}
        showViewOptions={false}
        onTableReady={setTableInstance}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-full overflow-hidden p-0 sm:max-w-4xl" showCloseButton={false}>
          <div className="flex max-h-[90vh] flex-col">
            <div className="flex items-center justify-between border-b px-6 py-3">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle>Registrar bloque</DialogTitle>
                <DialogDescription>
                  Completa los datos para crear un nuevo bloque en la facultad seleccionada.
                </DialogDescription>
              </DialogHeader>
              <DialogClose className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <span aria-hidden>&times;</span>
                <span className="sr-only">Cerrar</span>
              </DialogClose>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <BlockCreateForm
                faculties={facultiesActive}
                blockTypes={blockTypesActive}
                onSuccess={async () => {
                  setPage(1);
                  setReloadKey((value) => value + 1);
                  setCreateOpen(false);
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(value) => {
          setEditOpen(value);
          if (!value) {
            setBlockToEdit(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-full overflow-hidden p-0 sm:max-w-4xl">
          <div className="flex max-h-[85vh] flex-col ">
            <DialogHeader className="space-y-2 border-b p-6">
              <DialogTitle>Editar bloque</DialogTitle>  
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              {blockToEdit ? (
                <BlockEditForm
                  block={blockToEdit}
                  faculties={facultiesActive}
                  blockTypes={blockTypesActive}
                  onCancel={() => {
                    setEditOpen(false);
                    setBlockToEdit(null);
                  }}
                  onSubmitSuccess={async () => {
                    setEditOpen(false);
                    setBlockToEdit(null);
                    setReloadKey((previous) => previous + 1);
                  }}
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(value) => {
          setDeleteOpen(value);
          if (!value) {
            setBlockToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle>Eliminar bloque</DialogTitle>
            <DialogDescription>
              Esta accion eliminara el bloque seleccionado y los ambientes que dependan de el. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Confirma el codigo y nombre antes de continuar.</p>
            {blockToDelete ? (
              <>
                <p>
                  Codigo:{" "}
                  <span className="font-semibold">{blockToDelete.codigo}</span>
                </p>
                <p>
                  Nombre:{" "}
                  <span className="font-semibold">{blockToDelete.nombre}</span>
                </p>
              </>
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

export default function BlockListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Cargando filtros...</div>}>
      <BlockListPageContent />
    </Suspense>
  );
}
