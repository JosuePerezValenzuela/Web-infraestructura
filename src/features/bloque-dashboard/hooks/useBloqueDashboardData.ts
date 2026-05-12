import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import {
  bloqueDashboardFiltersSchema,
  bloqueDashboardGlobalResponseSchema,
  bloqueDashboardDetailResponseSchema,
  type BloqueDashboardFilters,
  type BloqueDashboardGlobalResponse,
  type BloqueDashboardDetailResponse,
} from "@/features/bloque-dashboard/schema";

type UseBloqueDashboardDataParams =
  | { mode: "global"; filters: BloqueDashboardFilters }
  | { mode: "detail"; bloqueId: number; filters: BloqueDashboardFilters };

type UseBloqueDashboardDataResult = {
  data: BloqueDashboardGlobalResponse | BloqueDashboardDetailResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

function extractErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "No se pudo cargar el dashboard";
}

export function useBloqueDashboardData(
  params: UseBloqueDashboardDataParams
): UseBloqueDashboardDataResult {
  const [data, setData] = useState<
    BloqueDashboardGlobalResponse | BloqueDashboardDetailResponse | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    const parsedFilters = bloqueDashboardFiltersSchema.parse(params.filters);
    const search = new URLSearchParams();

    if (params.mode === "global") {
      if (parsedFilters.campusIds.length) {
        search.set("campusIds", parsedFilters.campusIds.join(","));
      }
      if (parsedFilters.facultadIds.length) {
        search.set("facultadIds", parsedFilters.facultadIds.join(","));
      }
      if (parsedFilters.bloqueIds.length) {
        search.set("bloqueIds", parsedFilters.bloqueIds.join(","));
      }
      if (parsedFilters.tipoBloqueIds.length) {
        search.set("tipoBloqueIds", parsedFilters.tipoBloqueIds.join(","));
      }
      search.set("includeInactive", String(parsedFilters.includeInactive));
      const query = search.toString();
      return `/dashboards/bloques/global${query ? `?${query}` : ""}`;
    }

    search.set("includeInactive", String(parsedFilters.includeInactive));
    const query = search.toString();
    return `/dashboards/bloques/${params.bloqueId}${query ? `?${query}` : ""}`;
  }, [params]);

  const schema = useMemo(() => {
    return params.mode === "global"
      ? bloqueDashboardGlobalResponseSchema
      : bloqueDashboardDetailResponseSchema;
  }, [params.mode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(endpoint);
      const parsed = schema.parse(response);
      setData(parsed);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      notify.error({
        title: "No se pudo cargar el dashboard",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return { data, loading, error, refetch: fetchData };
}