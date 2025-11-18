"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { DataTableViewOptions } from "@/components/data-table-view-options";
import {
  environmentColumns,
  type EnvironmentRow,
} from "@/features/environments/list/columns";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Table as ReactTableInstance } from "@tanstack/react-table";

const TAKE = 8;
const ALL_VALUE = "all";

type FilterState = {
  tipoAmbienteId: string;
  bloqueId: string;
  facultadId: string;
  activo: string;
  clases: string;
  pisoMin: string;
  pisoMax: string;
};

const INITIAL_FILTERS: FilterState = {
  tipoAmbienteId: "",
  bloqueId: "",
  facultadId: "",
  activo: "",
  clases: "",
  pisoMin: "",
  pisoMax: "",
};

type CatalogOption = {
  value: string;
  label: string;
};

type CatalogApiItem = {
  id: number;
  nombre?: string | null;
  nombre_corto?: string | null;
  nombreCorto?: string | null;
  descripcion?: string | null;
  codigo?: string | null;
};

type CatalogResponse = {
  items: CatalogApiItem[];
};

type EnvironmentListResponse = {
  items: EnvironmentRow[];
  meta: {
    page: number;
    pages: number;
    total: number;
    take: number;
  };
};

function normalizeCatalogOptions(
  items: CatalogApiItem[],
  fallbackPrefix: string
): CatalogOption[] {
  // Recorremos cada elemento recibido desde la API para transformarlo en una opcion util para los selects.
  return items
    .map((item) => {
      // Si el elemento no tiene id numerico no podemos usarlo como opcion y lo descartamos.
      if (typeof item.id !== "number") {
        return null;
      }
      // Buscamos la mejor etiqueta disponible en el objeto (nombre, descripcion o codigo).
      const labelCandidate =
        item.nombre ??
        item.nombre_corto ??
        item.nombreCorto ??
        item.descripcion ??
        item.codigo;
      // Normalizamos la etiqueta quitando espacios innecesarios.
      const finalLabel =
        typeof labelCandidate === "string" && labelCandidate.trim().length
          ? labelCandidate.trim()
          : `${fallbackPrefix} ${item.id}`;
      // Retornamos la opcion en el formato estandar usado por la pantalla.
      return { value: String(item.id), label: finalLabel };
    })
    // Filtramos los elementos nulos que pudieron aparecer por datos incompletos.
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
      option.label.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectedOption = options.find((option) => option.value === value);

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
  const listboxId = `${id}-listbox`;
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
          aria-controls={listboxId}
          aria-labelledby={`${labelId} ${triggerId}`}
          disabled={loading}
          onClick={() => {
            setOpen((previous) => !previous);
            setSearchTerm("");
          }}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : allLabel}
          </span>
          <span aria-hidden className="text-xs text-muted-foreground">
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
              id={listboxId}
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
                  <li key={option.value} className="p-1">
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === option.value}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      {option.label}
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

export default function EnvironmentListPage() {
  // Guardamos las filas que alimentaran la tabla principal.
  const [items, setItems] = useState<EnvironmentRow[]>([]);
  // Mantenemos la pagina actual que la persona esta observando.
  const [page, setPage] = useState(1);
  // Almacenamos el total de paginas disponible.
  const [pages, setPages] = useState(1);
  // Conservamos el texto que la persona escribe en el buscador.
  const [search, setSearch] = useState("");
  // Guardamos la version aplicada del buscador para no disparar consultas en cada pulsacion.
  const [appliedSearch, setAppliedSearch] = useState("");
  // Este estado conserva los filtros visibles en el formulario.
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  // Este estado traduce los filtros confirmados hacia la API.
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(INITIAL_FILTERS);
  // Guardamos las opciones de los selects (bloques, tipos y facultades) en un unico objeto.
  const [catalogs, setCatalogs] = useState<{
    blocks: CatalogOption[];
    environmentTypes: CatalogOption[];
    faculties: CatalogOption[];
  }>({
    blocks: [],
    environmentTypes: [],
    faculties: [],
  });
  // Indicamos cuando los catalogos se estan cargando para deshabilitar los selects.
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  // Señalamos cuando la tabla esta actualizando sus datos.
  const [loadingTable, setLoadingTable] = useState(false);
  // Guardamos la instancia de la tabla para exponer las opciones de vista en el formulario.
  const [tableInstance, setTableInstance] =
    useState<ReactTableInstance<EnvironmentRow> | null>(null);

  // Apenas se monta la pantalla consultamos los catálogos necesarios para los filtros.
  useEffect(() => {
    // Creamos un AbortController para poder cancelar las peticiones si la vista se desmonta.
    const controller = new AbortController();

    async function loadCatalogs() {
      try {
        // Marcamos que estamos cargando la información auxiliar.
        setLoadingCatalogs(true);
        // Consultamos los catálogos en paralelo para optimizar tiempo.
        const [blocksResponse, environmentTypesResponse, facultiesResponse] =
          await Promise.all([
            apiFetch<CatalogResponse>("/bloques?page=1&limit=50", {
              signal: controller.signal,
            }),
            apiFetch<CatalogResponse>("/tipo_ambientes?page=1&limit=50", {
              signal: controller.signal,
            }),
            apiFetch<CatalogResponse>("/facultades?page=1&limit=50", {
              signal: controller.signal,
            }),
          ]);
        // Normalizamos las opciones y las guardamos para su uso inmediato.
        setCatalogs({
          blocks: normalizeCatalogOptions(
            blocksResponse.items,
            "Bloque"
          ),
          environmentTypes: normalizeCatalogOptions(
            environmentTypesResponse.items,
            "Tipo de ambiente"
          ),
          faculties: normalizeCatalogOptions(
            facultiesResponse.items,
            "Facultad"
          ),
        });
      } catch (error) {
        // Si abortamos manualmente no mostramos mensajes de error.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Comunicamos que la carga de catálogos falló para que la persona sepa cómo proceder.
        notify.error({
          title: "No pudimos cargar los filtros",
          description: "Intenta nuevamente en unos segundos.",
        });
      } finally {
        // Restablecemos el indicador sin importar el resultado.
        setLoadingCatalogs(false);
      }
    }

    // Lanzamos la carga inicial de catálogos.
    void loadCatalogs();
    // Si el componente se desmonta abortamos las solicitudes pendientes.
    return () => controller.abort();
  }, []);

  // Construimos la query string a partir de los filtros confirmados y la pagina actual.
  const queryString = useMemo(() => {
    // Inicializamos la estructura que nos permite armar ?clave=valor.
    const params = new URLSearchParams();
    // Siempre enviamos la pagina actual confirmada.
    params.set("page", String(page));
    // Definimos la cantidad de elementos por pagina segun la HU (8).
    params.set("limit", String(TAKE));
    // Adjuntamos el termino de busqueda solo cuando la persona lo solicito.
    if (appliedSearch.trim().length) {
      params.set("search", appliedSearch.trim());
    }
    // Traducimos cada filtro confirmado a un query param.
    if (appliedFilters.tipoAmbienteId) {
      params.set("tipoAmbienteId", appliedFilters.tipoAmbienteId);
    }
    if (appliedFilters.bloqueId) {
      params.set("bloqueId", appliedFilters.bloqueId);
    }
    if (appliedFilters.facultadId) {
      params.set("facultadId", appliedFilters.facultadId);
    }
    if (appliedFilters.activo) {
      params.set("activo", appliedFilters.activo);
    }
    if (appliedFilters.clases) {
      params.set("clases", appliedFilters.clases);
    }
    if (appliedFilters.pisoMin.trim().length) {
      const parsedMin = Number(appliedFilters.pisoMin.trim());
      if (!Number.isNaN(parsedMin)) {
        params.set("pisoMin", String(parsedMin));
      }
    }
    if (appliedFilters.pisoMax.trim().length) {
      const parsedMax = Number(appliedFilters.pisoMax.trim());
      if (!Number.isNaN(parsedMax)) {
        params.set("pisoMax", String(parsedMax));
      }
    }
    // Entregamos la cadena final para reutilizarla en la peticion principal.
    return params.toString();
  }, [page, appliedSearch, appliedFilters]);

  // Cada vez que cambia la query construida consultamos el backend para refrescar la tabla.
  useEffect(() => {
    // AbortController que permite cancelar la consulta si se reemplaza antes de terminar.
    const controller = new AbortController();

    async function loadEnvironments() {
      try {
        // Mostramos que la tabla se esta actualizando.
        setLoadingTable(true);
        // Ejecutamos la peticion principal usando el helper centralizado.
        const data = await apiFetch<EnvironmentListResponse>(
          `/ambientes?${queryString}`,
          { signal: controller.signal }
        );
        // Guardamos las filas recibidas validando que realmente sea un arreglo.
        setItems(Array.isArray(data.items) ? data.items : []);
        // Calculamos el total de paginas y nos aseguramos de no bajar de 1.
        setPages(Math.max(1, data.meta?.pages ?? 1));
        // Sincronizamos la pagina actual por si el backend la ajusto.
        if (typeof data.meta?.page === "number") {
          setPage(data.meta.page);
        }
      } catch (error) {
        // Omitimos el error si la peticion fue cancelada manualmente.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Cualquier otro fallo se comunica mediante una notificacion clara.
        notify.error({
          title: "No pudimos cargar los ambientes",
          description: "Revisa tu conexion o ajusta los filtros.",
        });
      } finally {
        // Ocultamos el indicador de carga siempre que termine la operacion.
        setLoadingTable(false);
      }
    }

    // Ejecutamos la carga principal.
    void loadEnvironments();
    // Abortamos la solicitud si el efecto se limpia antes de completar.
    return () => controller.abort();
  }, [queryString]);

  // Aplica los filtros visibles y evita que el formulario recargue la pagina.
  function handleApplyFilters(event?: FormEvent<HTMLFormElement>) {
    // Cancelamos el comportamiento por defecto del formulario.
    event?.preventDefault();
    // Normalizamos el texto de busqueda quitando espacios innecesarios.
    const normalizedSearch = search.trim();
    // Guardamos el termino ya limpio para que forme parte de la consulta.
    setAppliedSearch(normalizedSearch);
    // Sincronizamos los filtros confirmados con los que usa la API.
    setAppliedFilters(filters);
    // Regresamos a la primera pagina para mostrar los resultados mas recientes.
    setPage(1);
  }

  // Limpia todos los filtros y regresa la tabla a su estado inicial.
  function handleResetFilters() {
    // Restauramos los filtros visibles a sus valores base.
    setFilters(INITIAL_FILTERS);
    // Vaciamos el campo de busqueda que ve la persona usuaria.
    setSearch("");
    // Reiniciamos los filtros aplicados para la consulta real.
    setAppliedFilters(INITIAL_FILTERS);
    // Quitamos cualquier termino de busqueda aplicado anteriormente.
    setAppliedSearch("");
    // Volvemos a la primera pagina para reiniciar la paginacion.
    setPage(1);
  }

  // Informa que el flujo de creacion se implementara en una iteracion posterior.
  function handleCreateClick() {
    // Mostramos una notificacion amigable explicando el estado de la funcionalidad.
    notify.info({
      title: "Crear ambiente",
      description: "Este flujo estara disponible en la siguiente iteracion.",
    });
  }

  // Informa que el flujo de edicion aun no esta disponible.
  function handleEdit(row: EnvironmentRow) {
    // Mostramos un mensaje educativo que menciona el ambiente seleccionado.
    notify.info({
      title: "Editar ambiente",
      description: `La edicion de ${row.nombre ?? row.codigo} estara disponible pronto.`,
    });
  }

  // Informa que el flujo de eliminacion aun no esta disponible.
  function handleDelete(row: EnvironmentRow) {
    // Comunicamos que la eliminacion se agregara en una futura iteracion.
    notify.info({
      title: "Eliminar ambiente",
      description: `La eliminacion de ${row.nombre ?? row.codigo} estara activa mas adelante.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">Ambientes</h1>
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
        noValidate
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="environment-search">Buscar ambientes</Label>
            <Input
              id="environment-search"
              aria-label="Buscar ambientes"
              placeholder="Buscar por nombre o codigo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex w-full justify-end lg:w-auto">
            <Button
              type="button"
              className="w-full lg:w-auto"
              onClick={handleCreateClick}
            >
              Nuevo ambiente
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SearchableSelect
            id="faculty-filter"
            label="Facultad"
            ariaLabel="Opciones de facultad"
            placeholder="Escribe para filtrar facultades"
            emptyLabel="Sin resultados"
            allLabel="Todas"
            value={filters.facultadId}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                facultadId: value,
              }))
            }
            options={catalogs.faculties}
            loading={loadingCatalogs}
          />

          <SearchableSelect
            id="block-filter"
            label="Bloque"
            ariaLabel="Opciones de bloque"
            placeholder="Busca por nombre o codigo"
            emptyLabel="Sin resultados"
            allLabel="Todos"
            value={filters.bloqueId}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                bloqueId: value,
              }))
            }
            options={catalogs.blocks}
            loading={loadingCatalogs}
          />

          <SearchableSelect
            id="environment-type-filter"
            label="Tipo de ambiente"
            ariaLabel="Opciones de tipo de ambiente"
            placeholder="Escribe para filtrar tipos"
            emptyLabel="Sin resultados"
            allLabel="Todos"
            value={filters.tipoAmbienteId}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                tipoAmbienteId: value,
              }))
            }
            options={catalogs.environmentTypes}
            loading={loadingCatalogs}
          />

          <div className="space-y-2">
            <Label htmlFor="floor-min">Piso minimo</Label>
            <Input
              id="floor-min"
              aria-label="Piso minimo"
              type="number"
              placeholder="Ej. 1"
              value={filters.pisoMin}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  pisoMin: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="floor-max">Piso maximo</Label>
            <Input
              id="floor-max"
              aria-label="Piso maximo"
              type="number"
              placeholder="Ej. 4"
              value={filters.pisoMax}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  pisoMax: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="classes-filter">Uso academico</Label>
            <Select
              value={filters.clases || ALL_VALUE}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  clases: value === ALL_VALUE ? "" : value,
                }))
              }
            >
              <SelectTrigger id="classes-filter" aria-label="Uso academico">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                <SelectItem value="true">Dicta clases</SelectItem>
                <SelectItem value="false">No dicta clases</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">Estado</Label>
            <Select
              value={filters.activo || ALL_VALUE}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  activo: value === ALL_VALUE ? "" : value,
                }))
              }
            >
              <SelectTrigger id="status-filter" aria-label="Estado">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {tableInstance ? (
            <DataTableViewOptions table={tableInstance} />
          ) : null}
          <Button type="submit" disabled={loadingTable}>
            {loadingTable ? "Aplicando..." : "Aplicar filtros"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            disabled={loadingTable && !items.length}
          >
            Limpiar
          </Button>
        </div>
      </form>

      {loadingTable ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Cargando ambientes...
        </p>
      ) : null}

      <DataTable
        columns={environmentColumns(handleEdit, handleDelete)}
        data={items}
        page={page}
        pages={pages}
        onPageChange={setPage}
        showViewOptions={false}
        onTableReady={setTableInstance}
        emptyState={{
          title: "No encontramos ambientes con esos filtros",
          description: "Prueba con otros criterios o restablece la busqueda.",
          action: (
            <Button type="button" variant="outline" onClick={handleResetFilters}>
              Quitar filtros
            </Button>
          ),
        }}
      />
    </div>
  );
}
