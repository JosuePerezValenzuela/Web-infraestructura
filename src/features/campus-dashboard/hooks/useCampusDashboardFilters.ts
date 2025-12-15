import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CampusDashboardFilters } from "@/features/campus-dashboard/schema";

function parseSearchParams(searchParams: URLSearchParams): CampusDashboardFilters {
  const includeInactiveParam = searchParams.get("includeInactive");
  const campusIdsParam = searchParams.get("campusIds");

  const includeInactive =
    includeInactiveParam === null
      ? true
      : includeInactiveParam === "true" || includeInactiveParam === "1";

  const campusIds =
    campusIdsParam && campusIdsParam.length
      ? campusIdsParam
          .split(",")
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [];

  return { includeInactive, campusIds };
}

function buildSearchString(filters: CampusDashboardFilters): string {
  const params = new URLSearchParams();

  if (filters.campusIds.length) {
    params.set("campusIds", filters.campusIds.join(","));
  }

  params.set("includeInactive", String(filters.includeInactive));

  const query = params.toString();
  return query.length ? `?${query}` : "";
}

export function useCampusDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams]
  );

  const pushWithFilters = useCallback(
    (nextFilters: CampusDashboardFilters) => {
      const query = buildSearchString(nextFilters);
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

  const buildDetailHref = useCallback(
    (campusId: number) => {
      const query = buildSearchString(filters);
      return `/dashboard/campus/${campusId}${query}`;
    },
    [filters]
  );

  const buildGlobalHref = useCallback(() => {
    const query = buildSearchString(filters);
    return `/dashboard/campus${query}`;
  }, [filters]);

  return {
    filters,
    setIncludeInactive,
    setCampusIds,
    buildDetailHref,
    buildGlobalHref,
  };
}
