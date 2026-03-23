import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  bloqueDashboardFiltersSchema,
  type BloqueDashboardFilters,
} from "@/features/bloque-dashboard/schema";

function parseNumberCsv(value: string | null): number[] {
  if (!value || !value.trim().length) return [];
  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parseSearchParams(searchParams: URLSearchParams): BloqueDashboardFilters {
  const includeInactiveParam = searchParams.get("includeInactive");

  const raw = {
    campusIds: parseNumberCsv(searchParams.get("campusIds")),
    facultadIds: parseNumberCsv(searchParams.get("facultadIds")),
    bloqueIds: parseNumberCsv(searchParams.get("bloqueIds")),
    tipoBloqueIds: parseNumberCsv(searchParams.get("tipoBloqueIds")),
    includeInactive:
      includeInactiveParam === null
        ? true
        : includeInactiveParam === "true" || includeInactiveParam === "1",
  };

  return bloqueDashboardFiltersSchema.parse(raw);
}

function buildSearchString(filters: BloqueDashboardFilters): string {
  const params = new URLSearchParams();

  if (filters.campusIds.length) {
    params.set("campusIds", filters.campusIds.join(","));
  }
  if (filters.facultadIds.length) {
    params.set("facultadIds", filters.facultadIds.join(","));
  }
  if (filters.bloqueIds.length) {
    params.set("bloqueIds", filters.bloqueIds.join(","));
  }
  if (filters.tipoBloqueIds.length) {
    params.set("tipoBloqueIds", filters.tipoBloqueIds.join(","));
  }

  params.set("includeInactive", String(filters.includeInactive));

  const query = params.toString();
  return query.length ? `?${query}` : "";
}

export function useBloqueDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  const pushWithFilters = useCallback(
    (nextFilters: BloqueDashboardFilters) => {
      const parsed = bloqueDashboardFiltersSchema.parse(nextFilters);
      const query = buildSearchString(parsed);
      router.push(`${pathname}${query}`);
    },
    [pathname, router]
  );

  const setCampusIds = useCallback(
    (campusIds: number[]) => {
      pushWithFilters({ ...filters, campusIds });
    },
    [filters, pushWithFilters]
  );

  const setFacultadIds = useCallback(
    (facultadIds: number[]) => {
      pushWithFilters({ ...filters, facultadIds });
    },
    [filters, pushWithFilters]
  );

  const setBloqueIds = useCallback(
    (bloqueIds: number[]) => {
      pushWithFilters({ ...filters, bloqueIds });
    },
    [filters, pushWithFilters]
  );

  const setTipoBloqueIds = useCallback(
    (tipoBloqueIds: number[]) => {
      pushWithFilters({ ...filters, tipoBloqueIds });
    },
    [filters, pushWithFilters]
  );

  const setIncludeInactive = useCallback(
    (includeInactive: boolean) => {
      pushWithFilters({ ...filters, includeInactive });
    },
    [filters, pushWithFilters]
  );

  const setFilters = useCallback(
    (nextFilters: BloqueDashboardFilters) => {
      pushWithFilters(nextFilters);
    },
    [pushWithFilters]
  );

  return {
    filters,
    setCampusIds,
    setFacultadIds,
    setBloqueIds,
    setTipoBloqueIds,
    setIncludeInactive,
    setFilters,
  };
}
