"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import { useBloqueDashboardFilters } from "@/features/bloque-dashboard/hooks/useBloqueDashboardFilters";
import { useBloqueDashboardData } from "@/features/bloque-dashboard/hooks/useBloqueDashboardData";
import type { BloqueDashboardGlobalResponse } from "@/features/bloque-dashboard/schema";

type CampusOption = { id: number; nombre: string };
type FacultadOption = { id: number; nombre: string; campus_id: number };
type BloqueOption = {
  id: number;
  nombre: string;
  facultad_id?: number;
  facultad_nombre?: string;
};
type TipoBloqueOption = { id: number; nombre: string };
type GlobalCharts = BloqueDashboardGlobalResponse["data"]["charts"];

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "items" in value) {
    const items = (value as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }
  return [];
}

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function SwitchInactive({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Mostrar inactivos"
      onClick={() => onCheckedChange(!checked)}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition ${
        checked ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-muted-foreground/40 bg-muted text-muted-foreground"
      } ${className ?? ""}`}
    >
      <span className={`flex h-4 w-7 items-center rounded-full transition ${checked ? "bg-emerald-500/80" : "bg-muted-foreground/30"}`}>
        <span className={`h-3.5 w-3.5 rounded-full bg-white shadow transition ${checked ? "translate-x-3" : "translate-x-0.5"}`} />
      </span>
      Mostrar inactivos
    </button>
  );
}

function MultiSelect({ label, options, selectedIds, emptyLabel, onChange }: { label: string; options: Array<{ id: number; nombre: string }>; selectedIds: number[]; emptyLabel: string; onChange: (ids: number[]) => void }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term.length) return options;
    return options.filter((option) => option.nombre.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const summaryLabel = selectedIds.length === 0 ? emptyLabel : `${selectedIds.length} seleccionados`;

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
        <span aria-hidden className="text-xs text-muted-foreground">{open ? "Cerrar" : "Abrir"}</span>
      </Button>

      {open ? (
        <div className="absolute z-20 mt-2 w-72 max-w-full rounded-md border bg-popover shadow-lg">
          <div className="sticky top-0 z-10 border-b bg-popover p-2">
            <Input placeholder={`Buscar ${label.toLowerCase()}`} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} autoFocus />
          </div>
          <ul role="listbox" aria-label={`Listado de ${label.toLowerCase()}`} className="max-h-72 overflow-y-auto p-1">
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
                Limpiar seleccion
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
                      if (isSelected) next.delete(option.id);
                      else next.add(option.id);
                      onChange(Array.from(next));
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <span aria-hidden className={`h-3 w-3 rounded-sm border ${isSelected ? "bg-primary border-primary" : "border-muted"}`} />
                    {option.nombre}
                  </button>
                </li>
              );
            })}
            {filteredOptions.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">Sin opciones disponibles</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function BloquesDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <BloquesDashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-3 border-b py-3">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
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

function BloquesDashboardContent() {
  const { filters, setCampusIds, setFacultadIds, setBloqueIds, setTipoBloqueIds, setIncludeInactive, setFilters } = useBloqueDashboardFilters();
  const { data, loading } = useBloqueDashboardData({ filters });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [allFacultadOptions, setAllFacultadOptions] = useState<FacultadOption[]>([]);
  const [allBloqueOptions, setAllBloqueOptions] = useState<BloqueOption[]>([]);
  const [tipoBloqueOptions, setTipoBloqueOptions] = useState<TipoBloqueOption[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCatalogs() {
      try {
        const [campusResponse, facultadesResponse, bloquesResponse, tiposBloqueResponse] = await Promise.all([
          apiFetch("/campus?page=1&limit=50"),
          apiFetch("/facultades?page=1&limit=200"),
          apiFetch("/bloques?page=1&limit=200"),
          apiFetch("/tipo_bloques?page=1&limit=100"),
        ]);

        if (active) {
          const campusItems = asArray<{ id?: unknown; nombre?: unknown }>(campusResponse);
          const facultadItems = asArray<Record<string, unknown>>(facultadesResponse);
          const bloqueItems = asArray<Record<string, unknown>>(bloquesResponse);
          const tipoBloqueItems = asArray<{ id?: unknown; nombre?: unknown; descripcion?: unknown }>(tiposBloqueResponse);

          setCampusOptions(
            campusItems
              .map((item) => {
                const id = toPositiveInt(item.id);
                const nombre = String(item.nombre ?? "").trim();
                return id && nombre ? { id, nombre } : null;
              })
              .filter((item): item is CampusOption => Boolean(item))
          );

          setAllFacultadOptions(
            facultadItems
              .map((item) => {
                const id = toPositiveInt(item.id);
                const campusId = toPositiveInt(item.campus_id ?? item.campusId);
                const nombre = String(item.nombre ?? item.nombre_corto ?? item.nombreCorto ?? "").trim();
                return id && campusId && nombre ? { id, nombre, campus_id: campusId } : null;
              })
              .filter((item): item is FacultadOption => Boolean(item))
          );

          setAllBloqueOptions(
            bloqueItems
              .map((item) => {
                const id = toPositiveInt(item.id);
                const facultadId = toPositiveInt(item.facultad_id ?? item.facultadId);
                const facultadNombre = String(
                  item.facultad_nombre ?? item.facultadNombre ?? ""
                ).trim();
                const nombre = String(item.nombre ?? item.nombre_corto ?? item.nombreCorto ?? item.codigo ?? "").trim();
                if (!id || !nombre) return null;
                return {
                  id,
                  nombre,
                  ...(facultadId ? { facultad_id: facultadId } : {}),
                  ...(facultadNombre.length ? { facultad_nombre: facultadNombre } : {}),
                };
              })
              .filter((item): item is BloqueOption => Boolean(item))
          );

          setTipoBloqueOptions(
            tipoBloqueItems
              .map((item) => {
                const id = toPositiveInt(item.id);
                const nombre = String(item.nombre ?? item.descripcion ?? "").trim();
                return id && nombre ? { id, nombre } : null;
              })
              .filter((item): item is TipoBloqueOption => Boolean(item))
          );
          setCatalogReady(true);
        }
      } catch {
        // noop
      }
    }
    void loadCatalogs();
    return () => {
      active = false;
    };
  }, []);

  const globalData = data?.layout.mode === "global" ? data.data : null;
  const facultadOptions = useMemo(() => {
    if (!filters.campusIds.length) return allFacultadOptions;
    const selectedCampus = new Set(filters.campusIds);
    return allFacultadOptions.filter((item) => selectedCampus.has(item.campus_id));
  }, [allFacultadOptions, filters.campusIds]);
  const bloqueOptions = useMemo(() => {
    if (!filters.facultadIds.length) return allBloqueOptions;
    const selectedFacultades = new Set(filters.facultadIds);
    const selectedFacultadNames = new Set(
      facultadOptions
        .filter((item) => selectedFacultades.has(item.id))
        .map((item) => item.nombre.trim().toLowerCase())
    );
    return allBloqueOptions.filter((item) => {
      if (typeof item.facultad_id === "number") {
        return selectedFacultades.has(item.facultad_id);
      }
      if (item.facultad_nombre) {
        return selectedFacultadNames.has(item.facultad_nombre.trim().toLowerCase());
      }
      return false;
    });
  }, [allBloqueOptions, filters.facultadIds, facultadOptions]);

  useEffect(() => {
    if (!catalogReady) return;
    if (!filters.campusIds.length) return;
    const allowed = new Set(campusOptions.map((item) => item.id));
    const next = filters.campusIds.filter((id) => allowed.has(id));
    if (next.length !== filters.campusIds.length) setCampusIds(next);
  }, [catalogReady, campusOptions, filters.campusIds, setCampusIds]);

  useEffect(() => {
    if (!catalogReady) return;
    if (!filters.facultadIds.length) return;
    const allowed = new Set(facultadOptions.map((item) => item.id));
    const next = filters.facultadIds.filter((id) => allowed.has(id));
    if (next.length !== filters.facultadIds.length) setFacultadIds(next);
  }, [catalogReady, facultadOptions, filters.facultadIds, setFacultadIds]);

  useEffect(() => {
    if (!catalogReady) return;
    if (!filters.bloqueIds.length) return;
    const allowed = new Set(allBloqueOptions.map((item) => item.id));
    const next = filters.bloqueIds.filter((id) => allowed.has(id));
    if (next.length !== filters.bloqueIds.length) setBloqueIds(next);
  }, [catalogReady, allBloqueOptions, filters.bloqueIds, setBloqueIds]);

  return (
    <div className="space-y-6 pt-2">
      <div className="sticky top-14 z-20 space-y-3 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Dashboard Bloques</h1>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="w-full"><MultiSelect label="Campus" options={campusOptions} selectedIds={filters.campusIds} emptyLabel="Selecciona campus" onChange={setCampusIds} /></div>
          <div className="w-full"><MultiSelect label="Facultades" options={facultadOptions} selectedIds={filters.facultadIds} emptyLabel="Selecciona facultades" onChange={setFacultadIds} /></div>
          <div className="w-full"><MultiSelect label="Bloques" options={bloqueOptions} selectedIds={filters.bloqueIds} emptyLabel="Selecciona bloques" onChange={setBloqueIds} /></div>
          <div className="w-full"><MultiSelect label="Tipos de bloque" options={tipoBloqueOptions} selectedIds={filters.tipoBloqueIds} emptyLabel="Selecciona tipos" onChange={setTipoBloqueIds} /></div>
          <div className="w-full flex items-center">
            <SwitchInactive checked={filters.includeInactive} onCheckedChange={setIncludeInactive} />
          </div>
          <div className="w-full flex items-center">
            <Button asChild>
              <Link href="/dashboard/bloques/list">Administrar Bloques</Link>
            </Button>
          </div>
        </div>
      </div>
      <KpiGrid kpis={globalData?.kpis} loading={loading} />

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard loading={loading} title="Distribucion por tipo de bloque" option={buildSimpleBarOption(globalData?.charts.tiposBloque ?? [], "tipoBloqueNombre", "cantidad")} height={360} />
        <ChartCard loading={loading} title="Ambientes por bloque" option={buildSimpleBarOption(globalData?.charts.ambientesPorBloque ?? [], "bloqueNombre", "ambientes")} height={360} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard loading={loading} title="Capacidad por bloque" option={buildCapacityByBlockOption(globalData?.charts.capacidadPorBloque ?? [])} height={420} />
        <ChartCard loading={loading} title="Activos por bloque" option={buildSimpleBarOption(globalData?.charts.activosPorBloque ?? [], "bloqueNombre", "activosAsignados")} height={420} />
      </div>

      <ResumenBloquesTable
        loading={loading}
        rows={globalData?.tables.resumenBloques ?? []}
        onRowClick={(row) => {
          const campusId = campusOptions.find(
            (item) => item.nombre.trim().toLowerCase() === row.campusNombre.trim().toLowerCase()
          )?.id;
          const facultadId = allFacultadOptions.find(
            (item) =>
              item.nombre.trim().toLowerCase() === row.facultadNombre.trim().toLowerCase()
          )?.id;

          setFilters({
            ...filters,
            campusIds: campusId ? [campusId] : [],
            facultadIds: facultadId ? [facultadId] : [],
            bloqueIds: [row.bloqueId],
          });
        }}
      />
    </div>
  );
}

function KpiGrid({ kpis, loading }: { kpis: BloqueDashboardGlobalResponse["data"]["kpis"] | undefined; loading: boolean }) {
  const cards = [
    { type: "donut" as const, title: "Campus", data: [{ label: "Activos", value: kpis?.campus.activos ?? 0 }, { label: "Inactivos", value: kpis?.campus.inactivos ?? 0 }] },
    { type: "donut" as const, title: "Facultades", data: [{ label: "Activas", value: kpis?.facultades.activos ?? 0 }, { label: "Inactivas", value: kpis?.facultades.inactivos ?? 0 }] },
    { type: "donut" as const, title: "Bloques", data: [{ label: "Activos", value: kpis?.bloques.activos ?? 0 }, { label: "Inactivos", value: kpis?.bloques.inactivos ?? 0 }] },
    { type: "donut" as const, title: "Ambientes", data: [{ label: "Activos", value: kpis?.ambientes.activos ?? 0 }, { label: "Inactivos", value: kpis?.ambientes.inactivos ?? 0 }] },
    { type: "capacity" as const, title: "Capacidades", total: kpis?.capacidad.total ?? 0, examen: kpis?.capacidad.examen ?? 0 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) =>
        card.type === "donut" ? <DonutKpiCard key={card.title} title={card.title} data={card.data} loading={loading} /> : <CapacityKpiCard key={card.title} title={card.title} total={card.total} examen={card.examen} loading={loading} />
      )}
    </div>
  );
}

function ChartCard({ loading, title, option, height = 320 }: { loading: boolean; title: string; option: unknown; height?: number }) {
  const hasData = !!option && typeof option === "object" && "series" in option && Array.isArray((option as { series?: Array<{ data?: unknown[] }> }).series) && (option as { series: Array<{ data?: unknown[] }> }).series.some((series) => (Array.isArray(series.data) ? series.data.length > 0 : false));

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      {loading ? (
        <div className="mt-3 space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-56 w-full" /></div>
      ) : hasData ? (
        <div className="mt-3"><ReactECharts option={option} style={{ height }} opts={{ locale: "es" }} /></div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">Sin datos para {title}.</div>
      )}
    </div>
  );
}

function buildSimpleBarOption(rows: Array<Record<string, string | number>>, labelKey: string, valueKey: string) {
  const sorted = [...rows].sort((a, b) => Number(b[valueKey] ?? 0) - Number(a[valueKey] ?? 0));
  const hasZoom = sorted.length > 10;
  const zoomEnd = Math.min(100, (10 / Math.max(sorted.length, 1)) * 100);
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 20, bottom: hasZoom ? 80 : 40, containLabel: true },
    dataZoom: hasZoom ? [{ type: "inside", xAxisIndex: 0, start: 0, end: zoomEnd }, { type: "slider", xAxisIndex: 0, height: 14, bottom: 14, start: 0, end: zoomEnd }] : undefined,
    xAxis: { type: "category", data: sorted.map((row) => String(row[labelKey] ?? "")), axisLabel: { rotate: 20, interval: 0, hideOverlap: false } },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: sorted.map((row) => Number(row[valueKey] ?? 0)), itemStyle: { color: "#0ea5e9" }, label: { show: true, position: "top" } }],
  };
}
function buildCapacityByBlockOption(rows: GlobalCharts["capacidadPorBloque"]) {
  const sorted = [...rows].sort((a, b) => b.capacidadTotal - a.capacidadTotal);
  const hasZoom = sorted.length > 10;
  const zoomEnd = Math.min(100, (10 / Math.max(sorted.length, 1)) * 100);
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 40, right: 20, top: 52, bottom: hasZoom ? 80 : 40, containLabel: true },
    dataZoom: hasZoom ? [{ type: "inside", xAxisIndex: 0, start: 0, end: zoomEnd }, { type: "slider", xAxisIndex: 0, height: 14, bottom: 14, start: 0, end: zoomEnd }] : undefined,
    xAxis: { type: "category", data: sorted.map((row) => row.bloqueNombre), axisLabel: { rotate: 20, interval: 0, hideOverlap: false } },
    yAxis: { type: "value" },
    series: [
      { name: "Capacidad total", type: "bar", data: sorted.map((row) => row.capacidadTotal), itemStyle: { color: "#22c55e" } },
      { name: "Capacidad examen", type: "bar", data: sorted.map((row) => row.capacidadExamen), itemStyle: { color: "#a855f7" } },
    ],
  };
}

function ResumenBloquesTable({
  loading,
  rows,
  onRowClick,
}: {
  loading: boolean;
  rows: BloqueDashboardGlobalResponse["data"]["tables"]["resumenBloques"];
  onRowClick: (
    row: BloqueDashboardGlobalResponse["data"]["tables"]["resumenBloques"][number]
  ) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "campusNombre" | "facultadNombre" | "bloqueNombre" | "ambientes"
  >("campusNombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = !term.length
      ? rows
      : rows.filter(
          (row) =>
            row.bloqueNombre.toLowerCase().includes(term) ||
            row.facultadNombre.toLowerCase().includes(term) ||
            row.campusNombre.toLowerCase().includes(term) ||
            row.tipoBloqueNombre.toLowerCase().includes(term)
        );

    return [...base].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDir === "asc" ? aValue - bValue : bValue - aValue;
      }
      return sortDir === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [rows, search, sortBy, sortDir]);

  const toggleSort = (
    column: "campusNombre" | "facultadNombre" | "bloqueNombre" | "ambientes"
  ) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  };

  const sortIcon = (
    column: "campusNombre" | "facultadNombre" | "bloqueNombre" | "ambientes"
  ) => (sortBy === column ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumen de bloques</h2>
        <Input
          placeholder="Buscar campus, facultad, bloque o tipo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("campusNombre")}>Campus{sortIcon("campusNombre")}</th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("facultadNombre")}>Facultad{sortIcon("facultadNombre")}</th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("bloqueNombre")}>Bloque{sortIcon("bloqueNombre")}</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Pisos</th>
              <th className="px-3 py-2">Estado</th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort("ambientes")}>Ambientes{sortIcon("ambientes")}</th>
              <th className="px-3 py-2">Cap. total</th>
              <th className="px-3 py-2">Cap. examen</th>
              <th className="px-3 py-2">Activos</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={10}>
                  <Skeleton className="h-5 w-48" />
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((row) => (
                <tr
                  key={row.bloqueId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(row)}
                >
                  <td className="px-3 py-2">{row.campusNombre}</td>
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
                <td className="px-3 py-4 text-muted-foreground" colSpan={10}>
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
