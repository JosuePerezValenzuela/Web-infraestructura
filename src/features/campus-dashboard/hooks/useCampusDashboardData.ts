import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import {
  campusDashboardDetailResponseSchema,
  campusDashboardFiltersSchema,
  campusDashboardGlobalResponseSchema,
  type CampusDashboardDetailResponse,
  type CampusDashboardFilters,
  type CampusDashboardGlobalResponse,
} from "@/features/campus-dashboard/schema";

type Mode = "global" | "detail";

type UseCampusDashboardDataParams =
  | { mode: "global"; filters: CampusDashboardFilters }
  | { mode: "detail"; campusId: number; filters: CampusDashboardFilters };

type UseCampusDashboardDataResult = {
  data: CampusDashboardGlobalResponse | CampusDashboardDetailResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useCampusDashboardData(
  params: UseCampusDashboardDataParams
): UseCampusDashboardDataResult {
  const [data, setData] = useState<
    CampusDashboardGlobalResponse | CampusDashboardDetailResponse | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    if (params.mode === "global") {
      const parsedFilters = campusDashboardFiltersSchema.parse(params.filters);
      const search = new URLSearchParams();
      if (parsedFilters.campusIds.length) {
        search.set("campusIds", parsedFilters.campusIds.join(","));
      }
      search.set("includeInactive", String(parsedFilters.includeInactive));
      const query = search.toString();
      return `/dashboards/campus/global${query ? `?${query}` : ""}`;
    }

    const parsedFilters = campusDashboardFiltersSchema.parse(params.filters);
    const search = new URLSearchParams();
    search.set("includeInactive", String(parsedFilters.includeInactive));
    const query = search.toString();
    return `/dashboards/campus/${params.campusId}${query ? `?${query}` : ""}`;
  }, [params]);

  const schema = useMemo(() => {
    return params.mode === "global"
      ? campusDashboardGlobalResponseSchema
      : campusDashboardDetailResponseSchema;
  }, [params.mode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(endpoint);
      const parsed = schema.parse(response);
      setData(parsed);
    } catch (err) {
      const message =
        (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
          ? (err as any).message
          : "No se pudo cargar el dashboard");
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
