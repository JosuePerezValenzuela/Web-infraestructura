import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useFacultadDashboardFilters } from "@/features/facultad-dashboard/hooks/useFacultadDashboardFilters";

let currentPathname = "/dashboard/facultades";
let currentSearch = "";
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe("useFacultadDashboardFilters", () => {
  beforeEach(() => {
    currentPathname = "/dashboard/facultades";
    currentSearch = "";
    pushMock.mockClear();
  });

  it("expone defaults cuando la URL no tiene query params", () => {
    const { result } = renderHook(() => useFacultadDashboardFilters());

    expect(result.current.filters.campusIds).toEqual([]);
    expect(result.current.filters.facultadIds).toEqual([]);
    expect(result.current.filters.includeInactive).toBe(true);
    expect(result.current.filters.slotMinutes).toBe(45);
    expect(result.current.filters.dias).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("parsea correctamente query params válidos", () => {
    currentSearch =
      "campusIds=1,2&facultadIds=10,11&includeInactive=0&slotMinutes=60&dias=1,2,5";

    const { result } = renderHook(() => useFacultadDashboardFilters());

    expect(result.current.filters.campusIds).toEqual([1, 2]);
    expect(result.current.filters.facultadIds).toEqual([10, 11]);
    expect(result.current.filters.includeInactive).toBe(false);
    expect(result.current.filters.slotMinutes).toBe(60);
    expect(result.current.filters.dias).toEqual([1, 2, 5]);
  });

  it("setIncludeInactive empuja nueva URL preservando resto de filtros", () => {
    currentSearch = "campusIds=2&slotMinutes=30&dias=1,2,3";

    const { result } = renderHook(() => useFacultadDashboardFilters());

    act(() => {
      result.current.setIncludeInactive(false);
    });

    expect(pushMock).toHaveBeenCalledWith(
      "/dashboard/facultades?campusIds=2&includeInactive=false&slotMinutes=30&dias=1%2C2%2C3"
    );
  });

  it("setCampusIds y setFacultadIds actualizan la URL", () => {
    const { result } = renderHook(() => useFacultadDashboardFilters());

    act(() => {
      result.current.setCampusIds([1, 3]);
    });
    expect(pushMock).toHaveBeenCalledWith(
      "/dashboard/facultades?campusIds=1%2C3&includeInactive=true&slotMinutes=45&dias=0%2C1%2C2%2C3%2C4%2C5%2C6"
    );

    act(() => {
      result.current.setFacultadIds([10]);
    });
    expect(pushMock).toHaveBeenLastCalledWith(
      "/dashboard/facultades?facultadIds=10&includeInactive=true&slotMinutes=45&dias=0%2C1%2C2%2C3%2C4%2C5%2C6"
    );
  });

  it("setSlotMinutes y setDias actualizan la URL", () => {
    const { result } = renderHook(() => useFacultadDashboardFilters());

    act(() => {
      result.current.setSlotMinutes(15);
    });
    expect(pushMock).toHaveBeenCalledWith(
      "/dashboard/facultades?includeInactive=true&slotMinutes=15&dias=0%2C1%2C2%2C3%2C4%2C5%2C6"
    );

    act(() => {
      result.current.setDias([1, 3, 5]);
    });
    expect(pushMock).toHaveBeenLastCalledWith(
      "/dashboard/facultades?includeInactive=true&slotMinutes=45&dias=1%2C3%2C5"
    );
  });

  it("buildDetailHref y buildGlobalHref conservan filtros", () => {
    currentSearch = "includeInactive=false&slotMinutes=60&dias=1,2,5&campusIds=9";

    const { result } = renderHook(() => useFacultadDashboardFilters());

    expect(result.current.buildDetailHref(22)).toBe(
      "/dashboard/facultades/22?campusIds=9&includeInactive=false&slotMinutes=60&dias=1%2C2%2C5"
    );

    expect(result.current.buildGlobalHref()).toBe(
      "/dashboard/facultades?campusIds=9&includeInactive=false&slotMinutes=60&dias=1%2C2%2C5"
    );
  });
});
