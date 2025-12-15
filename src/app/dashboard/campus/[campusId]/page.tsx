"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useCampusDashboardFilters } from "@/features/campus-dashboard/hooks/useCampusDashboardFilters";
import { useCampusDashboardData } from "@/features/campus-dashboard/hooks/useCampusDashboardData";

type CampusOption = { id: number; nombre: string };

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

export default function CampusDashboardDetailPage({
  params,
}: {
  params: { campusId: string } | Promise<{ campusId: string }>;
}) {
  const router = useRouter();
  const resolvedParams =
    typeof (params as unknown as Promise<unknown>)?.then === "function"
      ? use(params as Promise<{ campusId: string }>)
      : (params as { campusId: string });

  const campusId = Number(resolvedParams.campusId);
  const { filters, setIncludeInactive, buildGlobalHref } =
    useCampusDashboardFilters();

  const { data, loading } = useCampusDashboardData({
    mode: "detail",
    campusId,
    filters,
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);

  useEffect(() => {
    let active = true;
    async function loadCampus() {
      try {
        const response = await apiFetch<{ items: CampusOption[] }>(
          "/campus?page=1&limit=50"
        );
        if (active) {
          setCampusOptions(response.items ?? []);
        }
      } catch {
        // silencioso para placeholders
      }
    }
    void loadCampus();
    return () => {
      active = false;
    };
  }, []);

  const campusLabel = useMemo(() => {
    const match = campusOptions.find((option) => option.id === campusId);
    if (match) {
      return match.nombre;
    }
    return `Campus ${campusId}`;
  }, [campusId, campusOptions]);

  const kpiEntries = useMemo(() => {
    if (data && data.layout.mode === "detail") {
      const entries = Object.entries(data.data.kpis ?? {});
      const padded = [...entries];
      while (padded.length < 8) {
        padded.push([`kpi-${padded.length + 1}`, "--"]);
      }
      return padded.slice(0, 8);
    }
    return Array.from({ length: 8 }).map((_, index) => [
      `kpi-${index + 1}`,
      "--",
    ]);
  }, [data]);

  function ChartPlaceholder({ title }: { title: string }) {
    return (
      <div className="h-64 w-full rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{title}</p>
          <span className="text-xs text-muted-foreground">Placeholder</span>
        </div>
        <div className="mt-4 h-44 rounded-md bg-muted/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="sticky top-14 z-20 space-y-3 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Campus</p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-semibold">
              {campusLabel}
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/campus/list">Administrar Campus</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SwitchInactive
            checked={filters.includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(buildGlobalHref())}
          >
            Volver
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiEntries.map(([label, value], index) => (
          <div
            key={label ?? index}
            data-testid="campus-kpi-card"
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            {loading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <p className="text-sm font-medium">
                  {typeof label === "string" ? label : `KPI ${index + 1}`}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {typeof value === "string" || typeof value === "number"
                    ? value
                    : "--"}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-lg" />
          ))
        ) : (
          <>
            <ChartPlaceholder title="Tipos de bloque" />
            <ChartPlaceholder title="Tipos de ambiente" />
          </>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Facultades del campus</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Facultad</th>
                <th className="px-3 py-2">Ambientes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4" colSpan={2}>
                    <Skeleton className="h-5 w-48" />
                  </td>
                </tr>
              ) : data &&
                data.layout.mode === "detail" &&
                data.data.tables?.facultades?.rows?.length ? (
                data.data.tables.facultades.rows.map((row, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="px-3 py-2">
                      {(row.nombre as string) ??
                        (row.facultad as string) ??
                        (row.name as string) ??
                        "—"}
                    </td>
                    <td className="px-3 py-2">
                      {(row.totalAmbientes as number) ??
                        (row.ambientes as number) ??
                        "--"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={2}>
                    No hay facultades registradas.
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
