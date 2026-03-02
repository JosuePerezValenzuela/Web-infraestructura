import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import {
  facultadDashboardDetailResponseSchema,
  facultadDashboardFiltersSchema,
  facultadDashboardGlobalResponseSchema,
  type FacultadDashboardDetailResponse,
  type FacultadDashboardFilters,
  type FacultadDashboardGlobalResponse,
} from "@/features/facultad-dashboard/schema";

type UseFacultadDashboardDataParams =
  | { mode: "global"; filters: FacultadDashboardFilters }
  | { mode: "detail"; facultadId: number; filters: FacultadDashboardFilters };

type UseFacultadDashboardDataResult = {
  data: FacultadDashboardGlobalResponse | FacultadDashboardDetailResponse | null;
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

export function useFacultadDashboardData(
  params: UseFacultadDashboardDataParams
): UseFacultadDashboardDataResult {
  const [data, setData] = useState<
    FacultadDashboardGlobalResponse | FacultadDashboardDetailResponse | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    const parsedFilters = facultadDashboardFiltersSchema.parse(params.filters);
    const search = new URLSearchParams();

    if (params.mode === "global") {
      if (parsedFilters.campusIds.length) {
        search.set("campusIds", parsedFilters.campusIds.join(","));
      }
      if (parsedFilters.facultadIds.length) {
        search.set("facultadIds", parsedFilters.facultadIds.join(","));
      }
      search.set("includeInactive", String(parsedFilters.includeInactive));
      search.set("slotMinutes", String(parsedFilters.slotMinutes));
      search.set("dias", parsedFilters.dias.join(","));
      const query = search.toString();
      return `/dashboards/facultades/global${query ? `?${query}` : ""}`;
    }

    search.set("includeInactive", String(parsedFilters.includeInactive));
    search.set("slotMinutes", String(parsedFilters.slotMinutes));
    search.set("dias", parsedFilters.dias.join(","));
    const query = search.toString();
    return `/dashboards/facultades/${params.facultadId}${query ? `?${query}` : ""}`;
  }, [params]);

  const schema = useMemo(() => {
    return params.mode === "global"
      ? facultadDashboardGlobalResponseSchema
      : facultadDashboardDetailResponseSchema;
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
