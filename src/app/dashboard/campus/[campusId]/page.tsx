"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useCampusDashboardFilters } from "@/features/campus-dashboard/hooks/useCampusDashboardFilters";
import { useCampusDashboardData } from "@/features/campus-dashboard/hooks/useCampusDashboardData";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import type { CampusDashboardDetailResponse } from "@/features/campus-dashboard/schema";

type CampusOption = { id: number; nombre: string };

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
        // Si falla, se mostrará solo el label con el id.
      }
    }
    void loadCampus();
    return () => {
      active = false;
    };
  }, []);

  const campusLabel = useMemo(() => {
    const match = campusOptions.find((option) => option.id === campusId);
    if (match) return match.nombre;
    const fromPayload = data && data.layout.mode === "detail"
      ? data.data.campus?.nombre
      : null;
    return fromPayload ?? `Campus ${campusId}`;
  }, [campusId, campusOptions, data]);

  const charts =
    data && data.layout.mode === "detail" ? data.data.charts : undefined;
  const facultiesRows =
    data && data.layout.mode === "detail"
      ? data.data.tables.facultadesResumen
      : [];

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
          <Button
            type="button"
            onClick={() => router.push(buildGlobalHref())}
          >
            Volver
          </Button>
          <SwitchInactive
            checked={filters.includeInactive}
            onCheckedChange={setIncludeInactive}
          />
        </div>
      </div>

      <DetailKpiGrid
        kpis={data?.layout.mode === "detail" ? data.data.kpis : undefined}
        loading={loading}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-lg" />
          ))
        ) : (
          <>
            <ChartCard
              title="Cantidad por tipo de bloque"
              option={buildHorizontalBarOption(
                charts?.tiposBloque ?? [],
                "tipoBloqueNombre",
                "cantidad"
              )}
              height={320}
            />
            <ChartCard
              title="Cantidad por tipo de ambiente"
              option={buildHorizontalBarOption(
                charts?.tiposAmbiente ?? [],
                "tipoAmbienteNombre",
                "cantidad"
              )}
              height={320}
            />
          </>
        )}
      </div>

      <FacultiesTable loading={loading} rows={facultiesRows} />
    </div>
  );
}

function DetailKpiGrid({
  kpis,
  loading,
}: {
  kpis: CampusDashboardDetailResponse["data"]["kpis"] | undefined;
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
      {cards.map((card) => {
        if (card.type === "donut") {
          return (
            <DonutKpiCard
              key={card.title}
              title={card.title}
              data={card.data}
              loading={loading}
            />
          );
        }
        return (
          <CapacityKpiCard
            key={card.title}
            title={card.title}
            total={card.total}
            examen={card.examen}
            loading={loading}
          />
        );
      })}
    </div>
  );
}

function ChartCard({
  title,
  option,
  height = 300,
}: {
  title: string;
  option: any;
  height?: number;
}) {
  const hasData =
    option && option.series && option.series.some((s: any) => s.data?.length);
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      {hasData ? (
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

function buildHorizontalBarOption(
  rows: Array<Record<string, unknown>>,
  labelKey: string,
  valueKey: string
) {
  const sorted = [...rows].sort(
    (a, b) => Number(b[valueKey] ?? 0) - Number(a[valueKey] ?? 0)
  );
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      inverse: true,
      data: sorted.map((row) => String(row[labelKey] ?? "")),
      axisLabel: { formatter: (value: string) => value || "Sin nombre" },
    },
    series: [
      {
        type: "bar",
        data: sorted.map((row) => Number(row[valueKey] ?? 0)),
        itemStyle: { color: "#0ea5e9" },
        label: { show: true, position: "right" },
      },
    ],
  };
}

function FacultiesTable({
  loading,
  rows,
}: {
  loading: boolean;
  rows: CampusDashboardDetailResponse["data"]["tables"]["facultadesResumen"];
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term.length) return rows;
    return rows.filter((row) =>
      row.facultadNombre.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const columns = [
    { label: "Facultad", key: "facultadNombre" },
    { label: "Bloques", key: "bloques" },
    { label: "Tipos bloque", key: "tiposBloque" },
    { label: "Ambientes", key: "ambientes" },
    { label: "Tipos ambiente", key: "tiposAmbiente" },
    { label: "Capacidad total", key: "capacidadTotal" },
    { label: "Capacidad examen", key: "capacidadExamen" },
    { label: "Activos asignados", key: "activosAsignados" },
  ] as const;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Facultades del campus</h2>
        <Input
          placeholder="Buscar facultad"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={columns.length}>
                  <Skeleton className="h-5 w-48" />
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((row) => (
                <tr key={row.facultadId} className="hover:bg-muted/50">
                  <td className="px-3 py-2">{row.facultadNombre}</td>
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
                <td
                  className="px-3 py-4 text-muted-foreground"
                  colSpan={columns.length}
                >
                  No hay facultades registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
