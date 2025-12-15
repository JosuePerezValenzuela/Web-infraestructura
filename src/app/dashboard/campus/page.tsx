"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useCampusDashboardFilters } from "@/features/campus-dashboard/hooks/useCampusDashboardFilters";
import { useCampusDashboardData } from "@/features/campus-dashboard/hooks/useCampusDashboardData";

type CampusOption = { id: number; nombre: string };
type DashboardRow = Record<string, unknown>;

function SwitchInactive({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Mostrar inactivos"
      onClick={() => onCheckedChange(!checked)}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition ${
        checked
          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
          : "border-muted-foreground/40 bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`flex h-4 w-7 items-center rounded-full transition ${
          checked ? "bg-emerald-500/80" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
      Mostrar inactivos
    </button>
  );
}

function CampusMultiSelect({
  options,
  selectedIds,
  onChange,
}: {
  options: CampusOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const summaryLabel =
    selectedIds.length === 0
      ? "Selecciona campus"
      : `${selectedIds.length} seleccionados`;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Campus"
        onClick={() => setOpen((value) => !value)}
        className="min-w-[200px] justify-between"
      >
        <span className="truncate">{summaryLabel}</span>
        <span aria-hidden className="text-xs text-muted-foreground">
          {open ? "Cerrar" : "Abrir"}
        </span>
      </Button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Listado de campus"
          className="absolute z-20 mt-2 w-64 max-w-full rounded-md border bg-popover p-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = selectedSet.has(option.id);
            return (
              <li key={option.id} className="p-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    const next = new Set(selectedSet);
                    if (isSelected) {
                      next.delete(option.id);
                    } else {
                      next.add(option.id);
                    }
                    onChange(Array.from(next));
                    setOpen(false);
                  }}
                >
                  <span
                    aria-hidden
                    className={`h-3 w-3 rounded-sm border ${
                      isSelected ? "bg-primary border-primary" : "border-muted"
                    }`}
                  />
                  {option.nombre}
                </button>
              </li>
            );
          })}
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No hay campus disponibles
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export default function CampusDashboardPage() {
  const router = useRouter();
  const { filters, setIncludeInactive, setCampusIds, buildDetailHref } =
    useCampusDashboardFilters();
  const { data, loading } = useCampusDashboardData({
    mode: "global",
    filters,
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);

  useEffect(() => {
    let active = true;
    async function loadCampus() {
      try {
        const response = await apiFetch<{
          items: CampusOption[];
        }>("/campus?page=1&limit=50");
        if (active) {
          setCampusOptions(response.items ?? []);
        }
      } catch {
        // Si falla el catálogo, continuamos con opciones derivadas de los datos.
      }
    }
    void loadCampus();
    return () => {
      active = false;
    };
  }, []);

  const rows: DashboardRow[] =
    data && data.layout.mode === "global" ? data.data.table.rows : [];

  const computedOptions = useMemo(() => {
    if (campusOptions.length) {
      return campusOptions;
    }
    const unique: Record<number, CampusOption> = {};
    rows.forEach((row) => {
      const id = Number(row.campusId ?? row.id ?? row.campus_id);
      const name =
        (row.campusName as string) ??
        (row.nombre as string) ??
        (row.name as string);
      if (Number.isFinite(id) && id > 0 && name) {
        unique[id] = { id, nombre: name };
      }
    });
    return Object.values(unique);
  }, [campusOptions, rows]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 space-y-3 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Dashboard Campus</h1>
          <Link
            href="/dashboard/campus/list"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Administrar Campus
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CampusMultiSelect
            options={computedOptions}
            selectedIds={filters.campusIds}
            onChange={setCampusIds}
          />
          <SwitchInactive
            checked={filters.includeInactive}
            onCheckedChange={setIncludeInactive}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(loading ? Array.from({ length: 3 }) : rows.slice(0, 3)).map(
          (_, index) => (
            <div
              key={index}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              {loading ? (
                <Skeleton className="h-12 w-24" />
              ) : (
                <>
                  <p className="text-sm font-medium">KPI {index + 1}</p>
                  <p className="text-2xl font-semibold text-primary">--</p>
                </>
              )}
            </div>
          )
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Tabla por campus</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Campus</th>
                <th className="px-3 py-2">Total ambientes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4" colSpan={2}>
                    <Skeleton className="h-5 w-48" />
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr
                    key={String(row.campusId ?? row.id ?? row.campus_id)}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => {
                      const campusId =
                        Number(row.campusId ?? row.id ?? row.campus_id) || 0;
                      if (!campusId) return;
                      router.push(buildDetailHref(campusId));
                    }}
                  >
                    <td className="px-3 py-2">
                      {(row.campusName as string) ??
                        (row.nombre as string) ??
                        (row.name as string)}
                    </td>
                    <td className="px-3 py-2">
                      {(row.totalAmbientes as number) ??
                        (row.total as number) ??
                        "--"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={2}>
                    No hay datos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
