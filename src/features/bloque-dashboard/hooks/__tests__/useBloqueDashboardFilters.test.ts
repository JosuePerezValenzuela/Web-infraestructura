import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBloqueDashboardFilters } from "@/features/bloque-dashboard/hooks/useBloqueDashboardFilters";

let currentPathname = "/dashboard/bloques";
let currentSearch = "";
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe("useBloqueDashboardFilters", () => {
  beforeEach(() => {
    currentPathname = "/dashboard/bloques";
    currentSearch = "";
    pushMock.mockClear();
  });

  it("expone defaults cuando la URL no tiene query params", () => {
    const { result } = renderHook(() => useBloqueDashboardFilters());

    expect(result.current.filters.campusIds).toEqual([]);
    expect(result.current.filters.facultadIds).toEqual([]);
    expect(result.current.filters.bloqueIds).toEqual([]);
    expect(result.current.filters.tipoBloqueIds).toEqual([]);
    expect(result.current.filters.includeInactive).toBe(true);
    expect(result.current.filters.slotMinutes).toBe(45);
    expect(result.current.filters.dias).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("parsea correctamente query params validos", () => {
    currentSearch =
      "campusIds=1,2&facultadIds=10&bloqueIds=100&tipoBloqueIds=3&includeInactive=0&slotMinutes=60&dias=1,2,4";

    const { result } = renderHook(() => useBloqueDashboardFilters());

    expect(result.current.filters.campusIds).toEqual([1, 2]);
    expect(result.current.filters.facultadIds).toEqual([10]);
    expect(result.current.filters.bloqueIds).toEqual([100]);
    expect(result.current.filters.tipoBloqueIds).toEqual([3]);
    expect(result.current.filters.includeInactive).toBe(false);
    expect(result.current.filters.slotMinutes).toBe(60);
    expect(result.current.filters.dias).toEqual([1, 2, 4]);
  });

  it("actualiza filtros y empuja URL con query string correcta", () => {
    const { result } = renderHook(() => useBloqueDashboardFilters());

    act(() => {
      result.current.setCampusIds([1]);
    });

    expect(pushMock).toHaveBeenCalledWith(
      "/dashboard/bloques?campusIds=1&includeInactive=true&slotMinutes=45&dias=0%2C1%2C2%2C3%2C4%2C5%2C6"
    );

    act(() => {
      result.current.setFacultadIds([10]);
    });

    expect(pushMock).toHaveBeenLastCalledWith(
      "/dashboard/bloques?facultadIds=10&includeInactive=true&slotMinutes=45&dias=0%2C1%2C2%2C3%2C4%2C5%2C6"
    );

    act(() => {
      result.current.setBloqueIds([100]);
    });

    expect(pushMock).toHaveBeenLastCalledWith(
      "/dashboard/bloques?bloqueIds=100&includeInactive=true&slotMinutes=45&dias=0%2C1%2C2%2C3%2C4%2C5%2C6"
    );

    act(() => {
      result.current.setTipoBloqueIds([3]);
    });

    expect(pushMock).toHaveBeenLastCalledWith(
      "/dashboard/bloques?tipoBloqueIds=3&includeInactive=true&slotMinutes=45&dias=0%2C1%2C2%2C3%2C4%2C5%2C6"
    );
  });
});
