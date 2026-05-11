"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampusDashboardFilters } from "@/features/campus-dashboard/hooks/useCampusDashboardFilters";
import { useCampusDashboardData } from "@/features/campus-dashboard/hooks/useCampusDashboardData";
import type { CampusDashboardGlobalResponse } from "@/features/campus-dashboard/schema";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import { RankingChartCard } from "@/features/campus-dashboard/components/RankingChartCard";
import { DistributionChartCard } from "@/features/campus-dashboard/components/DistributionChartCard";

export default function CampusDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CampusDashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b py-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[350px] w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-[350px] rounded-lg" />
          <Skeleton className="h-[350px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function CampusDashboardContent() {
  const router = useRouter();
  const { filters, buildDetailHref } = useCampusDashboardFilters();
  const { data, loading } = useCampusDashboardData({
    mode: "global",
    filters,
  });

  const globalData = (data && data.layout.mode === "global") ? (data as CampusDashboardGlobalResponse).data : undefined;
  const kpis = globalData?.kpis;
  const rankings = globalData?.rankings;
  const distribuciones = globalData?.distribuciones;
  const porCampus = globalData?.porCampus ?? [];

  return (
    <div className="space-y-6">
      <div className="sticky top-[-1rem] z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 py-3 backdrop-blur-sm">
        <h1 className="text-xl font-semibold">Dashboard Campus General</h1>
        <Button asChild>
          <Link href="/dashboard/campus/list">Administrar Campus</Link>
        </Button>
      </div>

      <KpiGrid kpis={kpis} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RankingChartCard
          title="Ranking de Ambientes por Campus"
          loading={loading}
          data={rankings?.porCantidadAmbientes ?? []}
          valueKey="cantidad"
          seriesName="Ambientes"
          color="oklch(0.553 0.013 58.071)" // Primary UMSS
        />
        <RankingChartCard
          title="Ranking de Capacidad Total por Campus"
          loading={loading}
          data={rankings?.porCapacidadTotal ?? []}
          valueKey="capacidad"
          seriesName="Capacidad"
          color="oklch(0.446 0.03 256.802)" // Deep Blue consistent with theme
        />
      </div>

      <div className="grid gap-6">
        <DistributionChartCard
          title="Distribución de Tipos de Bloque por Campus"
          loading={loading}
          data={distribuciones?.tiposBloquePorCampus ?? []}
        />
        <DistributionChartCard
          title="Distribución de Tipos de Ambiente por Campus"
          loading={loading}
          data={distribuciones?.tiposAmbientePorCampus ?? []}
        />
      </div>

      <CampusTable
        loading={loading}
        rows={porCampus}
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
      title: "Campus",
      data: [
        { label: "Activos", value: kpis?.campus.activos ?? 0 },
        { label: "Inactivos", value: kpis?.campus.inactivos ?? 0 },
      ],
    },
    {
      title: "Facultades",
      data: [
        { label: "Activos", value: kpis?.facultades.activos ?? 0 },
        { label: "Inactivos", value: kpis?.facultades.inactivos ?? 0 },
      ],
    },
    {
      title: "Bloques",
      data: [
        { label: "Activos", value: kpis?.bloques.activos ?? 0 },
        { label: "Inactivos", value: kpis?.bloques.inactivos ?? 0 },
      ],
    },
    {
      title: "Ambientes",
      data: [
        { label: "Activos", value: kpis?.ambientes.activos ?? 0 },
        { label: "Inactivos", value: kpis?.ambientes.inactivos ?? 0 },
      ],
    },
    {
      title: "Activos Fijos",
      data: [
        { label: "Asignados", value: kpis?.activos.asignados ?? 0 },
        { label: "Sin Asignar", value: kpis?.activos.sinAsignar ?? 0 },
      ],
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <DonutKpiCard
          key={card.title}
          title={card.title}
          data={card.data}
          loading={loading}
        />
      ))}
      <CapacityKpiCard
        title="Capacidad Estudiantil"
        total={kpis?.capacidad.total ?? 0}
        examen={kpis?.capacidad.examen ?? 0}
        loading={loading}
      />
    </div>
  );
}

function CampusTable({
  loading,
  rows,
  onRowClick,
}: {
  loading: boolean;
  rows: CampusDashboardGlobalResponse["data"]["porCampus"];
  onRowClick: (campusId: number) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term.length
      ? rows.filter((row) => row.nombre.toLowerCase().includes(term))
      : rows;
  }, [rows, search]);

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
        <h2 className="text-lg font-semibold">Resumen por Campus</h2>
        <Input
          placeholder="Filtrar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Campus</th>
              <th className="px-4 py-3 font-medium">Facultades</th>
              <th className="px-4 py-3 font-medium">Bloques</th>
              <th className="px-4 py-3 font-medium">Ambientes</th>
              <th className="px-4 py-3 font-medium text-right">Cap. Total</th>
              <th className="px-4 py-3 font-medium text-right">Cap. Examen</th>
              <th className="px-4 py-3 font-medium text-right">Asignados</th>
              <th className="px-4 py-3 font-medium text-right">Sin Asignar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3" colSpan={8}>
                    <Skeleton className="h-4 w-full" />
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
                  <td className="px-4 py-3">{row.facultades}</td>
                  <td className="px-4 py-3">{row.bloques}</td>
                  <td className="px-4 py-3">{row.ambientes}</td>
                  <td className="px-4 py-3 text-right">
                    {row.capacidad.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.capacidad.examen.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {row.activos.asignados.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {row.activos.sinAsignar.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={8}>
                  No se encontraron resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
