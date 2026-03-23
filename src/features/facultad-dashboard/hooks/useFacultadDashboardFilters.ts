import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  facultadDashboardFiltersSchema,
  type FacultadDashboardFilters,
} from "@/features/facultad-dashboard/schema";

function parseNumberCsv(value: string | null): number[] {
  if (!value || !value.trim().length) return [];
  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parseDaysCsv(value: string | null): number[] {
  if (!value || !value.trim().length) return [0, 1, 2, 3, 4, 5];
  const parsed = value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 5);
  return parsed.length ? parsed : [0, 1, 2, 3, 4, 5];
}

function parseSlotMinutes(value: string | null): 15 | 30 | 45 | 60 | 90 {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (parsed === 15 || parsed === 30 || parsed === 45 || parsed === 60 || parsed === 90) {
    return parsed;
  }
  return 45;
}

function parseSearchParams(searchParams: URLSearchParams): FacultadDashboardFilters {
  const includeInactiveParam = searchParams.get("includeInactive");
  const includeInactive =
    includeInactiveParam === null
      ? true
      : includeInactiveParam === "true" || includeInactiveParam === "1";

  const raw = {
    campusIds: parseNumberCsv(searchParams.get("campusIds")),
    facultadIds: parseNumberCsv(searchParams.get("facultadIds")),
    includeInactive,
    slotMinutes: parseSlotMinutes(searchParams.get("slotMinutes")),
    dias: parseDaysCsv(searchParams.get("dias")),
  };

  return facultadDashboardFiltersSchema.parse(raw);
}

function buildSearchString(filters: FacultadDashboardFilters): string {
  const params = new URLSearchParams();

  if (filters.campusIds.length) {
    params.set("campusIds", filters.campusIds.join(","));
  }

  if (filters.facultadIds.length) {
    params.set("facultadIds", filters.facultadIds.join(","));
  }

  params.set("includeInactive", String(filters.includeInactive));

  const query = params.toString();
  return query.length ? `?${query}` : "";
}

export function useFacultadDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams]
  );

  const pushWithFilters = useCallback(
    (nextFilters: FacultadDashboardFilters) => {
      const parsed = facultadDashboardFiltersSchema.parse(nextFilters);
      const query = buildSearchString(parsed);
      router.push(`${pathname}${query}`);
    },
    [pathname, router]
  );

  const setIncludeInactive = useCallback(
    (value: boolean) => {
      pushWithFilters({ ...filters, includeInactive: value });
    },
    [filters, pushWithFilters]
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

  const buildDetailHref = useCallback(
    (facultadId: number) => {
      const query = buildSearchString(filters);
      return `/dashboard/facultades/${facultadId}${query}`;
    },
    [filters]
  );

  const buildGlobalHref = useCallback(() => {
    const query = buildSearchString(filters);
    return `/dashboard/facultades${query}`;
  }, [filters]);

  return {
    filters,
    setIncludeInactive,
    setCampusIds,
    setFacultadIds,
    buildDetailHref,
    buildGlobalHref,
  };
}
