import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CampusDashboardFilters } from "@/features/campus-dashboard/schema";

function parseSearchParams(): CampusDashboardFilters {
  // Siempre incluimos inactivos según requerimiento.
  // Ignoramos campusIds ya que se quitó el select.
  return { includeInactive: true, campusIds: [] };
}

function buildSearchString(): string {
  const params = new URLSearchParams();

  // Forzamos includeInactive=true
  params.set("includeInactive", "true");

  const query = params.toString();
  return query.length ? `?${query}` : "";
}

export function useCampusDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseSearchParams(),
    []
  );

  const pushWithFilters = useCallback(
    () => {
      const query = buildSearchString();
      router.push(`${pathname}${query}`);
    },
    [pathname, router]
  );

  const setIncludeInactive = useCallback(
    () => {
      pushWithFilters();
    },
    [pushWithFilters]
  );

  const setCampusIds = useCallback(
    () => {
      pushWithFilters();
    },
    [pushWithFilters]
  );

  const buildDetailHref = useCallback(
    (campusId: number) => {
      // Al navegar al detalle, mantenemos el includeInactive=true
      const query = "?includeInactive=true";
      return `/dashboard/campus/${campusId}${query}`;
    },
    []
  );

  const buildGlobalHref = useCallback(() => {
    const query = "?includeInactive=true";
    return `/dashboard/campus${query}`;
  }, []);

  return {
    filters,
    setIncludeInactive,
    setCampusIds,
    buildDetailHref,
    buildGlobalHref,
  };
}
