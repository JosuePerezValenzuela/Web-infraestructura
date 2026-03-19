"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useCampusDashboardFilters } from "@/features/campus-dashboard/hooks/useCampusDashboardFilters";
import { useCampusDashboardData } from "@/features/campus-dashboard/hooks/useCampusDashboardData";
import type { CampusDashboardGlobalResponse } from "@/features/campus-dashboard/schema";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";

type CampusOption = { id: number; nombre: string };
type DashboardRow = Record<string, unknown>;
type GlobalCharts = CampusDashboardGlobalResponse["data"]["charts"];

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

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
      aria-label="Incluir inactivos"
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
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CampusDashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-3 border-b py-3">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function CampusDashboardContent() {
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
    data && data.layout.mode === "global"
      ? (data.data.table.campusResumen as DashboardRow[])
      : [];
  const kpis =
    data && data.layout.mode === "global" ? data.data.kpis : undefined;

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
    <div className="space-y-6 pt-2">
      <div className="sticky top-14 z-20 space-y-3 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Dashboard Campus</h1>
          <Button asChild>
            <Link href="/dashboard/campus/list">Administrar Campus</Link>
          </Button>
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

      <KpiGrid kpis={kpis} loading={loading} />

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Ranking ambientes por campus</h2>
        {loading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : (
          <ChartCard
            seriesLabel="Ambientes"
            height={320}
            option={buildRankingOption(
              data?.layout.mode === "global"
                ? data.data.charts.rankingAmbientesPorCampus
                : []
            )}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-lg" />
          ))
        ) : (
          <>
            <ChartCard
              title="Capacidad total por campus"
              height={320}
              option={buildCapacityOption(
                data?.layout.mode === "global"
                  ? data.data.charts.capacidadTotalPorCampus
                  : [],
                "capacidadTotal"
              )}
            />
            <ChartCard
              title="Capacidad examen por campus"
              height={320}
              option={buildCapacityOption(
                data?.layout.mode === "global"
                  ? data.data.charts.capacidadExamenPorCampus
                  : [],
                "capacidadExamen"
              )}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-lg" />
          ))
        ) : (
          <>
            <ChartCard
              title="Activos por campus"
              height={320}
              option={buildActivosOption(
                data?.layout.mode === "global"
                  ? data.data.charts.activosPorCampus
                  : []
              )}
            />
            <ChartCard
              title="Ambientes activos vs inactivos"
              height={320}
              option={buildAmbientesEstadoOption(
                data?.layout.mode === "global"
                  ? data.data.charts.ambientesActivosInactivosPorCampus
                  : []
              )}
            />
          </>
        )}
      </div>

      <CampusTable
        loading={loading}
        rows={
          data && data.layout.mode === "global"
            ? data.data.table.campusResumen
            : []
        }
        onRowClick={(campusId) => router.push(buildDetailHref(campusId))}
      />
    </div>
  );
}

function KpiGrid({
  kpis,
  loading,
}: {
  kpis: CampusDashboardGlobalResponse["data"]["kpis"] | undefined;
  loading: boolean;
}) {
  const cards = [
    {
      type: "donut" as const,
      title: "Campus",
      data: [
        { label: "Activos", value: kpis?.campus.activos ?? 0 },
        { label: "Inactivos", value: kpis?.campus.inactivos ?? 0 },
      ],
    },
    {
      type: "donut" as const,
      title: "Facultades",
      data: [
        { label: "Activos", value: kpis?.facultades.activos ?? 0 },
        { label: "Inactivos", value: kpis?.facultades.inactivos ?? 0 },
      ],
    },
    {
      type: "donut" as const,
      title: "Bloques",
      data: [
        { label: "Activos", value: kpis?.bloques.activos ?? 0 },
        { label: "Inactivos", value: kpis?.bloques.inactivos ?? 0 },
      ],
    },
    {
      type: "donut" as const,
      title: "Ambientes",
      data: [
        { label: "Activos", value: kpis?.ambientes.activos ?? 0 },
        { label: "Inactivos", value: kpis?.ambientes.inactivos ?? 0 },
      ],
    },
    {
      type: "donut" as const,
      title: "Activos",
      data: [
        { label: "Asignados", value: kpis?.activos.asignados ?? 0 },
        { label: "Sin asignar", value: kpis?.activos.noAsignadosGlobal ?? 0 },
      ],
    },
    {
      type: "capacity" as const,
      title: "Capacidades",
      total: kpis?.capacidad.total ?? 0,
      examen: kpis?.capacidad.examen ?? 0,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) =>
        card.type === "donut" ? (
          <DonutKpiCard
            key={card.title}
            title={card.title}
            data={card.data}
            loading={loading}
          />
        ) : (
          <CapacityKpiCard
            key={card.title}
            title={card.title}
            total={card.total}
            examen={card.examen}
            loading={loading}
          />
        )
      )}
    </div>
  );
}

function ChartCard({
  title,
  option,
  height = 300,
  seriesLabel,
}: {
  title?: string;
  option: any;
  height?: number;
  seriesLabel?: string;
}) {
  const hasData =
    option && option.series && option.series.some((s: any) => s.data?.length);
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {hasData ? (
        <div className="mt-3">
          <ReactECharts
            option={option}
            style={{ height }}
            opts={{ locale: "es" }}
          />
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          Sin datos para {title ?? seriesLabel ?? "este gráfico"}.
        </div>
      )}
    </div>
  );
}

function buildRankingOption(rows: GlobalCharts["rankingAmbientesPorCampus"]) {
  const sorted = [...rows].sort((a, b) => b.ambientes - a.ambientes);
  return {
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: sorted.map((row) => row.campusNombre),
      axisLabel: { rotate: 30 },
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: sorted.map((row) => row.ambientes),
        name: "Ambientes",
        itemStyle: { color: "#0ea5e9" },
        label: {
          show: true,
          position: "top",
          formatter: ({ value }: { value: number }) =>
            Number(value ?? 0).toLocaleString(),
        },
      },
    ],
  };
}

function buildCapacityOption(
  rows:
    | GlobalCharts["capacidadTotalPorCampus"]
    | GlobalCharts["capacidadExamenPorCampus"],
  valueKey: "capacidadTotal" | "capacidadExamen"
) {
  const sorted = [...rows].sort(
    (a, b) => (b[valueKey] as number) - (a[valueKey] as number)
  );
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: sorted.map((row) => row.campusNombre),
    },
    series: [
      {
        type: "bar",
        data: sorted.map((row) => row[valueKey]),
        name:
          valueKey === "capacidadTotal"
            ? "Capacidad total"
            : "Capacidad examen",
        itemStyle: {
          color: valueKey === "capacidadTotal" ? "#22c55e" : "#a855f7",
        },
        label: {
          show: true,
          position: "right",
          formatter: ({ value }: { value: number }) =>
            Number(value ?? 0).toLocaleString(),
        },
      },
    ],
  };
}

function buildActivosOption(rows: GlobalCharts["activosPorCampus"]) {
  const sorted = [...rows].sort(
    (a, b) => b.asignados + b.noAsignados - (a.asignados + a.noAsignados)
  );
  return {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    xAxis: { type: "category", data: sorted.map((row) => row.campusNombre) },
    yAxis: { type: "value" },
    series: [
      {
        name: "Asignados",
        type: "bar",
        stack: "activos",
        itemStyle: { color: "#2563eb" },
        data: sorted.map((row) => row.asignados),
        label: {
          show: true,
          position: "inside",
          formatter: ({ value }: { value: number }) =>
            Number(value ?? 0).toLocaleString(),
        },
      },
      {
        name: "Sin asignar",
        type: "bar",
        stack: "activos",
        itemStyle: { color: "#94a3b8" },
        data: sorted.map((row) => row.noAsignados),
        label: {
          show: true,
          position: "inside",
          formatter: ({ value }: { value: number }) =>
            Number(value ?? 0).toLocaleString(),
        },
      },
    ],
  };
}

function buildAmbientesEstadoOption(
  rows: GlobalCharts["ambientesActivosInactivosPorCampus"]
) {
  const sorted = [...rows].sort(
    (a, b) => b.activos + b.inactivos - (a.activos + a.inactivos)
  );
  return {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    xAxis: { type: "category", data: sorted.map((row) => row.campusNombre) },
    yAxis: { type: "value" },
    series: [
      {
        name: "Activos",
        type: "bar",
        stack: "estado",
        itemStyle: { color: "#22c55e" },
        data: sorted.map((row) => row.activos),
        label: {
          show: true,
          position: "inside",
          formatter: ({ value }: { value: number }) =>
            Number(value ?? 0).toLocaleString(),
        },
      },
      {
        name: "Inactivos",
        type: "bar",
        stack: "estado",
        itemStyle: { color: "#f59e0b" },
        data: sorted.map((row) => row.inactivos),
        label: {
          show: true,
          position: "inside",
          formatter: ({ value }: { value: number }) =>
            Number(value ?? 0).toLocaleString(),
        },
      },
    ],
  };
}

function CampusTable({
  loading,
  rows,
  onRowClick,
}: {
  loading: boolean;
  rows: CampusDashboardGlobalResponse["data"]["table"]["campusResumen"];
  onRowClick: (campusId: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] =
    useState<keyof (typeof rows)[number]>("campusNombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term.length
      ? rows.filter((row) => row.campusNombre.toLowerCase().includes(term))
      : rows;

    const sorted = [...base].sort((a, b) => {
      const aVal = a[sortBy] as number | string;
      const bVal = b[sortBy] as number | string;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return sorted;
  }, [rows, search, sortBy, sortDir]);

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tabla por campus</h2>
        <Input
          placeholder="Buscar campus"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              {[
                "Campus",
                "Facultades",
                "Bloques",
                "Tipos bloque",
                "Ambientes",
                "Tipos ambiente",
                "Capacidad total",
                "Capacidad examen",
                "Activos asignados",
              ].map((col, index) => (
                <th
                  key={col}
                  className="px-3 py-2 cursor-pointer select-none"
                  onClick={() =>
                    toggleSort(
                      [
                        "campusNombre",
                        "facultades",
                        "bloques",
                        "tiposBloque",
                        "ambientes",
                        "tiposAmbiente",
                        "capacidadTotal",
                        "capacidadExamen",
                        "activosAsignados",
                      ][index] as typeof sortBy
                    )
                  }
                >
                  {col}
                  {sortBy ===
                  ([
                    "campusNombre",
                    "facultades",
                    "bloques",
                    "tiposBloque",
                    "ambientes",
                    "tiposAmbiente",
                    "capacidadTotal",
                    "capacidadExamen",
                    "activosAsignados",
                  ][index] as typeof sortBy)
                    ? sortDir === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={9}>
                  <Skeleton className="h-5 w-48" />
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((row) => (
                <tr
                  key={row.campusId}
                  className="cursor-pointer hover:bg-muted/60"
                  onClick={() => onRowClick(row.campusId)}
                >
                  <td className="px-3 py-2">{row.campusNombre}</td>
                  <td className="px-3 py-2">{row.facultades}</td>
                  <td className="px-3 py-2">{row.bloques}</td>
                  <td className="px-3 py-2">{row.tiposBloque}</td>
                  <td className="px-3 py-2">{row.ambientes}</td>
                  <td className="px-3 py-2">{row.tiposAmbiente}</td>
                  <td className="px-3 py-2">{row.capacidadTotal}</td>
                  <td className="px-3 py-2">{row.capacidadExamen}</td>
                  <td className="px-3 py-2">{row.activosAsignados}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={9}>
                  No hay datos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
