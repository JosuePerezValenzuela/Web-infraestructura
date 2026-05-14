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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { EnvironmentAssetsDialog } from "@/features/environments/list/EnvironmentAssetsDialog";
import { EnvironmentSchedulesDialog } from "@/features/environments/list/EnvironmentSchedulesDialog";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Table as ReactTableInstance } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
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

  return (
    items

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

      .filter((option): option is FilterOption => Boolean(option))
  );
}

type FilterOption = {
  value: string;
  label: string;
};

function EnvironmentListPageContent() {
  // Guardamos las filas que alimentaran la tabla principal.

  const [items, setItems] = useState<EnvironmentRow[]>([]);

  // Mantenemos la pagina actual que la persona esta observando.

  const [page, setPage] = useState(1);

  // Almacenamos el total de paginas disponible.

  const [pages, setPages] = useState(1);

  // Almacenamos el total de registros para la paginacion.

  const [total, setTotal] = useState<number | null>(null);

  // Almacenamos el take (registros por pagina) para la paginacion.

  const [take, setTake] = useState(TAKE);

  // Conservamos el texto que la persona escribe en el buscador.

  const [search, setSearch] = useState("");

  // Guardamos la version aplicada del buscador para no disparar consultas en cada pulsacion.

  const [appliedSearch, setAppliedSearch] = useState("");

  // Leer query params de la URL para inicializar filtros
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => {
    const tipoAmbienteId = searchParams.get("tipoAmbienteId") || "";
    const bloqueId = searchParams.get("bloqueId") || "";
    const facultadId = searchParams.get("facultadId") || "";
    const activo = searchParams.get("activo") || "";
    const clases = searchParams.get("clases") || "";
    const pisoMin = searchParams.get("pisoMin") || "";
    const pisoMax = searchParams.get("pisoMax") || "";
    return { tipoAmbienteId, bloqueId, facultadId, activo, clases, pisoMin, pisoMax };
  });

  // Este estado traduce los filtros confirmados hacia la API.

  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(filters);

  // Función para sincronizar filtros con URL y appliedFilters
  const syncFiltersToUrl = useCallback((currentFilters: FilterState, currentSearch: string) => {
    setAppliedFilters(currentFilters);
    setAppliedSearch(currentSearch);
    setPage(1);
    
    const params = new URLSearchParams();
    const normalizedSearch = currentSearch.trim();
    if (normalizedSearch) params.set("search", normalizedSearch);
    if (currentFilters.tipoAmbienteId) params.set("tipoAmbienteId", currentFilters.tipoAmbienteId);
    if (currentFilters.bloqueId) params.set("bloqueId", currentFilters.bloqueId);
    if (currentFilters.facultadId) params.set("facultadId", currentFilters.facultadId);
    if (currentFilters.activo) params.set("activo", currentFilters.activo);
    if (currentFilters.clases) params.set("clases", currentFilters.clases);
    if (currentFilters.pisoMin) params.set("pisoMin", currentFilters.pisoMin);
    if (currentFilters.pisoMax) params.set("pisoMax", currentFilters.pisoMax);
    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : "/dashboard/ambientes/list");
  }, [router]);

  // Debounce para el search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      syncFiltersToUrl(filters, search);
    }, 500);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, filters]);

  // Catálogos para filtros (incluyen registros inactivos).

  const [filterCatalogs, setFilterCatalogs] = useState<{
    blocks: FilterOption[];

    environmentTypes: FilterOption[];

    faculties: FilterOption[];
  }>({
    blocks: [],

    environmentTypes: [],

    faculties: [],
  });

  // Catálogos activos para formularios de crear/editar.

  const [activeCatalogs, setActiveCatalogs] = useState<{
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

  // Controla la apertura del modal para asociar activos.

  const [assetsOpen, setAssetsOpen] = useState(false);
  // Conserva el ambiente sobre el que se asociaran activos.
  const [environmentForAssets, setEnvironmentForAssets] =
    useState<EnvironmentRow | null>(null);
  // Controla la apertura del modal de horarios.
  const [schedulesOpen, setSchedulesOpen] = useState(false);
  // Conserva el ambiente sobre el que se gestionaran horarios.
  const [environmentForSchedules, setEnvironmentForSchedules] =
    useState<EnvironmentRow | null>(null);

  const blockOptionsForForm = useMemo<CatalogSelectOption[]>(() => {
    return activeCatalogs.blocks

      .map((option) => {
        const id = Number(option.value);

        if (Number.isNaN(id)) {
          return null;
        }

        return { id, nombre: option.label };
      })

      .filter((option): option is CatalogSelectOption => option !== null);
  }, [activeCatalogs.blocks]);

  const environmentTypeOptionsForForm = useMemo<CatalogSelectOption[]>(() => {
    return activeCatalogs.environmentTypes

      .map((option) => {
        const id = Number(option.value);

        if (Number.isNaN(id)) {
          return null;
        }

        return { id, nombre: option.label };
      })

      .filter((option): option is CatalogSelectOption => option !== null);
  }, [activeCatalogs.environmentTypes]);

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
        directKeys: ["bloque", "bloque_nombre", "bloqueNombre", "bloque_label"],

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
    let mounted = true;
    const controller = new AbortController();

    async function loadCatalogs() {
      try {
        setLoadingCatalogs(true);

        const [
          blocksAllResponse,
          blocksActiveResponse,
          environmentTypesAllResponse,
          environmentTypesActiveResponse,
          facultiesAllResponse,
          facultiesActiveResponse,
        ] = await Promise.all([
          apiFetch<CatalogResponse>("/bloques?page=1&limit=100", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>("/bloques?page=1&limit=100&activo=true", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>("/tipo_ambientes?page=1&limit=50", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>(
            "/tipo_ambientes?page=1&limit=50&activo=true",
            { signal: controller.signal }
          ),
          apiFetch<CatalogResponse>("/facultades?page=1&limit=100", {
            signal: controller.signal,
          }),
          apiFetch<CatalogResponse>("/facultades?page=1&limit=100&activo=true", {
            signal: controller.signal,
          }),
        ]);

        if (!mounted) return;

        setFilterCatalogs({
          blocks: normalizeCatalogOptions(blocksAllResponse.items, "Bloque"),
          environmentTypes: normalizeCatalogOptions(
            environmentTypesAllResponse.items,
            "Tipo de ambiente"
          ),
          faculties: normalizeCatalogOptions(
            facultiesAllResponse.items,
            "Facultad"
          ),
        });

        setActiveCatalogs({
          blocks: normalizeCatalogOptions(
            blocksActiveResponse.items,
            "Bloque"
          ),
          environmentTypes: normalizeCatalogOptions(
            environmentTypesActiveResponse.items,
            "Tipo de ambiente"
          ),
          faculties: normalizeCatalogOptions(
            facultiesActiveResponse.items,
            "Facultad"
          ),
        });
      } catch (error) {
        if (!mounted) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        notify.error({
          title: "No pudimos cargar los filtros",
          description: "Intenta nuevamente en unos segundos.",
        });
      } finally {
        if (mounted) {
          setLoadingCatalogs(false);
        }
      }
    }

    loadCatalogs();
    return () => {
      mounted = false;
      controller.abort("Component unmounted");
    };
  }, []);

  // Refetch blocks when faculty filter changes
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadBlocksByFaculty() {
      try {
        if (!filters.facultadId) {
          const response = await apiFetch<CatalogResponse>(
            `/bloques?page=1&limit=100`,
            { signal: controller.signal }
          );
          if (!mounted) return;
          const items = (response.items ?? []).map((item) => ({
            value: String(item.id),
            label: String(item.nombre ?? item.codigo ?? item.id),
          }));
          setFilterCatalogs((prev) => ({ ...prev, blocks: items }));
          return;
        }

        const response = await apiFetch<CatalogResponse>(
          `/bloques?page=1&limit=100&facultadId=${filters.facultadId}`,
          { signal: controller.signal }
        );
        if (!mounted) return;
        const items = (response.items ?? []).map((item) => ({
          value: String(item.id),
          label: String(item.nombre ?? item.codigo ?? item.id),
        }));
        setFilterCatalogs((prev) => ({ ...prev, blocks: items }));
      } catch {
        // Silently ignore errors from cleanup
      }
    }

    loadBlocksByFaculty();
    return () => {
      mounted = false;
      controller.abort("Effect cleanup");
    };
  }, [filters.facultadId]);

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
    let mounted = true;
    const controller = new AbortController();

    async function loadEnvironments() {
      try {
        setLoadingTable(true);

        const data = await apiFetch<EnvironmentListResponse>(
          `/ambientes?${queryString}`,
          { signal: controller.signal }
        );

        if (!mounted) return;

        setItems(Array.isArray(data.items) ? data.items : []);

        const totalFromMeta =
          typeof data.meta?.total === "number" ? data.meta.total : null;

        setTotal(totalFromMeta);

        const takeFromMeta =
          typeof data.meta?.take === "number" && data.meta.take > 0
            ? data.meta.take
            : TAKE;

        setTake(takeFromMeta);

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

        if (typeof data.meta?.page === "number") {
          setPage(data.meta.page);
        }
      } catch (error) {
        if (!mounted) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        notify.error({
          title: "No pudimos cargar los ambientes",
          description: "Revisa tu conexion o ajusta los filtros.",
        });
      } finally {
        if (mounted) {
          setLoadingTable(false);
        }
      }
    }

    loadEnvironments();
    return () => {
      mounted = false;
      controller.abort("Effect cleanup");
    };
  }, [queryString, reloadKey]);

  // Aplica los filtros visibles y evita que el formulario recargue la pagina.

  function handleApplyFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    syncFiltersToUrl(filters, search);
  }

  // Limpia todos los filtros y regresa la tabla a su estado inicial.

  function handleResetFilters() {
    setFilters(INITIAL_FILTERS);
    setSearch("");
    router.push("/dashboard/ambientes/list");
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
      typeof shortCandidateRaw === "string" ? shortCandidateRaw.trim() : "";

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

  // Abre el modal de activos para el ambiente seleccionado.
  const handleAssociateAssets = useCallback((row: EnvironmentRow) => {
    setEnvironmentForAssets(row);
    setAssetsOpen(true);
  }, []);
  // Abre el modal para asignar horarios del ambiente seleccionado.
  const handleAssignSchedules = useCallback((row: EnvironmentRow) => {
    setEnvironmentForSchedules(row);
    setSchedulesOpen(true);
  }, []);
  // Navega a la pagina de detalles del ambiente.
  const handleViewDetails = useCallback((row: EnvironmentRow) => {
    router.push(`/dashboard/ambientes/${row.id}`);
  }, [router]);

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

      await apiFetch(`/ambientes/${environmentToDelete.id}`, {
        method: "DELETE",
      });

      // En caso de exito avisamos a la persona usuaria con el nombre o codigo del ambiente eliminado.

      notify.success({
        title: "Ambiente eliminado",

        description: labelForNotification?.length
          ? `${labelForNotification} se elimino correctamente.`
          : "Se elimino correctamente el ambiente.",
      });

      // Forzamos la recarga de la tabla para que se refleje la remocion.

      setReloadKey((value) => value + 1);

      // Cerramos el dialogo y limpiamos las referencias seleccionadas.

      resetDeleteDialog();
    } catch (error) {
      // Cerrar el diálogo de confirmación
      resetDeleteDialog();

      const apiError = error as { status?: number; message?: string };

      if (apiError?.status === 404) {
        notify.error({
          title: "Ambiente no encontrado",
          description: "El ambiente no existe o ya fue eliminado.",
        });
      } else {
        notify.error({
          title: "No se pudo eliminar el ambiente",
          description: resolveDeleteErrorMessage(error),
        });
      }
    } finally {
      // Sin importar el resultado regresamos el estado deleting a false para reactivar los controles.

      setDeleting(false);
    }
  }, [environmentToDelete, resetDeleteDialog]);

  // Cierra el modal de asociar activos y limpia el ambiente seleccionado.

  function handleCloseAssetsDialog() {
    setAssetsOpen(false);

    setEnvironmentForAssets(null);
  }

  // Refresca la tabla despues de asociar activos y cierra el modal correspondiente.

  function handleAssetsSuccess() {
    setReloadKey((value) => value + 1);

    handleCloseAssetsDialog();
  }

  // Cierra el modal de horarios y limpia el ambiente seleccionado.

  function handleCloseSchedulesDialog() {
    setSchedulesOpen(false);

    setEnvironmentForSchedules(null);
  }

  // Refresca la tabla luego de guardar horarios y cierra el modal.

  function handleSchedulesSuccess() {
    setReloadKey((value) => value + 1);

    handleCloseSchedulesDialog();
  }

  const columns = useMemo(
    () =>
      environmentColumns(
        handleEdit,
        handleDelete,
        handleAssociateAssets,
        handleAssignSchedules,
        handleViewDetails
      ),

    [handleAssignSchedules, handleAssociateAssets, handleDelete, handleEdit, handleViewDetails]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Ambientes</h1>

<form
        onSubmit={handleApplyFilters}
        className="space-y-3 rounded-lg border bg-card p-3 shadow-sm"
        noValidate
      >
        {/* Fila 1: Buscador + Filtros principales */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="environment-search">Buscar por</Label>
            <Input
              id="environment-search"
              aria-label="Buscar ambientes"
              placeholder="Nombre o código..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <SearchableSelect
            id="faculty-filter"
            label="Facultad"
            searchPlaceholder="Escribe para filtrar facultades"
            emptyLabel="Sin resultados"
            allLabel="Todas"
            value={filters.facultadId}
            onChange={(value) => {
              const newFilters = { ...filters, facultadId: value };
              setFilters(newFilters);
              syncFiltersToUrl(newFilters, debouncedSearch);
            }}
            options={filterCatalogs.faculties}
            loading={loadingCatalogs}
          />

          <SearchableSelect
            id="block-filter"
            label="Bloque"
            searchPlaceholder="Busca por nombre o código"
            emptyLabel="Sin resultados"
            allLabel="Todos"
            value={filters.bloqueId}
            onChange={(value) => {
              const newFilters = { ...filters, bloqueId: value };
              setFilters(newFilters);
              syncFiltersToUrl(newFilters, debouncedSearch);
            }}
            options={filterCatalogs.blocks}
            loading={loadingCatalogs}
          />

          <SearchableSelect
            id="environment-type-filter"
            label="Tipo de ambiente"
            searchPlaceholder="Escribe para filtrar tipos"
            emptyLabel="Sin resultados"
            allLabel="Todos"
            value={filters.tipoAmbienteId}
            onChange={(value) => {
              const newFilters = { ...filters, tipoAmbienteId: value };
              setFilters(newFilters);
              syncFiltersToUrl(newFilters, debouncedSearch);
            }}
            options={filterCatalogs.environmentTypes}
            loading={loadingCatalogs}
          />
        </div>

        {/* Fila 2: Filtros secundarios + Acciones */}
        <div className="flex flex-wrap items-end gap-2">
          {/* Piso Min */}
          <div className="w-20">
            <Label htmlFor="floor-min">Piso min</Label>
            <Input
              id="floor-min"
              aria-label="Piso mínimo"
              type="number"
              placeholder="Min"
              value={filters.pisoMin}
              onChange={(event) => {
                const newFilters = { ...filters, pisoMin: event.target.value };
                setFilters(newFilters);
                syncFiltersToUrl(newFilters, debouncedSearch);
              }}
            />
          </div>

          {/* Piso Max */}
          <div className="w-20">
            <Label htmlFor="floor-max">Piso max</Label>
            <Input
              id="floor-max"
              aria-label="Piso máximo"
              type="number"
              placeholder="Max"
              value={filters.pisoMax}
              onChange={(event) => {
                const newFilters = { ...filters, pisoMax: event.target.value };
                setFilters(newFilters);
                syncFiltersToUrl(newFilters, debouncedSearch);
              }}
            />
          </div>

          {/* Uso académico */}
          <div className="w-[140px]">
            <Label htmlFor="classes-filter">Uso académico</Label>
            <Select
              value={filters.clases || ALL_VALUE}
              onValueChange={(value) => {
                const newFilters = { ...filters, clases: value === ALL_VALUE ? "" : value };
                setFilters(newFilters);
                syncFiltersToUrl(newFilters, debouncedSearch);
              }}
            >
              <SelectTrigger id="classes-filter" aria-label="Uso académico" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                <SelectItem value="true">Sí</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="w-[140px]">
            <Label htmlFor="status-filter">Estado</Label>
            <Select
              value={filters.activo || ALL_VALUE}
              onValueChange={(value) => {
                const newFilters = { ...filters, activo: value === ALL_VALUE ? "" : value };
                setFilters(newFilters);
                syncFiltersToUrl(newFilters, debouncedSearch);
              }}
            >
              <SelectTrigger id="status-filter" aria-label="Estado" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              disabled={loadingTable && !items.length}
            >
              Limpiar
            </Button>
            <Button type="button" onClick={handleCreateClick}>
              Nuevo
            </Button>
          </div>
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
        total={total ?? undefined}
        take={take}
        loading={loadingTable}
        onPageChange={setPage}
        showViewOptions={false}
        onTableReady={setTableInstance}
        emptyState={{
          title: "No encontramos ambientes con esos filtros",

          description: "Prueba con otros criterios o restablece la busqueda.",

          action: (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
            >
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

      <EnvironmentAssetsDialog
        open={assetsOpen}
        environment={environmentForAssets}
        onClose={handleCloseAssetsDialog}
        onSuccess={handleAssetsSuccess}
      />

      <EnvironmentSchedulesDialog
        open={schedulesOpen}
        environment={environmentForSchedules}
        onClose={handleCloseSchedulesDialog}
        onSuccess={handleSchedulesSuccess}
      />

      {/* Diálogo de confirmación para eliminar (AlertDialog) */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(value) => {
          if (!value) handleDeleteDialogClose();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ambiente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el ambiente, sus horarios
              de operación y desvinculará los activos que tenga asignados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {environmentToDelete ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-3">
              <p className="text-sm font-semibold">
                {environmentToDelete.nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                Código:{" "}
                <span className="font-mono">{environmentToDelete.codigo}</span>
              </p>
            </div>
          ) : null}

          <div className="text-sm text-muted-foreground">
            Recuerda que esta operación no se puede deshacer. Los activos
            desvinculados quedarán sin ambiente asignado hasta que los
            reubiques.
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={handleDeleteDialogClose}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function EnvironmentListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Cargando ambientes...</div>}>
      <EnvironmentListPageContent />
    </Suspense>
  );
}
