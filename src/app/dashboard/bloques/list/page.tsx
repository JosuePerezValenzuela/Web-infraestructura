"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"; // React nos brinda el estado y los efectos necesarios para manejar la UI.
import Link from "next/link";
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
};

type CatalogApiItem = {
  id: number;
  nombre?: string | null;
  nombre_corto?: string | null;
  nombreCorto?: string | null;
  descripcion?: string | null;
  codigo?: string | null;
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
const ALL_VALUE = "all"; // Valor centinela requerido por Radix Select para representar la opción de "todos".

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

      return { id: item.id, nombre: finalLabel };
    })
    .filter((option): option is CatalogOption => Boolean(option));
}

type SearchableSelectProps = {
  id: string;
  label: string;
  ariaLabel: string;
  placeholder: string;
  emptyLabel: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: CatalogOption[];
  loading?: boolean;
};

function SearchableSelect({
  id,
  label,
  ariaLabel,
  placeholder,
  emptyLabel,
  allLabel,
  value,
  onChange,
  options,
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) =>
      option.nombre.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectedOption = options.find((option) => String(option.id) === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        triggerRef.current?.contains(target) ||
        containerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const labelId = `${id}-label`;
  const triggerId = `${id}-trigger`;
  const searchInputId = `${id}-search`;

  return (
    <div className="space-y-2">
      <Label id={labelId} htmlFor={triggerId}>
        {label}
      </Label>
      <div className="relative" ref={containerRef}>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          id={triggerId}
          className="w-full justify-between"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-labelledby={`${labelId} ${triggerId}`}
          onClick={() => {
            setOpen((previous) => !previous);
            setSearchTerm("");
          }}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.nombre : allLabel}
          </span>
          <span
            aria-hidden
            className="text-xs text-muted-foreground"
          >
            {open ? "Cerrar" : "Abrir"}
          </span>
        </Button>

        {open ? (
          <div
            ref={dropdownRef}
            className="absolute z-30 mt-2 w-full rounded-md border bg-popover shadow-md"
          >
            <div className="p-2">
              <Input
                id={searchInputId}
                placeholder={placeholder}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                autoFocus
              />
            </div>

            <ul
              id={`${id}-listbox`}
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-56 overflow-y-auto px-1 pb-2"
            >
              <li className="p-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ""}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  {allLabel}
                </button>
              </li>

              {loading ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Cargando opciones...
                </li>
              ) : filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <li key={option.id} className="p-1">
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === String(option.id)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        onChange(String(option.id));
                        setOpen(false);
                      }}
                    >
                      {option.nombre}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyLabel}
                </li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function BlockListPage() {
  const [items, setItems] = useState<BlockRow[]>([]); // Contendrá las filas visibles en la tabla.
  const [page, setPage] = useState(1); // Página actual que estamos mostrando.
  const [pages, setPages] = useState(1); // Cantidad total de páginas disponibles.
  const [search, setSearch] = useState(""); // Texto que la persona escribe en el campo de búsqueda.
  const [appliedSearch, setAppliedSearch] = useState(""); // Texto efectivamente aplicado como filtro.
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS); // Estado con los filtros seleccionados.
  const [faculties, setFaculties] = useState<CatalogOption[]>([]); // Opciones de facultad para el select.
  const [blockTypes, setBlockTypes] = useState<CatalogOption[]>([]); // Opciones de tipo de bloque.
  const [loadingCatalogs, setLoadingCatalogs] = useState(true); // Indicador para mostrar que aún cargamos los catálogos.
  const [isFetching, setIsFetching] = useState(false); // Indicador que muestra cuando se consulta el listado principal.
  const [tableInstance, setTableInstance] =
    useState<ReactTableInstance<BlockRow> | null>(null);
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
    return findCatalogIdByLabel(faculties, label);
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
    return findCatalogIdByLabel(blockTypes, label);
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
        // Consultamos los catálogos en paralelo para ahorrar tiempo y cumplir con la regla de Security by Design (white list).
        const [facultiesData, blockTypesData] = await Promise.all([
          apiFetch<CatalogResponse>("/facultades?page=1&limit=200&activo=True", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>("/tipo_bloques?page=1&limit=200&activo=True", {
            signal: controller.signal,
          }),
        ]);
        setFaculties(
          normalizeCatalogOptions(facultiesData.items, "Facultad")
        ); // Guardamos las facultades para el select con nombres legibles.
        setBlockTypes(
          normalizeCatalogOptions(blockTypesData.items, "Tipo de bloque")
        ); // Guardamos los tipos de bloque normalizados.
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
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
    return () => controller.abort(); // Abortamos las solicitudes cuando el componente se desmonta.
  }, []);

  // Construimos la query string cada vez que la página, los filtros o la búsqueda cambian.
  const queryString = useMemo(() => {
    const params = new URLSearchParams(); // Preparamos el objeto que traduciremos a ?clave=valor.
    params.set("page", String(page)); // Siempre enviamos la página actual.
    params.set("limit", String(TAKE)); // El backend necesita saber cuántos registros devolver.
    if (appliedSearch) {
      params.set("search", appliedSearch); // Solo agregamos la búsqueda si la persona la confirmó.
    }
    if (filters.facultadId) {
      params.set("facultadId", filters.facultadId); // Traduce el filtro de facultades.
    }
    if (filters.tipoBloqueId) {
      params.set("tipoBloqueId", filters.tipoBloqueId); // Traduce el filtro por tipo.
    }
    if (filters.activo) {
      params.set("activo", filters.activo); // true/false según la opción seleccionada.
    }
    if (filters.pisosMin.trim() !== "") {
      const parsedMin = Number(filters.pisosMin.trim()); // Intentamos convertir el mínimo a número.
      if (!Number.isNaN(parsedMin)) {
        params.set("pisosMin", String(parsedMin)); // Sólo enviamos el valor cuando es válido.
      }
    }
    if (filters.pisosMax.trim() !== "") {
      const parsedMax = Number(filters.pisosMax.trim()); // Repetimos el proceso para el máximo.
      if (!Number.isNaN(parsedMax)) {
        params.set("pisosMax", String(parsedMax));
      }
    }
    return params.toString(); // Finalmente devolvemos la cadena para ejecutar la solicitud.
  }, [page, appliedSearch, filters]);

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
        if (error instanceof DOMException && error.name === "AbortError") {
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
    return () => controller.abort(); // Abortamos si el efecto se limpia antes de completar.
  }, [queryString, reloadKey]);

  // Handlers auxiliares para mantener el componente ordenado.
  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Evitamos la recarga del navegador.
    setAppliedSearch(search.trim()); // Guardamos la versión limpia de la búsqueda.
    setPage(1); // Volvemos a la primera página según la regla de negocio.
  }

  function updateFilter<Key extends keyof FilterState>(
    key: Key,
    value: string
  ) {
    setFilters((prev) => ({ ...prev, [key]: value })); // Actualizamos solamente el filtro indicado.
    setPage(1); // Siempre que cambia un filtro regresamos al inicio de la paginación.
  }

  function handleClearFilters() {
    setFilters(INITIAL_FILTERS); // Restauramos los filtros al estado base.
    setSearch(""); // Limpiamos el campo de búsqueda visible.
    setAppliedSearch(""); // Eliminamos el filtro aplicado en la query.
    setPage(1); // Regresamos a la primera página.
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
            <Button asChild className="w-full min-[480px]:w-auto">
              <Link href="/dashboard/bloques/create">Nuevo bloque</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SearchableSelect
            id="facultad-filter"
            label="Filtrar por facultad"
            ariaLabel="Listado de facultades para filtrar bloques"
            placeholder="Buscar facultad"
            emptyLabel="No se encontraron facultades"
            allLabel="Todas las facultades"
            value={filters.facultadId}
            onChange={(value) => updateFilter("facultadId", value)}
            options={faculties}
            loading={loadingCatalogs}
          />

          <SearchableSelect
            id="tipo-bloque-filter"
            label="Filtrar por tipo de bloque"
            ariaLabel="Listado de tipos de bloque para filtrar"
            placeholder="Buscar tipo de bloque"
            emptyLabel="No se encontraron tipos"
            allLabel="Todos los tipos"
            value={filters.tipoBloqueId}
            onChange={(value) => updateFilter("tipoBloqueId", value)}
            options={blockTypes}
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
                  faculties={faculties}
                  blockTypes={blockTypes}
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
