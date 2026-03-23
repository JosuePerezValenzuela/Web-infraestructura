"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
type FacultadOption = { id: number; nombre: string; campus_id: number };
type BloqueOption = { id: number; nombre: string; facultad_nombre: string };
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
  const [searchTerm, setSearchTerm] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term.length) return options;
    return options.filter((option) => option.nombre.toLowerCase().includes(term));
  }, [options, searchTerm]);

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
        onClick={() => {
          setOpen((value) => !value);
          setSearchTerm("");
        }}
        className="min-w-[220px] justify-between"
      >
        <span className="truncate">{summaryLabel}</span>
        <span aria-hidden className="text-xs text-muted-foreground">
          {open ? "Cerrar" : "Abrir"}
        </span>
      </Button>

      {open ? (
        <div className="absolute z-20 mt-2 w-72 max-w-full rounded-md border bg-popover shadow-lg">
          <div className="sticky top-0 z-10 border-b bg-popover p-2">
            <Input
              placeholder={`Buscar ${label.toLowerCase()}`}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              autoFocus
            />
          </div>
          <ul
            role="listbox"
            aria-label={`Listado de ${label.toLowerCase()}`}
            className="max-h-72 overflow-y-auto p-1"
          >
          <li className="p-1">
            <button
              type="button"
              role="option"
              aria-selected={selectedIds.length === 0}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                onChange([]);
                setOpen(false);
                setSearchTerm("");
              }}
            >
              Limpiar selección
            </button>
          </li>
          {filteredOptions.map((option) => {
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
                    setSearchTerm("");
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
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Sin opciones disponibles
            </li>
          ) : null}
        </ul>
        </div>
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
    { id: 0, short: "L" },
    { id: 1, short: "M" },
    { id: 2, short: "X" },
    { id: 3, short: "J" },
    { id: 4, short: "V" },
    { id: 5, short: "S" },
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
              onChange(sorted.length ? sorted : [0, 1, 2, 3, 4, 5]);
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
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <FacultadDashboardContent />
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
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function FacultadDashboardContent() {
  const router = useRouter();
  const {
    filters,
    setCampusIds,
    setFacultadIds,
    setIncludeInactive,
  } = useFacultadDashboardFilters();
  const { data, loading } = useFacultadDashboardData({
    mode: "global",
    filters,
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [allFacultadOptions, setAllFacultadOptions] = useState<FacultadOption[]>([]);
  const [allBloqueOptions, setAllBloqueOptions] = useState<BloqueOption[]>([]);
  const [facultadCatalogReady, setFacultadCatalogReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      try {
        const [campus, facultades, bloques] = await Promise.all([
          apiFetch<{ items: CampusOption[] }>("/campus?page=1&limit=50"),
          apiFetch<{ items: Array<FacultadOption | (Omit<FacultadOption, "campus_id"> & { campus_id: string })> }>("/facultades?page=1&limit=200"),
          apiFetch<{ items: Array<BloqueOption | { id?: unknown; nombre?: unknown; facultad_id?: unknown; facultad_nombre?: unknown }> }>("/bloques?page=1&limit=500"),
        ]);

        if (active) {
          setCampusOptions(campus.items ?? []);
          setAllFacultadOptions(
            (facultades.items ?? [])
              .map((item) => ({
                id: Number(item.id),
                nombre: String(item.nombre),
                campus_id: Number(item.campus_id),
              }))
              .filter(
                (item) =>
                  Number.isInteger(item.id) &&
                  item.id > 0 &&
                  Number.isInteger(item.campus_id) &&
                  item.campus_id > 0 &&
                  item.nombre.trim().length > 0
              )
          );
          setAllBloqueOptions(
            (bloques.items ?? [])
              .map((item) => ({
                id: Number(item.id),
                nombre: String(item.nombre ?? "").trim(),
                facultad_nombre: item.facultad_nombre ? String(item.facultad_nombre).trim() : "",
              }))
              .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.nombre.length > 0)
          );
          setFacultadCatalogReady(true);
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

  const facultadOptions = useMemo(() => {
    if (!filters.campusIds.length) {
      return allFacultadOptions;
    }
    const selectedCampus = new Set(filters.campusIds);
    return allFacultadOptions.filter((item) => selectedCampus.has(item.campus_id));
  }, [allFacultadOptions, filters.campusIds]);

  useEffect(() => {
    if (!facultadCatalogReady) return;
    if (!filters.facultadIds.length) return;
    const allowed = new Set(facultadOptions.map((item) => item.id));
    const next = filters.facultadIds.filter((id) => allowed.has(id));
    const unchanged =
      next.length === filters.facultadIds.length &&
      next.every((id, index) => id === filters.facultadIds[index]);
    if (!unchanged) {
      setFacultadIds(next);
    }
  }, [facultadCatalogReady, facultadOptions, filters.facultadIds, setFacultadIds]);

  const navigateToBloque = (row: { bloqueId?: number; bloqueNombre: string; facultadNombre?: string }) => {
    const params = new URLSearchParams();
    
    let bloqueId: number | undefined = row.bloqueId;
    
    // Intentar encontrar el bloque por ID o por nombre
    if (!bloqueId) {
      const matchedBloque = allBloqueOptions.find(
        (b) => b.nombre.trim().toLowerCase() === row.bloqueNombre.trim().toLowerCase()
      );
      if (matchedBloque) {
        bloqueId = matchedBloque.id;
      }
    }
    
    if (!bloqueId) return;
    params.set("bloqueIds", String(bloqueId));
    
    // Buscar facultad por nombre desde el catálogo de bloques
    const matchedBloque = allBloqueOptions.find((b) => b.id === bloqueId);
    const facultadNombreToSearch = matchedBloque?.facultad_nombre || row.facultadNombre;
    
    if (facultadNombreToSearch) {
      const matchedFacultad = allFacultadOptions.find(
        (f) => f.nombre.trim().toLowerCase() === facultadNombreToSearch.trim().toLowerCase()
      );
      if (matchedFacultad) {
        params.set("facultadIds", String(matchedFacultad.id));
        params.set("campusIds", String(matchedFacultad.campus_id));
      }
    }
    
    params.set("includeInactive", String(filters.includeInactive));
    router.push(`/dashboard/bloques?${params.toString()}`);
  };

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
            <SwitchInactive
              checked={filters.includeInactive}
              onCheckedChange={setIncludeInactive}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/dashboard/facultades/list">Administrar Facultades</Link>
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
          height={400}
        />
        <ChartCard
          loading={loading}
          title="Tipos de ambiente"
          option={buildSimpleBarOption(globalData?.charts.tiposAmbiente ?? [], "tipoAmbienteNombre", "cantidad")}
          height={400}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          loading={loading}
          title="Capacidad por bloque"
          option={buildCapacityByBlockOption(globalData?.charts.capacidadPorBloque ?? [])}
          height={420}
        />
        <ChartCard
          loading={loading}
          title="Activos por bloque"
          option={buildSimpleBarOption(globalData?.charts.activosPorBloque ?? [], "bloqueNombre", "activosAsignados")}
          height={420}
        />
      </div>

      <ChartCard
        loading={loading}
        title="Ambientes activos vs inactivos por bloque"
        option={buildStackedStateOption(globalData?.charts.ambientesActivosInactivosPorBloque ?? [])}
        height={420}
      />

      <ResumenBloquesTable
        loading={loading}
        rows={globalData?.tables.resumenBloques ?? []}
        onRowClick={navigateToBloque}
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
  const hasZoom = sorted.length > 10;
  const zoomEnd = Math.min(100, (10 / Math.max(sorted.length, 1)) * 100);
  return {
    tooltip: { trigger: "axis" },
    grid: {
      left: 40,
      right: 20,
      top: 20,
      bottom: hasZoom ? 80 : 40,
      containLabel: true,
    },
    dataZoom:
      hasZoom
        ? [
            { type: "inside", xAxisIndex: 0, start: 0, end: zoomEnd },
            { type: "slider", xAxisIndex: 0, height: 14, bottom: 14, start: 0, end: zoomEnd },
          ]
        : undefined,
    xAxis: {
      type: "category",
      data: sorted.map((row) => String(row[labelKey] ?? "")),
      axisLabel: { rotate: 20, interval: 0, hideOverlap: false },
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
  const hasZoom = sorted.length > 10;
  const zoomEnd = Math.min(100, (10 / Math.max(sorted.length, 1)) * 100);
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: {
      left: 40,
      right: 20,
      top: 52,
      bottom: hasZoom ? 80 : 40,
      containLabel: true,
    },
    dataZoom:
      hasZoom
        ? [
            { type: "inside", xAxisIndex: 0, start: 0, end: zoomEnd },
            { type: "slider", xAxisIndex: 0, height: 14, bottom: 14, start: 0, end: zoomEnd },
          ]
        : undefined,
    xAxis: {
      type: "category",
      data: sorted.map((row) => row.bloqueNombre),
      axisLabel: { rotate: 20, interval: 0, hideOverlap: false },
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
  const hasZoom = sorted.length > 10;
  const zoomEnd = Math.min(100, (10 / Math.max(sorted.length, 1)) * 100);
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: {
      left: 40,
      right: 20,
      top: 52,
      bottom: hasZoom ? 80 : 40,
      containLabel: true,
    },
    dataZoom:
      hasZoom
        ? [
            { type: "inside", xAxisIndex: 0, start: 0, end: zoomEnd },
            { type: "slider", xAxisIndex: 0, height: 14, bottom: 14, start: 0, end: zoomEnd },
          ]
        : undefined,
    xAxis: {
      type: "category",
      data: sorted.map((row) => row.bloqueNombre),
      axisLabel: { interval: 0, hideOverlap: false, rotate: 20 },
    },
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

function ResumenBloquesTable({
  loading,
  rows,
  onRowClick,
}: {
  loading: boolean;
  rows: FacultadDashboardGlobalResponse["data"]["tables"]["resumenBloques"];
  onRowClick: (row: FacultadDashboardGlobalResponse["data"]["tables"]["resumenBloques"][number]) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    | "bloqueNombre"
    | "facultadNombre"
    | "tipoBloqueNombre"
    | "pisos"
    | "activo"
    | "ambientes"
    | "capacidadTotal"
    | "capacidadExamen"
    | "activosAsignados"
  >("bloqueNombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const enriched = useMemo(() => {
    return rows.map((row) => {
      const facultadNombre = row.facultadNombre ?? "N/D";

      return {
        ...row,
        facultadNombre,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = !term.length
      ? enriched
      : enriched.filter(
          (row) =>
            row.bloqueNombre.toLowerCase().includes(term) ||
            row.tipoBloqueNombre.toLowerCase().includes(term) ||
            row.facultadNombre.toLowerCase().includes(term)
        );

    return [...base].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return sortDir === "asc"
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [enriched, search, sortBy, sortDir]);

  function toggleSort(
    column:
      | "bloqueNombre"
      | "facultadNombre"
      | "tipoBloqueNombre"
      | "pisos"
      | "activo"
      | "ambientes"
      | "capacidadTotal"
      | "capacidadExamen"
      | "activosAsignados"
  ) {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumen de bloques</h2>
        <Input
          placeholder="Buscar facultad, bloque o tipo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("facultadNombre")}>
                Facultad {sortBy === "facultadNombre" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("bloqueNombre")}>
                Bloque {sortBy === "bloqueNombre" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("tipoBloqueNombre")}>
                Tipo bloque {sortBy === "tipoBloqueNombre" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("pisos")}>
                Pisos {sortBy === "pisos" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("activo")}>
                Estado {sortBy === "activo" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("ambientes")}>
                Ambientes {sortBy === "ambientes" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("capacidadTotal")}>
                Capacidad total {sortBy === "capacidadTotal" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("capacidadExamen")}>
                Capacidad examen {sortBy === "capacidadExamen" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort("activosAsignados")}>
                Activos asignados {sortBy === "activosAsignados" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
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
                  key={row.bloqueId ?? `${row.bloqueNombre}-${row.tipoBloqueNombre}`} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(row)}
                >
                  <td className="px-3 py-2">{row.facultadNombre}</td>
                  <td className="px-3 py-2">{row.bloqueNombre}</td>
                  <td className="px-3 py-2">{row.tipoBloqueNombre}</td>
                  <td className="px-3 py-2">{row.pisos}</td>
                  <td className="px-3 py-2">{row.activo ? "Activo" : "Inactivo"}</td>
                  <td className="px-3 py-2">{row.ambientes}</td>
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
