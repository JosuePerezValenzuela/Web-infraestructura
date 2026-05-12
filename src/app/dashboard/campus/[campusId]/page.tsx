"use client";

import { Suspense, use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampusDashboardFilters } from "@/features/campus-dashboard/hooks/useCampusDashboardFilters";
import { useCampusDashboardData } from "@/features/campus-dashboard/hooks/useCampusDashboardData";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import { CHART_PALETTES } from "@/config/dashboard-colors";
import type { CampusDashboardDetailResponse } from "@/features/campus-dashboard/schema";
import { Users, ChevronLeft } from "lucide-react";

type CampusOption = { id: number; nombre: string };

export default function CampusDashboardDetailPage({
  params,
}: {
  params: { campusId: string } | Promise<{ campusId: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CampusDashboardDetailContent params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b py-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

function CampusDashboardDetailContent({
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

  const { buildGlobalHref } = useCampusDashboardFilters();

  const { data, loading } = useCampusDashboardData({
    mode: "detail",
    campusId,
    filters: { includeInactive: true, campusIds: [] },
  });

  const detailData = (data && data.layout.mode === "detail") 
    ? (data as CampusDashboardDetailResponse).data 
    : undefined;

  const campusLabel = detailData?.campus?.nombre 
    ? detailData.campus.nombre 
    : `Campus ${campusId}`;

  const charts = detailData?.charts;
  const porFacultad = detailData?.porFacultad ?? [];

  const buildFacultadDashboardHref = useMemo(() => {
    return (facultadId: number) => {
      return `/dashboard/facultades/${facultadId}`;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b py-3">
        {/* Breadcrumb + Campus info */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => router.push(buildGlobalHref())}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Volver</span>
            </button>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground/70">Dashboard</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/campus/list">
              <Users className="mr-2 h-4 w-4" />
              Administrar Campus
            </Link>
          </Button>
        </div>

        {/* Campus label */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Campus:
          </span>
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <span className="text-2xl font-bold text-foreground">
              {campusLabel}
            </span>
          )}
        </div>
      </div>

      {/* KPIs Grid */}
      <DetailKpiGrid kpis={detailData?.kpis} loading={loading} />

      {/* Charts: Tipos de Bloque y Ambiente */}
      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-lg" />
          ))
        ) : (
          <>
            <HorizontalBarChart
              title="Tipos de Bloque"
              data={charts?.tiposBloque ?? []}
              labelKey="tipoBloqueNombre"
              valueKey="cantidad"
              height={320}
            />
            <HorizontalBarChart
              title="Tipos de Ambiente"
              data={charts?.tiposAmbiente ?? []}
              labelKey="tipoAmbienteNombre"
              valueKey="cantidad"
              height={320}
            />
          </>
        )}
      </div>

      {/* Tabla de Facultades */}
      <FacultiesTable
        loading={loading}
        rows={porFacultad}
        onRowClick={(facultadId) => router.push(buildFacultadDashboardHref(facultadId))}
      />
    </div>
  );
}

function HorizontalBarChart({
  title,
  data,
  labelKey,
  valueKey,
  height = 300,
}: {
  title: string;
  data: Array<{ [key: string]: unknown }>;
  labelKey: string;
  valueKey: string;
  height?: number;
}) {
  const hasData = data.length > 0 && data.some((item) => (item[valueKey] as number) > 0);

  const option = useMemo(() => {
    // Filtrar solo items con cantidad > 0 y ordenar de mayor a menor
    const filteredData = data
      .filter((item) => (item[valueKey] as number) > 0)
      .sort((a, b) => Number(b[valueKey] ?? 0) - Number(a[valueKey] ?? 0));

    if (filteredData.length === 0) return null;

    const labels = filteredData.map((item) => String(item[labelKey] ?? "Sin nombre"));
    const values = filteredData.map((item) => Number(item[valueKey] ?? 0));

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        formatter: (params: { name: string; value: number }[]) => {
          const item = params[0];
          return `<strong>${item.name}</strong><br/>Cantidad: <strong>${item.value.toLocaleString()}</strong>`;
        },
      },
      grid: {
        left: "3%",
        right: "8%",
        bottom: "3%",
        top: "5%",
        containLabel: true,
      },
      xAxis: {
        type: "value" as const,
        splitLine: {
          lineStyle: {
            type: "dashed" as const,
            opacity: 0.2,
            color: "var(--border)",
          },
        },
        axisLabel: { color: "var(--muted-foreground)" },
      },
      yAxis: {
        type: "category" as const,
        inverse: true,
        data: labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisLabel: {
          color: "var(--foreground)",
          fontWeight: 500,
          fontSize: 11,
        },
      },
      series: [
        {
          type: "bar" as const,
          data: values,
          barWidth: "50%",
          itemStyle: {
            color: CHART_PALETTES.capacity[0], // Azul claro para barras
            borderRadius: [0, 4, 4, 0],
          },
          emphasis: {
            itemStyle: {
              opacity: 0.8,
            },
          },
          label: {
            show: true,
            position: "right" as const,
            formatter: (params: { value: number }) => params.value.toLocaleString(),
            color: "var(--foreground)",
            fontSize: 11,
            fontWeight: "bold",
          },
        },
      ],
    };
  }, [data, labelKey, valueKey]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {hasData && option ? (
        <div className="mt-3">
          <HorizontalBarChartRenderer option={option} height={height} />
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          Sin datos para {title}.
        </div>
      )}
    </div>
  );
}

// Componente separado para renderizar ECharts (evita problemas de tipos)
import dynamic from "next/dynamic";

const HorizontalBarChartRenderer = dynamic(
  () =>
    Promise.all([
      import("echarts-for-react"),
      import("@/config/dashboard-colors"),
    ]).then(([echarts]) => {
      const ReactECharts = echarts.default;
      return function ChartRenderer({
        option,
        height,
      }: {
        option: object;
        height: number;
      }) {
        return (
          <ReactECharts option={option} style={{ height }} opts={{ locale: "es" }} />
        );
      };
    }),
  { ssr: false }
);

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

function FacultiesTable({
  loading,
  rows,
  onRowClick,
}: {
  loading: boolean;
  rows: CampusDashboardDetailResponse["data"]["porFacultad"];
  onRowClick: (facultadId: number) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term.length) return rows;
    return rows.filter((row) => row.nombre.toLowerCase().includes(term));
  }, [rows, search]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Facultades del campus</h2>
        <Input
          placeholder="Buscar facultad..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Facultad</th>
              <th className="px-4 py-3 text-right font-medium">Bloques</th>
              <th className="px-4 py-3 text-right font-medium">Ambientes</th>
              <th className="px-4 py-3 text-right font-medium">Cap. Total</th>
              <th className="px-4 py-3 text-right font-medium">Cap. Examen</th>
              <th className="px-4 py-3 text-right font-medium">Asignados</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4" colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.length ? (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="group cursor-pointer hover:bg-muted/40"
                  onClick={() => onRowClick(row.id)}
                >
                  <td className="px-4 py-3 font-medium group-hover:text-primary">
                    {row.nombre}
                  </td>
                  <td className="px-4 py-3 text-right">{row.bloques.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{row.ambientes.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {row.capacidad.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.capacidad.examen.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {row.activos.asignados.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={6}
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