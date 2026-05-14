"use client";

import Image from "next/image";
import { Clock } from "lucide-react";

/**
 * Tipo: ReportHeaderProps
 * Propiedades para el componente ReportHeader
 */
export interface ReportHeaderProps {
  /**
   * Ruta del logo institucional
   * Por defecto usa el logo de la UMSS
   */
  logoSrc?: string;
  /**
   * Nombre de la institución
   * Ejemplo: "Universidad Mayor de San Simón"
   */
  institutionName?: string;
  /**
   * Nombre del sistema que genera el reporte
   * Ejemplo: "Gestión de Infraestructura Académica"
   */
  systemName?: string;
  /**
   * Nombre del usuario que genera el reporte
   * Si no se proporciona, usa fallback
   */
  userName?: string;
  /**
   * Fecha de generación del reporte
   * Si no se proporciona, usa la fecha actual
   */
  generatedAt?: Date;
}

/**
 * Componente: ReportHeader
 * Cabecera formal para reportes PDFs
 * Diseño: Logo + nombre a la izquierda, fecha/sistema/usuario a la derecha
 */
export function ReportHeader({
  logoSrc = "/logo_UMSS.png",
  institutionName = "Institución",
  systemName = "Sistema",
  userName,
  generatedAt = new Date(),
}: ReportHeaderProps) {
  // Formatear fecha y hora
  const formattedDate = generatedAt.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateTime = `${formattedDate} ${formattedTime}`;

  // Fallback para usuario
  const displayUser = userName || "Sin usuario";

  return (
    <div className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Columna izquierda: Logo + Nombre de institución */}
        <div className="flex items-center gap-3">
          {logoSrc && (
            <div className="relative w-12 h-12 shrink-0">
              <Image
                src={logoSrc}
                alt="Logo institucional"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            {institutionName}
          </h1>
        </div>

        {/* Columna derecha: Fecha, Sistema, Usuario (en renglones separados) */}
        <div className="flex flex-col justify-center text-right text-sm text-slate-600 space-y-1">
          <div>{dateTime}</div>
          <div>
            <span className="font-medium">Sistema:</span> {systemName}
          </div>
          <div>
            <span className="font-medium">Usuario:</span> {displayUser}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tipo: ReportFooterProps
 * Propiedades para el componente ReportFooter
 */
export interface ReportFooterProps {
  /**
   * Nombre del sistema (mismo que la cabecera)
   */
  systemName?: string;
  /**
   * Página actual
   */
  currentPage: number;
  /**
   * Total de páginas
   * Si no se proporciona, solo muestra página actual
   */
  totalPages?: number;
}

/**
 * Componente: ReportFooter
 * Pie de página formal para reportes PDFs
 * Diseño: Página X de Y a la izquierda, nombre del sistema a la derecha
 */
export function ReportFooter({
  systemName = "Sistema",
  currentPage,
  totalPages,
}: ReportFooterProps) {
  const pageText = totalPages 
    ? `Página ${currentPage} de ${totalPages}` 
    : `Página ${currentPage}`;

  return (
    <div className="mt-8 pt-4 border-t border-slate-300">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Izquierda: Numeración de página */}
        <div className="text-slate-600">
          {pageText}
        </div>
        
        {/* Derecha: Nombre del sistema */}
        <div className="text-right text-slate-500">
          {systemName}
        </div>
      </div>
    </div>
  );
}

/**
 * Tipo: ReportLayoutProps
 * Propiedades para el componente ReportLayout
 */
export interface ReportLayoutProps {
  /**
   * children: contenido del cuerpo del reporte
   */
  children: React.ReactNode;
  /**
   * Logo - ruta del archivo
   * Por defecto: /logo_UMSS.png
   */
  logoSrc?: string;
  /**
   * Nombre de la institución
   */
  institutionName?: string;
  /**
   * Nombre del sistema
   */
  systemName?: string;
  /**
   * Nombre del usuario
   */
  userName?: string;
  /**
   * Fecha de generación
   */
  generatedAt?: Date;
  /**
   * Total de páginas (para numeración)
   * Si no se pasa, se asume 1 página
   */
  totalPages?: number;
  /**
   * Ocultar header (opcional)
   */
  hideHeader?: boolean;
  /**
   * Ocultar footer (opcional)
   */
  hideFooter?: boolean;
  /**
   * Clase CSS adicional para el contenedor
   */
  className?: string;
}

/**
 * Componente: ReportLayout
 * Layout completo para reportes/PDFs
 * Combina header, cuerpo y footer con abstracción
 */
export function ReportLayout({
  children,
  logoSrc = "/logo_UMSS.png",
  institutionName = "Institución",
  systemName = "Sistema",
  userName,
  generatedAt = new Date(),
  totalPages = 1,
  hideHeader = false,
  hideFooter = false,
  className = "",
}: ReportLayoutProps) {
  return (
    <div className={className}>
      {/* Cabecera */}
      {!hideHeader && (
        <ReportHeader
          logoSrc={logoSrc}
          institutionName={institutionName}
          systemName={systemName}
          userName={userName}
          generatedAt={generatedAt}
        />
      )}

      {/* Cuerpo del reporte */}
      <div className="report-body">
        {children}
      </div>

      {/* Pie de página */}
      {!hideFooter && (
        <ReportFooter
          systemName={systemName}
          currentPage={1}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}

