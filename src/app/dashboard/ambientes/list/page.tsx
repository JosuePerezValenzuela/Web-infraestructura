"use client";

import {
  useCallback,
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
import { EnvironmentCreateForm } from "@/features/environments/create/EnvironmentCreateForm";
import { EnvironmentEditDialog } from "@/features/environments/edit/EnvironmentEditDialog";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Table as ReactTableInstance } from "@tanstack/react-table";
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
import type { CatalogOption as CatalogSelectOption } from "@/components/catalog-search-select";

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

type FilterOption = {
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
    pages?: number;
    total?: number;
    take?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

function normalizeCatalogOptions(
  items: CatalogApiItem[],
  fallbackPrefix: string
): FilterOption[] {
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
    .filter((option): option is FilterOption => Boolean(option));
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
  options: FilterOption[];
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
    blocks: FilterOption[];
    environmentTypes: FilterOption[];
    faculties: FilterOption[];
  }>({
    blocks: [],
    environmentTypes: [],
    faculties: [],
  });
  // Indicamos cuando los catalogos se estan cargando para deshabilitar los selects.
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  // Señalamos cuando la tabla esta actualizando sus datos.
  const [loadingTable, setLoadingTable] = useState(false);
  // Controla la apertura del modal de creacion.
  const [createOpen, setCreateOpen] = useState(false);
  // Maneja la apertura del modal de edicion.
  const [editOpen, setEditOpen] = useState(false);
  // Conserva el ambiente seleccionado para editarlo.
  const [editingEnvironment, setEditingEnvironment] =
    useState<EnvironmentRow | null>(null);
  // Permite forzar la recarga del listado despues de crear o eliminar un ambiente.
  const [reloadKey, setReloadKey] = useState(0);
  // Guardamos la instancia de la tabla para exponer las opciones de vista en el formulario.
  const [tableInstance, setTableInstance] =
    useState<ReactTableInstance<EnvironmentRow> | null>(null);
  // Controla la apertura del dialogo de confirmacion de eliminacion.
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Almacena el ambiente que la persona desea eliminar.
  const [environmentToDelete, setEnvironmentToDelete] =
    useState<EnvironmentRow | null>(null);
  // Indica cuando la peticion DELETE esta en curso para deshabilitar acciones repetidas.
  const [deleting, setDeleting] = useState(false);

  const blockOptionsForForm = useMemo<CatalogSelectOption[]>(() => {
    return catalogs.blocks
      .map((option) => {
        const id = Number(option.value);
        if (Number.isNaN(id)) {
          return null;
        }
        return { id, nombre: option.label };
      })
      .filter(
        (option): option is CatalogSelectOption => option !== null
      );
  }, [catalogs.blocks]);

  const environmentTypeOptionsForForm = useMemo<CatalogSelectOption[]>(() => {
    return catalogs.environmentTypes
      .map((option) => {
        const id = Number(option.value);
        if (Number.isNaN(id)) {
          return null;
        }
        return { id, nombre: option.label };
      })
      .filter(
        (option): option is CatalogSelectOption => option !== null
      );
  }, [catalogs.environmentTypes]);

  function resolveRowLabel(
    row: EnvironmentRow,
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
    options: CatalogSelectOption[],
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

  const guessBlockIdFromRow = useCallback(
    (row: EnvironmentRow): number | undefined => {
      const label = resolveRowLabel(row, {
        directKeys: [
          "bloque",
          "bloque_nombre",
          "bloqueNombre",
          "bloque_label",
        ],
        relationKeys: ["bloque_detalle", "bloqueDetalle", "bloqueInfo"],
      });
      if (!label) {
        return undefined;
      }
      return findCatalogIdByLabel(blockOptionsForForm, label);
    },
    [blockOptionsForForm]
  );

  const guessTypeIdFromRow = useCallback(
    (row: EnvironmentRow): number | undefined => {
      const label = resolveRowLabel(row, {
        directKeys: [
          "tipo_ambiente",
          "tipo_ambiente_nombre",
          "tipoAmbienteNombre",
        ],
        relationKeys: [
          "tipo_ambiente_detalle",
          "tipoAmbienteDetalle",
          "tipoAmbiente",
        ],
      });
      if (!label) {
        return undefined;
      }
      return findCatalogIdByLabel(environmentTypeOptionsForForm, label);
    },
    [environmentTypeOptionsForForm]
  );

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
        // Calculamos el total de paginas priorizando el valor entregado por el backend o derivandolo desde total y take.
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
        // Si el backend indica que hay mas paginas pero no entrega el total, extendemos una pagina mas para habilitar el boton siguiente.
        const resolvedPages =
          data.meta?.hasNextPage && page >= basePages
            ? page + 1
            : basePages;
        setPages(resolvedPages);
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
  }, [queryString, reloadKey]);

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

  function formatEnvironmentLabel(row: EnvironmentRow | null): string {
    // Si no recibimos un ambiente simplemente devolvemos una cadena vacía para evitar errores.
    if (!row) {
      return "";
    }
    // Convertimos la fila a un registro genérico para poder leer campos adicionales sin romper el tipado.
    const record = row as Record<string, unknown>;
    // Tomamos el nombre principal cuando viene definido y lo limpiamos de espacios extra.
    const nameCandidate =
      typeof record.nombre === "string" ? record.nombre.trim() : "";
    // Revisamos si existe un nombre corto en cualquiera de los formatos usados por la API.
    const shortCandidateRaw =
      typeof record.nombre_corto === "string"
        ? record.nombre_corto
        : typeof record.nombreCorto === "string"
          ? record.nombreCorto
          : null;
    // Normalizamos el nombre corto que encontramos para que no contenga espacios sobrantes.
    const shortCandidate =
      typeof shortCandidateRaw === "string"
        ? shortCandidateRaw.trim()
        : "";
    // Obtenemos el código del ambiente, que también actúa como identificador legible.
    const codeCandidate =
      typeof record.codigo === "string" ? record.codigo.trim() : "";

    // Si tenemos nombre y código, los combinamos para darle más contexto a la persona usuaria.
    if (nameCandidate && codeCandidate) {
      return `${nameCandidate} (${codeCandidate})`;
    }

    // Si sólo hay nombre, lo retornamos tal cual porque ya es suficientemente descriptivo.
    if (nameCandidate) {
      return nameCandidate;
    }

    // Cuando sólo tenemos nombre corto y código, también los combinamos para no perder información.
    if (shortCandidate && codeCandidate) {
      return `${shortCandidate} (${codeCandidate})`;
    }

    // Como último recurso devolvemos el dato disponible (nombre corto o código).
    return shortCandidate || codeCandidate;
  }

  function resolveDeleteErrorMessage(error: unknown): string {
    // Validamos que el error sea un objeto para poder inspeccionar sus campos.
    if (error && typeof error === "object") {
      // Extraemos los campos comunes (message y details) que suele exponer la API.
      const withMessage = error as {
        message?: unknown;
        details?: unknown;
      };

      // Algunos endpoints devuelven un arreglo de detalles, así que los recorremos para construir un texto legible.
      if (Array.isArray(withMessage.details)) {
        const details = withMessage.details
          .map((detail) => {
            // Cuando el detalle ya es una cadena la usamos tal cual.
            if (typeof detail === "string") {
              return detail;
            }
            // Si el detalle es un objeto buscamos una propiedad message y la devolvemos como texto.
            if (
              detail &&
              typeof detail === "object" &&
              "message" in detail &&
              typeof (detail as { message?: unknown }).message === "string"
            ) {
              return ((detail as { message?: string }).message ?? "").trim();
            }
            // Para cualquier otro caso devolvemos una cadena vacía que luego filtraremos.
            return "";
          })
          // Eliminamos los textos vacíos que no aportan información.
          .filter((detail) => detail.length > 0);

        // Si logramos recolectar mensajes los unimos con saltos de línea para mostrarlos juntos.
        if (details.length) {
          return details.join("\n");
        }
      }

      // Cuando no hay detalles, usamos el mensaje principal si viene como cadena.
      if (
        typeof withMessage.message === "string" &&
        withMessage.message.trim().length
      ) {
        return withMessage.message.trim();
      }
    }
    // Si nada de lo anterior aplica, devolvemos un mensaje genérico para no dejar el texto vacío.
    return "Intenta nuevamente en unos segundos.";
  }

  function handleCreateClick() {
    setCreateOpen(true);
  }

  function handleCloseCreateDialog() {
    setCreateOpen(false);
  }

  async function handleCreateSuccess() {
    setPage(1);
    setReloadKey((value) => value + 1);
  }

  // Abre el modal de edicion con el ambiente escogido.
  const handleEdit = useCallback(
    (row: EnvironmentRow) => {
      const enrichedRow = { ...row } as Record<string, unknown>;

      if (
        typeof enrichedRow.bloque_id !== "number" ||
        Number.isNaN(enrichedRow.bloque_id)
      ) {
        const matchedBlockId = guessBlockIdFromRow(row);
        if (typeof matchedBlockId === "number") {
          enrichedRow.bloque_id = matchedBlockId;
        }
      }

      if (
        typeof enrichedRow.tipo_ambiente_id !== "number" ||
        Number.isNaN(enrichedRow.tipo_ambiente_id)
      ) {
        const matchedTypeId = guessTypeIdFromRow(row);
        if (typeof matchedTypeId === "number") {
          enrichedRow.tipo_ambiente_id = matchedTypeId;
        }
      }

      setEditingEnvironment(enrichedRow as EnvironmentRow);
      setEditOpen(true);
    },
    [guessBlockIdFromRow, guessTypeIdFromRow]
  );

  // Abre el dialogo de confirmacion con el ambiente seleccionado.
  const handleDelete = useCallback((row: EnvironmentRow) => {
    // Guardamos el ambiente completo que la persona eligio para poder mostrar sus datos en el modal.
    setEnvironmentToDelete(row);
    // Activamos la vista del dialogo de confirmacion para que la persona revise su decision.
    setDeleteOpen(true);
  }, []);

  // Restablece los estados relacionados al dialogo de eliminación.
  function resetDeleteDialog() {
    // Cerramos el dialogo para ocultar la interfaz de confirmación.
    setDeleteOpen(false);
    // Limpiamos el ambiente seleccionado para no mantener referencias innecesarias en memoria.
    setEnvironmentToDelete(null);
  }

  // Permite cerrar el dialogo sólo cuando no hay una petición en curso.
  function handleDeleteDialogClose() {
    // Si estamos eliminando, bloqueamos el cierre para evitar estados inciertos.
    if (deleting) {
      return;
    }
    // Si no hay eliminación activa restablecemos el estado como de costumbre.
    resetDeleteDialog();
  }

  // Ejecuta el llamado real a la API para eliminar el ambiente.
  const confirmDelete = useCallback(async () => {
    // Si por alguna razon no hay un ambiente seleccionado, salimos temprano porque no podemos continuar.
    if (!environmentToDelete) {
      return;
    }

    // Generamos la etiqueta amigable que usaremos en las notificaciones de feedback.
    const labelForNotification = formatEnvironmentLabel(environmentToDelete);

    try {
      // Marcamos que la eliminacion esta en curso para deshabilitar botones y dobles clics.
      setDeleting(true);
      // Invocamos al backend usando el puerto centralizado apiFetch con el metodo DELETE.
      await apiFetch(`/ambientes/${environmentToDelete.id}`, { method: "DELETE" });

      // En caso de exito avisamos a la persona usuaria con el nombre o codigo del ambiente eliminado.
      notify.success({
        title: "Ambiente eliminado",
        description:
          labelForNotification?.length
            ? `${labelForNotification} se elimino correctamente.`
            : "Se elimino correctamente el ambiente.",
      });

      // Forzamos la recarga de la tabla para que se refleje la remocion.
      setReloadKey((value) => value + 1);
      // Cerramos el dialogo y limpiamos las referencias seleccionadas.
      resetDeleteDialog();
    } catch (error) {
      // Si ocurre un error mostramos una notificacion clara con el detalle devuelto por la API.
      notify.error({
        title: "No se pudo eliminar el ambiente",
        description: resolveDeleteErrorMessage(error),
      });
    } finally {
      // Sin importar el resultado regresamos el estado deleting a false para reactivar los controles.
      setDeleting(false);
    }
  }, [environmentToDelete, resetDeleteDialog]);
const columns = useMemo(
    () => environmentColumns(handleEdit, handleDelete),
    [handleDelete, handleEdit]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ambientes</h1>

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

        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
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

          <div className="grid gap-4 sm:grid-cols-2">
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
        columns={columns}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="max-h-[90vh] w-full max-w-5xl overflow-hidden p-0 sm:max-w-5xl"
          showCloseButton={false}
        >
          <div className="flex max-h-[90vh] flex-col bg-background">
            <div className="flex items-center justify-between border-b px-6 py-2">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle>Registrar ambiente</DialogTitle>
              </DialogHeader>
              <DialogClose
                type="button"
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={handleCloseCreateDialog}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </DialogClose>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              <EnvironmentCreateForm
                blocks={blockOptionsForForm}
                environmentTypes={environmentTypeOptionsForForm}
                onSuccess={handleCreateSuccess}
                onClose={handleCloseCreateDialog}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EnvironmentEditDialog
        open={editOpen}
        environment={editingEnvironment}
        blocks={blockOptionsForForm}
        environmentTypes={environmentTypeOptionsForForm}
        onClose={() => {
          setEditOpen(false);
          setEditingEnvironment(null);
        }}
        onSuccess={() => {
          setReloadKey((value) => value + 1);
        }}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(value) => {
          if (!value) {
            handleDeleteDialogClose();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-full space-y-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Eliminar ambiente</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el registro seleccionado. Los activos
              asociados quedaran sin ambiente hasta que los reasignes.
            </DialogDescription>
          </DialogHeader>

          {environmentToDelete ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-3">
              <p className="text-sm font-semibold">
                {environmentToDelete.nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                Código:{" "}
                <span className="font-mono">
                  {environmentToDelete.codigo}
                </span>
              </p>
            </div>
          ) : null}

          <div className="text-sm text-muted-foreground">
            Recuerda que esta operación no se puede deshacer y solo debe
            realizarse cuando estés segura de que el ambiente ya no se
            utilizará.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteDialogClose}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
