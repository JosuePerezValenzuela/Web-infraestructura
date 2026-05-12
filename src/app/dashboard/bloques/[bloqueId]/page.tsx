"use client";

import { Suspense, use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBloqueDashboardData } from "@/features/bloque-dashboard/hooks/useBloqueDashboardData";
import { DonutKpiCard } from "@/features/campus-dashboard/components/DonutKpiCard";
import { CapacityKpiCard } from "@/features/campus-dashboard/components/CapacityKpiCard";
import { PieChartCard } from "@/features/campus-dashboard/components/PieChartCard";
import type { BloqueDashboardDetailResponse } from "@/features/bloque-dashboard/schema";
import Link from "next/link";

type BloqueOption = { id: number; nombre: string };

export default function BloqueDashboardDetailPage({
  params,
}: {
  params: { bloqueId: string } | Promise<{ bloqueId: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <BloqueDashboardDetailContent params={params} />
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
        {Array.from({ length: 3 }).map((_, i) => (
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

function BloqueDashboardDetailContent({
  params,
}: {
  params: { bloqueId: string } | Promise<{ bloqueId: string }>;
}) {
  const router = useRouter();
  const resolvedParams =
    typeof (params as unknown as Promise<unknown>)?.then === "function"
      ? use(params as Promise<{ bloqueId: string }>)
      : (params as { bloqueId: string });
  const bloqueId = Number(resolvedParams.bloqueId);

  // Siempre includeInactive=true
  const { data, loading } = useBloqueDashboardData({
    mode: "detail",
    bloqueId,
    filters: { includeInactive: true, campusIds: [], facultadIds: [], bloqueIds: [], tipoBloqueIds: [] },
  });

  const detailData = (data && data.layout.mode === "detail")
    ? (data as BloqueDashboardDetailResponse).data
    : undefined;

  const bloque = detailData?.bloque;
  const kpis = detailData?.kpis;
  const charts = detailData?.charts;
  const porAmbiente = detailData?.porAmbiente ?? [];

  // Preparar datos para el pie chart de tipos de ambiente
  const tiposAmbienteData = useMemo(() => {
    return (charts?.tiposAmbiente ?? []).map((item) => ({
      tipo: item.tipo,
      cantidad: item.cantidad,
    }));
  }, [charts]);

  // Preparar datos para la tabla
  const [search, setSearch] = useState("");
  const filteredAmbientes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return porAmbiente;
    return porAmbiente.filter(
      (item) =>
        item.nombre.toLowerCase().includes(term) ||
        item.tipoAmbiente.toLowerCase().includes(term)
    );
  }, [porAmbiente, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b py-3">
        {/* Breadcrumb + actions */}
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
            <Link href="/dashboard/bloques/list">
              <Building2 className="mr-2 h-4 w-4" />
              Administrar Bloques
            </Link>
          </Button>
        </div>

        {/* Bloque label */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Bloque:
          </span>
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <span className="text-2xl font-bold text-foreground">
              {bloque?.nombre ?? `Bloque ${bloqueId}`}
            </span>
          )}
        </div>

        {/* Facultad & Campus labels (secondary) */}
        {bloque?.facultadNombre && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Facultad:
            </span>
            <span className="text-lg font-semibold text-muted-foreground">
              {bloque.facultadNombre}
            </span>
          </div>
        )}
        {bloque?.campusNombre && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Campus:
            </span>
            <span className="text-lg font-semibold text-muted-foreground">
              {bloque.campusNombre}
            </span>
          </div>
        )}
      </div>

      {/* KPIs Grid */}
      <DetailKpiGrid kpis={kpis} loading={loading} />

      {/* Chart */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PieChartCard
          title="Tipos de Ambiente"
          data={tiposAmbienteData}
          loading={loading}
          height={320}
        />
      </div>

      {/* Ambientes Table */}
      <AmbientesTable
        rows={filteredAmbientes}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        totalCount={porAmbiente.length}
        onRowClick={(id) => router.push(`/dashboard/ambientes/${id}`)}
      />
    </div>
  );
}

function DetailKpiGrid({
  kpis,
  loading,
}: {
  kpis: BloqueDashboardDetailResponse["data"]["kpis"] | undefined;
  loading: boolean;
}) {
  const cards = [
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

function AmbientesTable({
  rows,
  loading,
  search,
  onSearchChange,
  totalCount,
  onRowClick,
}: {
  rows: BloqueDashboardDetailResponse["data"]["porAmbiente"];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  onRowClick: (ambienteId: number) => void;
}) {
  const [sortBy, setSortBy] = useState<"nombre" | "piso" | "capacidadTotal" | "tipoAmbiente">("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortBy === "nombre") {
        aValue = a.nombre.toLowerCase();
        bValue = b.nombre.toLowerCase();
      } else if (sortBy === "piso") {
        aValue = a.piso;
        bValue = b.piso;
      } else if (sortBy === "capacidadTotal") {
        aValue = a.capacidad.total;
        bValue = b.capacidad.total;
      } else {
        aValue = a.tipoAmbiente.toLowerCase();
        bValue = b.tipoAmbiente.toLowerCase();
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDir === "asc" ? aValue - bValue : bValue - aValue;
      }
      return sortDir === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [rows, sortBy, sortDir]);

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  };

  const sortIcon = (column: typeof sortBy) =>
    sortBy === column ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Ambientes del Bloque
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({totalCount} total)
          </span>
        </h2>
        <Input
          placeholder="Buscar ambiente o tipo"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th
                className="cursor-pointer px-3 py-2"
                onClick={() => toggleSort("nombre")}
              >
                Nombre{sortIcon("nombre")}
              </th>
              <th
                className="cursor-pointer px-3 py-2"
                onClick={() => toggleSort("piso")}
              >
                Piso{sortIcon("piso")}
              </th>
              <th
                className="cursor-pointer px-3 py-2"
                onClick={() => toggleSort("tipoAmbiente")}
              >
                Tipo{sortIcon("tipoAmbiente")}
              </th>
              <th
                className="cursor-pointer px-3 py-2"
                onClick={() => toggleSort("capacidadTotal")}
              >
                Cap. Total{sortIcon("capacidadTotal")}
              </th>
              <th className="px-3 py-2">Cap. Examen</th>
              <th className="px-3 py-2">Activos Asignados</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>
                  <Skeleton className="h-5 w-48" />
                </td>
              </tr>
            ) : sorted.length ? (
              sorted.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => onRowClick(row.id)}
                >
                  <td className="px-3 py-2 font-medium">{row.nombre}</td>
                  <td className="px-3 py-2">{row.piso}</td>
                  <td className="px-3 py-2">{row.tipoAmbiente}</td>
                  <td className="px-3 py-2">{row.capacidad.total}</td>
                  <td className="px-3 py-2">{row.capacidad.examen}</td>
                  <td className="px-3 py-2">{row.activos.asignados}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-3 py-4 text-muted-foreground"
                  colSpan={6}
                >
                  Sin ambientes para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}