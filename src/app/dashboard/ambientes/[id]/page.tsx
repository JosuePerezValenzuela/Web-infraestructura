"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";

import { EnvironmentReportAction } from "@/features/reports/environment/EnvironmentReportAction";

type Props = {
  params: Promise<{ id: string }>;
};

type Ambiente = {
  id: number;
  codigo: string;
  nombre: string;
  nombre_corto: string | null;
  piso: number;
  capacidad: { total: number; examen: number };
  dimension: { largo: number; ancho: number; alto: number; unid_med: string };
  clases: boolean;
  activo: boolean;
  creado_en: string;
  tipo_ambiente_id: number;
  tipo_ambiente_nombre: string;
  bloque_id: number;
  bloque_nombre: string;
  tipo_bloque_id: number;
  tipo_bloque_nombre: string;
  facultad_id: number;
  facultad_nombre: string;
  campus_id: number;
  campus_nombre: string;
};

type Horario = {
  dia: number;
  nombre_dia: string;
  apertura: string;
  cierre: string;
  periodo: number;
};

type ActivoItem = {
  id: number;
  nia: string;
  nombre: string;
  descripcion: string;
  creado_en: string;
  ambiente_id: number;
  ambiente_nombre: string;
  ambiente_codigo: string;
};

type ActivosResponse = {
  items: ActivoItem[];
  meta: {
    total: number;
    page: number;
    take: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type DetailResponse = {
  ambiente: Ambiente;
  horarios: Horario[];
  activos: ActivosResponse;
};

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function buildSlots(start: string, end: string, period: number): string[] {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const slots: string[] = [];
  for (let current = startMinutes; current <= endMinutes - period; current += period) {
    slots.push(toTimeString(current));
  }
  return slots;
}

function ScheduleGrid({ horarios }: { horarios: Horario[] }) {
  const aperturaMasBaja = useMemo(() => {
    if (horarios.length === 0) return "07:00";
    return horarios.reduce((min, h) => toMinutes(h.apertura) < toMinutes(min) ? h.apertura : min, horarios[0].apertura);
  }, [horarios]);

  const cierreMasAlto = useMemo(() => {
    if (horarios.length === 0) return "21:00";
    return horarios.reduce((max, h) => toMinutes(h.cierre) > toMinutes(max) ? h.cierre : max, horarios[0].cierre);
  }, [horarios]);

  const periodo = useMemo(() => {
    if (horarios.length === 0) return 45;
    return horarios[0].periodo;
  }, [horarios]);

  const slots = useMemo(() => buildSlots(aperturaMasBaja, cierreMasAlto, periodo), [aperturaMasBaja, cierreMasAlto, periodo]);

  const getHorarioForCell = (diaIndex: number, slot: string): Horario | undefined => {
    return horarios.find(h => {
      if (h.dia !== diaIndex) return false;
      const aperturaMin = toMinutes(h.apertura);
      const cierreMin = toMinutes(h.cierre);
      const slotMin = toMinutes(slot);
      return slotMin >= aperturaMin && slotMin < cierreMin;
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Hora</TableHead>
            {DAY_NAMES.map((day) => (
              <TableHead key={day} className="text-center">{day}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slots.map((slot) => (
            <TableRow key={slot}>
              <TableCell className="font-mono text-xs">{slot}</TableCell>
              {DAY_NAMES.map((_, diaIndex) => {
                const horario = getHorarioForCell(diaIndex, slot);
                return (
                  <TableCell key={diaIndex} className="text-center">
                    {horario ? (
                      <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                        {horario.apertura} - {horario.cierre}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AssetTable({ initialAssets }: { initialAssets: ActivoItem[] }) {
  const [data, setData] = useState<ActivoItem[]>(initialAssets);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter(item =>
      item.nia.toLowerCase().includes(term) ||
      item.nombre.toLowerCase().includes(term)
    );
  }, [data, search]);

  const columns: ColumnDef<ActivoItem>[] = useMemo(() => [
    {
      accessorKey: "nia",
      header: "NIA",
      cell: ({ row }) => <span className="font-mono">{row.original.nia}</span>,
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
    },
    {
      accessorKey: "descripcion",
      header: "Descripción",
    },
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-sm">
          <Label htmlFor="asset-search" className="sr-only">Buscar activo</Label>
          <Input
            id="asset-search"
            placeholder="Buscar por NIA o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: " 🔼",
                      desc: " 🔽",
                    }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No se encontraron activos
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EnvironmentDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadDetail() {
      try {
        setLoading(true);
        const data = await apiFetch<DetailResponse>(`/ambientes/${id}/detalle`, {
          signal: controller.signal,
        });
        if (!mounted) return;
        setDetail(data);
      } catch (error) {
        if (!mounted) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        notify.error({
          title: "Error al cargar",
          description: "No se pudo cargar la información del ambiente.",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Ambiente no encontrado</p>
        <Button variant="link" onClick={() => router.push("/dashboard/ambientes/list")}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const { ambiente, horarios, activos } = detail;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/ambientes/list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{ambiente.nombre}</h1>
            <p className="text-muted-foreground">Código: {ambiente.codigo}</p>
          </div>
        </div>
        <EnvironmentReportAction code={ambiente.codigo} name={ambiente.nombre} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Información del Ambiente</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Código</dt>
              <dd>{ambiente.codigo}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Nombre</dt>
              <dd>{ambiente.nombre}</dd>
            </div>
            {ambiente.nombre_corto && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Nombre Corto</dt>
                <dd>{ambiente.nombre_corto}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Piso</dt>
              <dd>{ambiente.piso}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Tipo de Ambiente</dt>
              <dd>{ambiente.tipo_ambiente_nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Bloque</dt>
              <dd>{ambiente.bloque_nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Tipo de Bloque</dt>
              <dd>{ambiente.tipo_bloque_nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Facultad</dt>
              <dd>{ambiente.facultad_nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Campus</dt>
              <dd>{ambiente.campus_nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Estado</dt>
              <dd>{ambiente.activo ? "Activo" : "Inactivo"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">¿Admite Clases?</dt>
              <dd>{ambiente.clases ? "Sí" : "No"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Capacidad y Dimensiones</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Capacidad Total</dt>
              <dd>{ambiente.capacidad.total} personas</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Capacidad Examen</dt>
              <dd>{ambiente.capacidad.examen} personas</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Largo</dt>
              <dd>{ambiente.dimension.largo} {ambiente.dimension.unid_med}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Ancho</dt>
              <dd>{ambiente.dimension.ancho} {ambiente.dimension.unid_med}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Alto</dt>
              <dd>{ambiente.dimension.alto} {ambiente.dimension.unid_med}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Superficie</dt>
              <dd>{ambiente.dimension.largo * ambiente.dimension.ancho} m²</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Horario de Atención</h2>
        {horarios.length > 0 ? (
          <ScheduleGrid horarios={horarios} />
        ) : (
          <p className="text-muted-foreground">No hay horarios asignados</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Activos Asociados ({activos.meta.total})</h2>
        {activos.items.length > 0 ? (
          <AssetTable initialAssets={activos.items} />
        ) : (
          <p className="text-muted-foreground">No hay activos asociados</p>
        )}
      </div>
    </div>
  );
}

export default function EnvironmentDetailPage({ params }: Props) {
  const resolvedParams = use(params);

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <EnvironmentDetailContent id={resolvedParams.id} />
    </Suspense>
  );
}
