"use client";

import { Suspense, use, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Ruler,
  Users,
  Clock,
  Package,
  GraduationCap,
  Home,
  School,
  CheckCircle2,
  XCircle,
  Hash,
  Maximize2,
  Layers,
} from "lucide-react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { ReportHeader, ReportFooter } from "@/components/ui/report-layout";
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
  nia: number;
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

/**
 * Componente: InfoRow
 * Fila de información clave-valor con borde inferior
 * Siempre tiene el mismo alineado independientemente de si tiene icono o no
 */
function InfoRow({ label, value, icon: Icon, colspan = 1 }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; colspan?: number }) {
  return (
    <div className={`py-3 border-b border-slate-200 ${colspan > 1 ? `col-span-${colspan}` : ""}`}>
      <div className="flex items-start gap-2 min-w-0">
        {/* Espacio reservado para icono para mantener alineación consistente */}
        <div className="w-4 shrink-0">
          {Icon && <Icon className="w-4 h-4 text-slate-500 mt-0.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide break-words">{label}</Label>
          <div className="text-sm font-medium text-slate-800 mt-0.5 break-words">{value}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente: InfoCard
 * Tarjeta de información con título y contenido
 */
function InfoCard({ title, children, className = "", ...props }: { title: string; children: React.ReactNode; className?: string; [key: string]: unknown }) {
  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden ${className}`} {...props}>
      <div className="bg-slate-100 px-4 py-2 border-b border-slate-300">
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

/**
 * Componente: ScheduleTable
 * Tabla de horarios formateada para informe
 */
function ScheduleTable({ horarios }: { horarios: Horario[] }) {
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

  const isCellActive = (diaIndex: number, slot: string): boolean => {
    return horarios.some(h => {
      if (h.dia !== diaIndex) return false;
      const aperturaMin = toMinutes(h.apertura);
      const cierreMin = toMinutes(h.cierre);
      const slotMin = toMinutes(slot);
      return slotMin >= aperturaMin && slotMin < cierreMin;
    });
  };

  if (horarios.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-slate-500">
        <Clock className="w-5 h-5" />
        <span>No hay horarios asignados</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm min-w-[700px]">
        <TableHeader>
          <TableRow className="bg-slate-100">
            <TableHead className="text-center font-semibold text-slate-700 border border-slate-300 w-20">Hora</TableHead>
            {DAY_NAMES.map((day) => {
              return (
                <TableHead
                  key={day}
                  className="text-center font-semibold text-slate-700 border border-slate-300 min-w-[80px]"
                >
                  {day}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slots.map((slot) => (
            <TableRow key={slot} data-pdf-row="schedule">
              <TableCell className="text-center font-mono font-medium border border-slate-300 p-2 w-20">
                {slot}
              </TableCell>
              {DAY_NAMES.map((_, diaIndex) => {
                const active = isCellActive(diaIndex, slot);
                return (
                  <TableCell key={diaIndex} className="text-center border border-slate-300 p-1 min-w-[80px]">
                    <div
                      className={`h-6 rounded mx-auto w-full ${active ? "bg-emerald-500" : "bg-slate-100"}`}
                    />
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

/**
 * Componente: AssetTableReport
 * Tabla de activos formateada para informe
 */
function AssetTableReport({ initialAssets }: { initialAssets: ActivoItem[] }) {
  const [data] = useState<ActivoItem[]>(
    initialAssets.map(item => ({ ...item, nia: Number(item.nia) }))
  );
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "nia", desc: false }]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter(item =>
      String(item.nia).includes(term) ||
      item.nombre.toLowerCase().includes(term)
    );
  }, [data, search]);

  const columns: ColumnDef<ActivoItem>[] = useMemo(() => [
    {
      accessorKey: "nia",
      header: ({ column }) => <DataTableColumnHeader column={column} title="NIA" />,
      cell: ({ row }) => <span className="font-mono text-right block">{row.original.nia}</span>,
    },
    {
      accessorKey: "nombre",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    },
    {
      accessorKey: "descripcion",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
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

  if (initialAssets.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
        <Package className="w-5 h-5" />
        <span>No hay activos asociados a este ambiente</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Buscar por NIA o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="border border-slate-300 rounded-lg overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="bg-slate-100">
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`font-semibold text-slate-700 border border-slate-300 ${header.column.id === "nia" ? "w-24 text-right" : ""}`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No se encontraron activos
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50" data-pdf-row="asset">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`border border-slate-300 ${cell.column.id === "nia" ? "text-right font-mono" : ""}`}
                    >
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

/**
 * Componente: EnvironmentReport
 * Vista completa del informe del ambiente
 */
function EnvironmentReport({ detail }: { detail: DetailResponse }) {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const { ambiente, horarios, activos } = detail;
  const superficie = ambiente.dimension.largo * ambiente.dimension.ancho;

  return (
    <div className="space-y-8">
      {/* Botón de acción - solo visible en pantalla */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/ambientes/list")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Button>
        <EnvironmentReportAction
          code={ambiente.codigo}
          name={ambiente.nombre}
          contentRef={reportRef}
        />
      </div>

      {/* Contenido del informe - se imprime */}
      <div 
        ref={reportRef}
        className="bg-white p-8 rounded-lg border border-slate-200 print:border-0 print:p-0 print:rounded-0"
      >
        {/* Encabezado del informe - solo visible en PDF */}
        <div className="hidden report-header">
          <ReportHeader
            logoSrc="/logo_UMSS.png"
            institutionName="Universidad Mayor de San Simón"
            systemName="Gestión de Infraestructura"
            generatedAt={new Date()}
          />
        </div>

          {/* Información Principal - Página 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Datos de Identificación */}
          <InfoCard title="1. DATOS DE IDENTIFICACIÓN" data-pdf-section="card">
            <div className="grid grid-cols-2 gap-x-4">
              <InfoRow label="Código" value={ambiente.codigo} icon={Hash} />
              <InfoRow label="Nombre" value={ambiente.nombre} />
              {ambiente.nombre_corto && (
                <InfoRow label="Nombre corto" value={ambiente.nombre_corto} />
              )}
              <InfoRow label="Tipo de ambiente" value={ambiente.tipo_ambiente_nombre} icon={Building2} />
              <InfoRow label="Admite clases" value={
                ambiente.clases ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Sí</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">No</span>
                  </div>
                )
              } icon={GraduationCap} />
              <InfoRow label="Estado" value={
                <div className="flex items-center gap-2">
                  {ambiente.activo ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Activo</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700 font-semibold">Inactivo</span>
                    </>
                  )}
                </div>
              } />
            </div>
          </InfoCard>

          {/* Ubicación Física */}
          <InfoCard title="2. UBICACIÓN FÍSICA" data-pdf-section="card">
            <div className="grid grid-cols-2 gap-x-4">
              <InfoRow label="Campus" value={ambiente.campus_nombre} icon={School} />
              <InfoRow label="Facultad" value={ambiente.facultad_nombre} icon={Building2} />
              <InfoRow label="Bloque" value={ambiente.bloque_nombre} icon={Home} />
              <InfoRow label="Tipo de bloque" value={ambiente.tipo_bloque_nombre} />
              <InfoRow label="Piso" value={ambiente.piso} icon={Layers} />
            </div>
          </InfoCard>
        </div>

        {/* Propiedades Físicas - ocupa todo el ancho */}
        <InfoCard title="3. PROPIEDADES FÍSICAS" className="mb-8" data-pdf-section="card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-slate-600" />
                <Label className="text-xs font-semibold text-slate-500 uppercase">Capacidad total</Label>
              </div>
              <p className="text-3xl font-bold text-slate-800">{ambiente.capacidad.total}</p>
              <p className="text-xs text-slate-500">personas</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-slate-600" />
                <Label className="text-xs font-semibold text-slate-500 uppercase">Para examen</Label>
              </div>
              <p className="text-3xl font-bold text-slate-800">{ambiente.capacidad.examen}</p>
              <p className="text-xs text-slate-500">personas</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Maximize2 className="w-5 h-5 text-slate-600" />
                <Label className="text-xs font-semibold text-slate-500 uppercase">Superficie</Label>
              </div>
              <p className="text-3xl font-bold text-slate-800">{superficie}</p>
              <p className="text-xs text-slate-500">m²</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Ruler className="w-5 h-5 text-slate-600" />
                <Label className="text-xs font-semibold text-slate-500 uppercase">Dimensiones</Label>
              </div>
              <p className="text-lg font-bold text-slate-800">
                {ambiente.dimension.largo} × {ambiente.dimension.ancho} × {ambiente.dimension.alto}
              </p>
              <p className="text-xs text-slate-500">
                {ambiente.dimension.unid_med}
              </p>
            </div>
          </div>
        </InfoCard>

        {/* Horario de Atención */}
        <InfoCard title="4. HORARIO DE ATENCIÓN" className="mb-8" data-pdf-section="card-table">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium">Período de atención:</span> {horarios.length > 0 ? `${horarios[0].periodo} minutos` : "No definido"}
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-slate-600">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-100 border border-slate-300 rounded"></div>
                <span className="text-slate-600">Cerrado</span>
              </div>
            </div>
          </div>
          <ScheduleTable horarios={horarios} />
        </InfoCard>

        {/* Página 2: Activos - solo salto en print */}
        <div className="hidden lg:block break-before-page" />
        
        <InfoCard title="5. ACTIVOS ASOCIADOS" className="mb-8" data-pdf-section="card-table">
          <div className="mb-4 text-sm text-slate-600">
            <span className="font-medium">Total de activos:</span> {activos.meta.total}
          </div>
          <AssetTableReport initialAssets={activos.items} />
        </InfoCard>

        {/* Pie de página del informe - solo visible en PDF */}
        <div className="hidden report-footer">
          <ReportFooter
            systemName="Gestión de Infraestructura"
            currentPage={1}
            totalPages={1}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Componente: LoadingState
 * Estado de carga con esqueletos
 */
function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/**
 * Componente: NotFoundState
 * Estado cuando no se encuentra el ambiente
 */
function NotFoundState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-slate-100 p-4">
          <Building2 className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <p className="text-lg font-medium text-slate-700">Ambiente no encontrado</p>
          <p className="text-sm text-slate-500">El ambiente que buscas no existe o fue eliminado</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/ambientes/list")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al listado
        </Button>
      </div>
    </div>
  );
}

/**
 * Componente: EnvironmentDetailContent
 * Componente principal que carga los datos
 */
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
    return <LoadingState />;
  }

  if (!detail) {
    return <NotFoundState />;
  }

  return <EnvironmentReport detail={detail} />;
}

/**
 * Componente: EnvironmentDetailPage
 * Página exportable por defecto
 */
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