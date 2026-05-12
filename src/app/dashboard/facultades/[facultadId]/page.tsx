"use client";

import { Suspense, use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacultadDashboardData } from "@/features/facultad-dashboard/hooks/useFacultadDashboardData";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import { RankingChartCard } from "@/features/campus-dashboard/components/RankingChartCard";
import { DistributionChartCard } from "@/features/campus-dashboard/components/DistributionChartCard";
import type { FacultadDashboardDetailResponse } from "@/features/facultad-dashboard/schema";

type CampusOption = { id: number; nombre: string };

export default function FacultadDashboardDetailPage({
  params,
}: {
  params: { facultadId: string } | Promise<{ facultadId: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <FacultadDashboardDetailContent params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b py-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
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

function FacultadDashboardDetailContent({
  params,
}: {
  params: { facultadId: string } | Promise<{ facultadId: string }>;
}) {
  const router = useRouter();
  const resolvedParams =
    typeof (params as unknown as Promise<unknown>)?.then === "function"
      ? use(params as Promise<{ facultadId: string }>)
      : (params as { facultadId: string });
  const facultadId = Number(resolvedParams.facultadId);

  // Siempre includeInactive=true
  const { data, loading } = useFacultadDashboardData({
    mode: "detail",
    facultadId,
    filters: { includeInactive: true, campusIds: [], facultadIds: [] },
  });

  const detailData = (data && data.layout.mode === "detail")
    ? (data as FacultadDashboardDetailResponse).data
    : undefined;

  const facultad = detailData?.facultad;
  const rankings = detailData?.rankings;
  const distribuciones = detailData?.distribuciones;
  const porBloque = detailData?.porBloque ?? [];

  // Transformar datos para los componentes
  const rankingPorCantidad = useMemo(() => {
    return rankings?.porCantidadAmbientes.map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
    })) ?? [];
  }, [rankings]);

  const rankingPorCapacidad = useMemo(() => {
    return rankings?.porCapacidadTotal.map((item) => ({
      nombre: item.nombre,
      capacidad: item.capacidad,
    })) ?? [];
  }, [rankings]);

  const distributionData = useMemo(() => {
    return distribuciones?.tiposAmbientePorBloque.map((item) => ({
      nombre: item.nombre,
      cantidadTotal: item.cantidadTotal,
      tipos: item.tipos.map((t) => ({
        tipo: t.tipo || "Sin especificar",
        cantidad: t.cantidad,
      })),
    })) ?? [];
  }, [distribuciones]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b py-3">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 transition-colors hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Volver</span>
            </button>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground/70">Dashboard</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/facultades/list">
              <GraduationCap className="mr-2 h-4 w-4" />
              Administrar Facultades
            </Link>
          </Button>
        </div>

        {/* Faculty label */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Facultad:
          </span>
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <span className="text-2xl font-bold text-foreground">
              {facultad?.nombre ?? `Facultad ${facultadId}`}
            </span>
          )}
        </div>
        {/* Campus label (secondary) */}
        {facultad?.campusNombre && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Campus:
            </span>
            <span className="text-lg font-semibold text-muted-foreground">
              {facultad.campusNombre}
            </span>
          </div>
        )}
      </div>

      {/* KPIs Grid */}
      <DetailKpiGrid kpis={detailData?.kpis} loading={loading} />

      {/* Rankings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <RankingChartCard
          title="Top Bloques por Cantidad de Ambientes"
          loading={loading}
          data={rankingPorCantidad}
          valueKey="cantidad"
          seriesName="Ambientes"
        />
        <RankingChartCard
          title="Top Bloques por Capacidad Total"
          loading={loading}
          data={rankingPorCapacidad}
          valueKey="capacidad"
          seriesName="Capacidad"
        />
      </div>

      {/* Distribution Chart */}
      <DistributionChartCard
        title="Distribución de Tipos de Ambiente por Bloque"
        loading={loading}
        data={distributionData}
        height={400}
      />

      {/* Table */}
      <BloquesTable
        loading={loading}
        rows={porBloque}
        onRowClick={(bloqueId) => {
          // Navegar al dashboard de bloque
          const params = new URLSearchParams();
          params.set("bloqueIds", String(bloqueId));
          params.set("facultadIds", String(facultadId));
          params.set("campusIds", String(facultad?.campusId ?? ""));
          params.set("includeInactive", "true");
          router.push(`/dashboard/bloques?${params.toString()}`);
        }}
      />
    </div>
  );
}

function DetailKpiGrid({
  kpis,
  loading,
}: {
  kpis: FacultadDashboardDetailResponse["data"]["kpis"] | undefined;
  loading: boolean;
}) {
  const cards = [
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
        { label: "Sin asignar", value: kpis?.activos.sinAsignarGlobal ?? 0 },
      ],
    },
    {
      type: "capacity" as const,
      title: "Capacidad",
      total: kpis?.capacidad.total ?? 0,
      examen: kpis?.capacidad.examen ?? 0,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

function BloquesTable({
  loading,
  rows,
  onRowClick,
}: {
  loading: boolean;
  rows: FacultadDashboardDetailResponse["data"]["porBloque"];
  onRowClick: (bloqueId: number) => void;
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
        <h2 className="text-lg font-semibold">Bloques de la facultad</h2>
        <Input
          placeholder="Buscar bloque..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Bloque</th>
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
                  <td className="px-4 py-4" colSpan={5}>
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
                  <td className="px-4 py-3 text-right">
                    {row.ambientes.toLocaleString()}
                  </td>
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
                  colSpan={5}
                >
                  No hay bloques registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}