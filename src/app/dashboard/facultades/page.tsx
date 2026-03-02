"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import { useFacultadDashboardFilters } from "@/features/facultad-dashboard/hooks/useFacultadDashboardFilters";
import { useFacultadDashboardData } from "@/features/facultad-dashboard/hooks/useFacultadDashboardData";
import type { FacultadDashboardGlobalResponse } from "@/features/facultad-dashboard/schema";

type CampusOption = { id: number; nombre: string };
type FacultadOption = { id: number; nombre: string };
type GlobalCharts = FacultadDashboardGlobalResponse["data"]["charts"];

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

function MultiSelect({
  label,
  options,
  selectedIds,
  emptyLabel,
  onChange,
}: {
  label: string;
  options: Array<{ id: number; nombre: string }>;
  selectedIds: number[];
  emptyLabel: string;
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const summaryLabel =
    selectedIds.length === 0 ? emptyLabel : `${selectedIds.length} seleccionados`;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="min-w-[220px] justify-between"
      >
        <span className="truncate">{summaryLabel}</span>
        <span aria-hidden className="text-xs text-muted-foreground">
          {open ? "Cerrar" : "Abrir"}
        </span>
      </Button>

      {open ? (
        <ul
          role="listbox"
          aria-label={`Listado de ${label.toLowerCase()}`}
          className="absolute z-20 mt-2 w-72 max-w-full rounded-md border bg-popover p-1 shadow-lg"
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
              Sin opciones disponibles
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function DaySelector({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const labels = [
    { id: 0, short: "D" },
    { id: 1, short: "L" },
    { id: 2, short: "M" },
    { id: 3, short: "X" },
    { id: 4, short: "J" },
    { id: 5, short: "V" },
    { id: 6, short: "S" },
  ];
  const selected = new Set(value);

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      {labels.map((day) => {
        const active = selected.has(day.id);
        return (
          <button
            key={day.id}
            type="button"
            className={`h-8 w-8 rounded-md text-xs font-semibold ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => {
              const next = new Set(selected);
              if (active) {
                next.delete(day.id);
              } else {
                next.add(day.id);
              }
              const sorted = Array.from(next).sort((a, b) => a - b);
              onChange(sorted.length ? sorted : [0, 1, 2, 3, 4, 5, 6]);
            }}
            aria-label={`Día ${day.id}`}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

export default function FacultadDashboardPage() {
  const router = useRouter();
  const {
    filters,
    setCampusIds,
    setFacultadIds,
    setIncludeInactive,
    setSlotMinutes,
    setDias,
    buildDetailHref,
  } = useFacultadDashboardFilters();
  const { data, loading } = useFacultadDashboardData({
    mode: "global",
    filters,
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [facultadOptions, setFacultadOptions] = useState<FacultadOption[]>([]);

  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      try {
        const [campus, facultades] = await Promise.all([
          apiFetch<{ items: CampusOption[] }>("/campus?page=1&limit=50"),
          apiFetch<{ items: FacultadOption[] }>("/facultades?page=1&limit=100"),
        ]);

        if (active) {
          setCampusOptions(campus.items ?? []);
          setFacultadOptions(facultades.items ?? []);
        }
      } catch {
        // Si falla el catálogo, la vista mantiene funcionamiento con filtros actuales.
      }
    }

    void loadCatalogs();
    return () => {
      active = false;
    };
  }, []);

  const globalData = data?.layout.mode === "global" ? data.data : null;
  const selectedFacultadId = filters.facultadIds[0] ?? null;

  return (
    <div className="space-y-6 pt-2">
      <div className="sticky top-14 z-20 space-y-3 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Dashboard Facultades</h1>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelect
              label="Campus"
              options={campusOptions}
              selectedIds={filters.campusIds}
              emptyLabel="Selecciona campus"
              onChange={setCampusIds}
            />
            <MultiSelect
              label="Facultades"
              options={facultadOptions}
              selectedIds={filters.facultadIds}
              emptyLabel="Selecciona facultades"
              onChange={setFacultadIds}
            />
            <select
              aria-label="Slot en minutos"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filters.slotMinutes}
              onChange={(event) =>
                setSlotMinutes(Number(event.target.value) as 15 | 30 | 45 | 60)
              }
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
            <DaySelector value={filters.dias} onChange={setDias} />
            <SwitchInactive
              checked={filters.includeInactive}
              onCheckedChange={setIncludeInactive}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/facultades/list">Administrar Facultades</Link>
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedFacultadId) {
                  router.push(buildDetailHref(selectedFacultadId));
                }
              }}
              disabled={!selectedFacultadId}
            >
              Ver detalle de facultad
            </Button>
          </div>
        </div>
      </div>

      <KpiGrid kpis={globalData?.kpis} loading={loading} />

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          loading={loading}
          title="Tipos de bloque"
          option={buildSimpleBarOption(globalData?.charts.tiposBloque ?? [], "tipoBloqueNombre", "cantidad")}
        />
        <ChartCard
          loading={loading}
          title="Tipos de ambiente"
          option={buildSimpleBarOption(globalData?.charts.tiposAmbiente ?? [], "tipoAmbienteNombre", "cantidad")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          loading={loading}
          title="Capacidad por bloque"
          option={buildCapacityByBlockOption(globalData?.charts.capacidadPorBloque ?? [])}
        />
        <ChartCard
          loading={loading}
          title="Activos por bloque"
          option={buildSimpleBarOption(globalData?.charts.activosPorBloque ?? [], "bloqueNombre", "activosAsignados")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          loading={loading}
          title="Ambientes activos vs inactivos por bloque"
          option={buildStackedStateOption(globalData?.charts.ambientesActivosInactivosPorBloque ?? [])}
        />
        <ChartCard
          loading={loading}
          title="Ocupación por bloque"
          option={buildOccupationByBlockOption(globalData?.charts.ocupacionPorBloque ?? [])}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          loading={loading}
          title="Top ambientes sobrecargados"
          option={buildTopUtilizationOption(
            globalData?.charts.topAmbientesUtilizacion.sobrecargados ?? []
          )}
        />
        <ChartCard
          loading={loading}
          title="Top ambientes subutilizados"
          option={buildTopUtilizationOption(
            globalData?.charts.topAmbientesUtilizacion.subutilizados ?? []
          )}
        />
      </div>

      <ChartCard
        loading={loading}
        title="Heatmap semanal de ocupación"
        option={buildWeeklyHeatmapOption(globalData?.charts.ocupacionHeatmapSemanal ?? [])}
        height={360}
      />

      <ResumenBloquesTable
        loading={loading}
        rows={globalData?.tables.resumenBloques ?? []}
      />
    </div>
  );
}

function KpiGrid({
  kpis,
  loading,
}: {
  kpis: FacultadDashboardGlobalResponse["data"]["kpis"] | undefined;
  loading: boolean;
}) {
  const cards = [
    {
      type: "donut" as const,
      title: "Facultades",
      data: [
        { label: "Activas", value: kpis?.facultades.activos ?? 0 },
        { label: "Inactivas", value: kpis?.facultades.inactivos ?? 0 },
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
  loading,
  title,
  option,
  height = 320,
}: {
  loading: boolean;
  title: string;
  option: unknown;
  height?: number;
}) {
  const hasData =
    !!option &&
    typeof option === "object" &&
    "series" in option &&
    Array.isArray((option as { series?: Array<{ data?: unknown[] }> }).series) &&
    (option as { series: Array<{ data?: unknown[] }> }).series.some((s) =>
      Array.isArray(s.data) ? s.data.length > 0 : false
    );

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : hasData ? (
        <div className="mt-3">
          <ReactECharts option={option} style={{ height }} opts={{ locale: "es" }} />
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          Sin datos para {title}.
        </div>
      )}
    </div>
  );
}

function buildSimpleBarOption(
  rows: Array<Record<string, string | number>>,
  labelKey: string,
  valueKey: string
) {
  const sorted = [...rows].sort(
    (a, b) => Number(b[valueKey] ?? 0) - Number(a[valueKey] ?? 0)
  );
  return {
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: sorted.map((row) => String(row[labelKey] ?? "")),
      axisLabel: { rotate: 20 },
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: sorted.map((row) => Number(row[valueKey] ?? 0)),
        itemStyle: { color: "#0ea5e9" },
        label: { show: true, position: "top" },
      },
    ],
  };
}

function buildCapacityByBlockOption(rows: GlobalCharts["capacidadPorBloque"]) {
  const sorted = [...rows].sort((a, b) => b.capacidadTotal - a.capacidadTotal);
  return {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    xAxis: {
      type: "category",
      data: sorted.map((row) => row.bloqueNombre),
      axisLabel: { rotate: 20 },
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "Capacidad total",
        type: "bar",
        data: sorted.map((row) => row.capacidadTotal),
        itemStyle: { color: "#22c55e" },
      },
      {
        name: "Capacidad examen",
        type: "bar",
        data: sorted.map((row) => row.capacidadExamen),
        itemStyle: { color: "#a855f7" },
      },
    ],
  };
}

function buildStackedStateOption(
  rows: GlobalCharts["ambientesActivosInactivosPorBloque"]
) {
  const sorted = [...rows].sort(
    (a, b) => b.activos + b.inactivos - (a.activos + a.inactivos)
  );
  return {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    xAxis: { type: "category", data: sorted.map((row) => row.bloqueNombre) },
    yAxis: { type: "value" },
    series: [
      {
        name: "Activos",
        type: "bar",
        stack: "estado",
        itemStyle: { color: "#22c55e" },
        data: sorted.map((row) => row.activos),
      },
      {
        name: "Inactivos",
        type: "bar",
        stack: "estado",
        itemStyle: { color: "#f59e0b" },
        data: sorted.map((row) => row.inactivos),
      },
    ],
  };
}

function buildOccupationByBlockOption(rows: GlobalCharts["ocupacionPorBloque"]) {
  const sorted = [...rows].sort((a, b) => b.pctOcupacion - a.pctOcupacion);
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", max: 100 },
    yAxis: { type: "category", data: sorted.map((row) => row.bloqueNombre) },
    series: [
      {
        type: "bar",
        data: sorted.map((row) => row.pctOcupacion),
        itemStyle: { color: "#2563eb" },
        label: {
          show: true,
          position: "right",
          formatter: ({ value }: { value: number }) => `${value}%`,
        },
      },
    ],
  };
}

function buildTopUtilizationOption(
  rows: GlobalCharts["topAmbientesUtilizacion"]["sobrecargados"]
) {
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", max: 100 },
    yAxis: {
      type: "category",
      inverse: true,
      data: rows.map((row) => `${row.ambienteNombre} (${row.bloqueNombre})`),
    },
    series: [
      {
        type: "bar",
        data: rows.map((row) => row.pctOcupacion),
        itemStyle: { color: "#ef4444" },
        label: {
          show: true,
          position: "right",
          formatter: ({ value }: { value: number }) => `${value}%`,
        },
      },
    ],
  };
}

function buildWeeklyHeatmapOption(rows: GlobalCharts["ocupacionHeatmapSemanal"]) {
  const dayLabels: Record<number, string> = {
    0: "Domingo",
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
  };
  const franjas = Array.from(new Set(rows.map((item) => item.franja)));
  const dias = Array.from(new Set(rows.map((item) => item.dia))).sort((a, b) => a - b);
  const data = rows.map((row) => [
    franjas.indexOf(row.franja),
    dias.indexOf(row.dia),
    row.pctOcupacion,
  ]);

  return {
    tooltip: {
      formatter: (params: { data: [number, number, number] }) => {
        const [x, y, pct] = params.data;
        return `${dayLabels[dias[y]]} ${franjas[x]}: ${pct}%`;
      },
    },
    grid: { left: 90, right: 20, top: 20, bottom: 40 },
    xAxis: { type: "category", data: franjas },
    yAxis: {
      type: "category",
      data: dias.map((day) => dayLabels[day] ?? String(day)),
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
    },
    series: [{ type: "heatmap", data }],
  };
}

function ResumenBloquesTable({
  loading,
  rows,
}: {
  loading: boolean;
  rows: FacultadDashboardGlobalResponse["data"]["tables"]["resumenBloques"];
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term.length) return rows;
    return rows.filter(
      (row) =>
        row.bloqueNombre.toLowerCase().includes(term) ||
        row.tipoBloqueNombre.toLowerCase().includes(term)
    );
  }, [rows, search]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumen de bloques</h2>
        <Input
          placeholder="Buscar bloque o tipo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2">Bloque</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Pisos</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Ambientes</th>
              <th className="px-3 py-2">Tipos ambiente</th>
              <th className="px-3 py-2">Capacidad total</th>
              <th className="px-3 py-2">Capacidad examen</th>
              <th className="px-3 py-2">Activos asignados</th>
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
                <tr key={`${row.bloqueNombre}-${row.tipoBloqueNombre}`} className="hover:bg-muted/50">
                  <td className="px-3 py-2">{row.bloqueNombre}</td>
                  <td className="px-3 py-2">{row.tipoBloqueNombre}</td>
                  <td className="px-3 py-2">{row.pisos}</td>
                  <td className="px-3 py-2">{row.activo ? "Activo" : "Inactivo"}</td>
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
                  Sin datos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
