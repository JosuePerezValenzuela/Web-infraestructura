"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import { useBloqueDashboardFilters } from "@/features/bloque-dashboard/hooks/useBloqueDashboardFilters";
import { useBloqueDashboardData } from "@/features/bloque-dashboard/hooks/useBloqueDashboardData";
import type { BloqueDashboardGlobalResponse } from "@/features/bloque-dashboard/schema";

type CampusOption = { id: number; nombre: string };
type FacultadOption = { id: number; nombre: string; campus_id: number };
type BloqueOption = { id: number; nombre: string; facultad_id: number };
type TipoBloqueOption = { id: number; nombre: string };
type GlobalCharts = BloqueDashboardGlobalResponse["data"]["charts"];

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function SwitchInactive({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Mostrar inactivos"
      onClick={() => onCheckedChange(!checked)}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition ${
        checked ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-muted-foreground/40 bg-muted text-muted-foreground"
      }`}
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
function DaySelector({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const labels = [
    { id: 0, short: "L" },
    { id: 1, short: "M" },
    { id: 2, short: "X" },
    { id: 3, short: "J" },
    { id: 4, short: "V" },
    { id: 5, short: "S" },
    { id: 6, short: "D" },
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
            className={`h-8 w-8 rounded-md text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => {
              const next = new Set(selected);
              if (active) next.delete(day.id);
              else next.add(day.id);
              const sorted = Array.from(next).sort((a, b) => a - b);
              onChange(sorted.length ? sorted : [0, 1, 2, 3, 4, 5, 6]);
            }}
            aria-label={`Dia ${day.id}`}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

export default function BloquesDashboardPage() {
  const { filters, setCampusIds, setFacultadIds, setBloqueIds, setTipoBloqueIds, setIncludeInactive, setSlotMinutes, setDias } = useBloqueDashboardFilters();
  const { data, loading } = useBloqueDashboardData({ filters });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [allFacultadOptions, setAllFacultadOptions] = useState<FacultadOption[]>([]);
  const [allBloqueOptions, setAllBloqueOptions] = useState<BloqueOption[]>([]);
  const [tipoBloqueOptions, setTipoBloqueOptions] = useState<TipoBloqueOption[]>([]);

  useEffect(() => {
    let active = true;
    async function loadCatalogs() {
      try {
        const [campus, facultades, bloques, tiposBloque] = await Promise.all([
          apiFetch<{ items: CampusOption[] }>("/campus?page=1&limit=50"),
          apiFetch<{ items: Array<FacultadOption | (Omit<FacultadOption, "campus_id"> & { campus_id: string })> }>("/facultades?page=1&limit=200"),
          apiFetch<{ items: Array<BloqueOption | (Omit<BloqueOption, "facultad_id"> & { facultad_id: string })> }>("/bloques?page=1&limit=200"),
          apiFetch<{ items: TipoBloqueOption[] }>("/tipo_bloques?page=1&limit=100"),
        ]);

        if (active) {
          setCampusOptions(campus.items ?? []);
          setAllFacultadOptions((facultades.items ?? []).map((item) => ({ id: Number(item.id), nombre: String(item.nombre), campus_id: Number(item.campus_id) })).filter((item) => Number.isInteger(item.id) && item.id > 0 && Number.isInteger(item.campus_id) && item.campus_id > 0 && item.nombre.trim().length > 0));
          setAllBloqueOptions((bloques.items ?? []).map((item) => ({ id: Number(item.id), nombre: String(item.nombre), facultad_id: Number(item.facultad_id) })).filter((item) => Number.isInteger(item.id) && item.id > 0 && Number.isInteger(item.facultad_id) && item.facultad_id > 0 && item.nombre.trim().length > 0));
          setTipoBloqueOptions((tiposBloque.items ?? []).map((item) => ({ id: Number(item.id), nombre: String(item.nombre) })).filter((item) => Number.isInteger(item.id) && item.id > 0 && item.nombre.trim().length > 0));
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
    return allBloqueOptions.filter((item) => selectedFacultades.has(item.facultad_id));
  }, [allBloqueOptions, filters.facultadIds]);

  useEffect(() => {
    if (!filters.facultadIds.length) return;
    const allowed = new Set(facultadOptions.map((item) => item.id));
    const next = filters.facultadIds.filter((id) => allowed.has(id));
    if (next.length !== filters.facultadIds.length) setFacultadIds(next);
  }, [facultadOptions, filters.facultadIds, setFacultadIds]);

  useEffect(() => {
    if (!filters.bloqueIds.length) return;
    const allowed = new Set(bloqueOptions.map((item) => item.id));
    const next = filters.bloqueIds.filter((id) => allowed.has(id));
    if (next.length !== filters.bloqueIds.length) setBloqueIds(next);
  }, [bloqueOptions, filters.bloqueIds, setBloqueIds]);

  return (
    <div className="space-y-6 pt-2">
      <div className="sticky top-14 z-20 space-y-3 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Dashboard Bloques</h1>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelect label="Campus" options={campusOptions} selectedIds={filters.campusIds} emptyLabel="Selecciona campus" onChange={setCampusIds} />
            <MultiSelect label="Facultades" options={facultadOptions} selectedIds={filters.facultadIds} emptyLabel="Selecciona facultades" onChange={setFacultadIds} />
            <MultiSelect label="Bloques" options={bloqueOptions} selectedIds={filters.bloqueIds} emptyLabel="Selecciona bloques" onChange={setBloqueIds} />
            <MultiSelect label="Tipos de bloque" options={tipoBloqueOptions} selectedIds={filters.tipoBloqueIds} emptyLabel="Selecciona tipos" onChange={setTipoBloqueIds} />
            <SwitchInactive checked={filters.includeInactive} onCheckedChange={setIncludeInactive} />
          </div>
          <Button asChild>
            <Link href="/dashboard/bloques/list">Administrar Bloques</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <Label htmlFor="slot-minutes-filter">Periodo de tiempo</Label>
            <select id="slot-minutes-filter" aria-label="Periodo de tiempo" className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.slotMinutes} onChange={(event) => setSlotMinutes(Number(event.target.value) as 15 | 30 | 45 | 60 | 90)}>
              <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option>
            </select>
          </div>
          <div className="space-y-2"><Label>Dias</Label><DaySelector value={filters.dias} onChange={setDias} /></div>
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

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard loading={loading} title="Top bloques sobrecargados" option={buildTopUtilizationOption(globalData?.charts.topBloquesUtilizacion.sobrecargadosTop10 ?? [])} />
        <ChartCard loading={loading} title="Top bloques subutilizados" option={buildTopUtilizationOption(globalData?.charts.topBloquesUtilizacion.subutilizadosTop10 ?? [])} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard loading={loading} title="Top pisos sobrecargados" option={buildTopFloorUtilizationOption(globalData?.charts.topPisosUtilizacion.sobrecargadosTop10 ?? [])} />
        <ChartCard loading={loading} title="Top pisos subutilizados" option={buildTopFloorUtilizationOption(globalData?.charts.topPisosUtilizacion.subutilizadosTop10 ?? [])} />
      </div>

      <ChartCard loading={loading} title="Heatmap semanal de ocupacion" option={buildWeeklyHeatmapOption(globalData?.charts.ocupacionHeatmapSemanal ?? [])} height={380} />
      <ChartCard loading={loading} title="Ocupacion por bloque" option={buildOccupationByBlockOption(globalData?.charts.ocupacionPorBloque ?? [])} height={360} />

      <ResumenBloquesTable loading={loading} rows={globalData?.tables.resumenBloques ?? []} />
      <PisosUtilizacionTable loading={loading} rows={globalData?.tables.pisosUtilizacion ?? []} />
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

function buildOccupationByBlockOption(rows: GlobalCharts["ocupacionPorBloque"]) {
  const sorted = [...rows].sort((a, b) => b.pctOcupacion - a.pctOcupacion);
  const hasZoom = sorted.length > 10;
  const zoomEnd = Math.min(100, (10 / Math.max(sorted.length, 1)) * 100);
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 20, bottom: hasZoom ? 90 : 50, containLabel: true },
    dataZoom: hasZoom ? [{ type: "inside", xAxisIndex: 0, start: 0, end: zoomEnd }, { type: "slider", xAxisIndex: 0, height: 14, bottom: 16, start: 0, end: zoomEnd }] : undefined,
    xAxis: { type: "category", data: sorted.map((row) => row.bloqueNombre), axisLabel: { interval: 0, hideOverlap: false, rotate: 25 } },
    yAxis: { type: "value", max: 100 },
    series: [{ type: "bar", data: sorted.map((row) => row.pctOcupacion), itemStyle: { color: "#2563eb" }, label: { show: true, position: "top", formatter: ({ value }: { value: number }) => `${value}%` } }],
  };
}

function buildTopUtilizationOption(rows: GlobalCharts["topBloquesUtilizacion"]["sobrecargadosTop10"]) {
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", max: 100 },
    yAxis: { type: "category", inverse: true, data: rows.map((row) => row.bloqueNombre) },
    series: [{ type: "bar", data: rows.map((row) => row.pctOcupacion), itemStyle: { color: "#ef4444" }, label: { show: true, position: "right", formatter: ({ value }: { value: number }) => `${value}%` } }],
  };
}

function buildTopFloorUtilizationOption(rows: GlobalCharts["topPisosUtilizacion"]["sobrecargadosTop10"]) {
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", max: 100 },
    yAxis: { type: "category", inverse: true, data: rows.map((row) => `${row.bloqueNombre} - Piso ${row.piso}`) },
    series: [{ type: "bar", data: rows.map((row) => row.pctOcupacion), itemStyle: { color: "#f97316" }, label: { show: true, position: "right", formatter: ({ value }: { value: number }) => `${value}%` } }],
  };
}

function buildWeeklyHeatmapOption(rows: GlobalCharts["ocupacionHeatmapSemanal"]) {
  const dayLabels: Record<number, string> = { 0: "Lunes", 1: "Martes", 2: "Miercoles", 3: "Jueves", 4: "Viernes", 5: "Sabado", 6: "Domingo" };
  const fixedDays = [6, 5, 4, 3, 2, 1, 0];
  const franjas = Array.from(new Set(rows.map((item) => item.franja)));
  const data = rows.map((row) => [franjas.indexOf(row.franja), fixedDays.indexOf(row.dia), row.pctOcupacion]);

  return {
    tooltip: { formatter: (params: { data: [number, number, number] }) => { const [x, y, pct] = params.data; return `${dayLabels[fixedDays[y]]} ${franjas[x]}: ${pct}%`; } },
    grid: { left: 90, right: 90, top: 20, bottom: 40 },
    xAxis: { type: "category", data: franjas },
    yAxis: { type: "category", data: fixedDays.map((day) => dayLabels[day]) },
    visualMap: { min: 0, max: 100, calculable: true, orient: "vertical", right: 10, top: "middle", inRange: { color: ["#dbeafe", "#fbcfe8", "#fecaca"] } },
    series: [{ type: "heatmap", data }],
  };
}

function ResumenBloquesTable({ loading, rows }: { loading: boolean; rows: BloqueDashboardGlobalResponse["data"]["tables"]["resumenBloques"] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term.length) return rows;
    return rows.filter((row) => row.bloqueNombre.toLowerCase().includes(term) || row.facultadNombre.toLowerCase().includes(term) || row.campusNombre.toLowerCase().includes(term) || row.tipoBloqueNombre.toLowerCase().includes(term));
  }, [rows, search]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumen de bloques</h2>
        <Input placeholder="Buscar campus, facultad, bloque o tipo" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full max-w-xs" />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="px-3 py-2">Campus</th><th className="px-3 py-2">Facultad</th><th className="px-3 py-2">Bloque</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Pisos</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Ambientes</th><th className="px-3 py-2">Cap. total</th><th className="px-3 py-2">Cap. examen</th><th className="px-3 py-2">Activos</th><th className="px-3 py-2">Ocupacion</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="px-3 py-4" colSpan={11}><Skeleton className="h-5 w-48" /></td></tr> : filtered.length ? filtered.map((row) => <tr key={row.bloqueId} className="hover:bg-muted/50"><td className="px-3 py-2">{row.campusNombre}</td><td className="px-3 py-2">{row.facultadNombre}</td><td className="px-3 py-2">{row.bloqueNombre}</td><td className="px-3 py-2">{row.tipoBloqueNombre}</td><td className="px-3 py-2">{row.pisos}</td><td className="px-3 py-2">{row.activo ? "Activo" : "Inactivo"}</td><td className="px-3 py-2">{row.ambientes}</td><td className="px-3 py-2">{row.capacidadTotal}</td><td className="px-3 py-2">{row.capacidadExamen}</td><td className="px-3 py-2">{row.activosAsignados}</td><td className="px-3 py-2">{row.pctOcupacion}%</td></tr>) : <tr><td className="px-3 py-4 text-muted-foreground" colSpan={11}>Sin datos para mostrar.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PisosUtilizacionTable({ loading, rows }: { loading: boolean; rows: BloqueDashboardGlobalResponse["data"]["tables"]["pisosUtilizacion"] }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Utilizacion por piso</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="px-3 py-2">Bloque</th><th className="px-3 py-2">Piso</th><th className="px-3 py-2">Ambientes</th><th className="px-3 py-2">Cap. total</th><th className="px-3 py-2">Cap. examen</th><th className="px-3 py-2">Activos</th><th className="px-3 py-2">Slots ocupados</th><th className="px-3 py-2">Slots totales</th><th className="px-3 py-2">Ocupacion</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="px-3 py-4" colSpan={9}><Skeleton className="h-5 w-48" /></td></tr> : rows.length ? rows.map((row) => <tr key={`${row.bloqueId}-${row.piso}`} className="hover:bg-muted/50"><td className="px-3 py-2">{row.bloqueNombre}</td><td className="px-3 py-2">{row.piso}</td><td className="px-3 py-2">{row.ambientes}</td><td className="px-3 py-2">{row.capacidadTotal}</td><td className="px-3 py-2">{row.capacidadExamen}</td><td className="px-3 py-2">{row.activosAsignados}</td><td className="px-3 py-2">{row.slotsOcupados}</td><td className="px-3 py-2">{row.slotsTotales}</td><td className="px-3 py-2">{row.pctOcupacion}%</td></tr>) : <tr><td className="px-3 py-4 text-muted-foreground" colSpan={9}>Sin datos para mostrar.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
