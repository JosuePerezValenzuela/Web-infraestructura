"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { generatePdf } from "@/lib/pdf";

type Props = {
  /** Código del ambiente */
  code: string;
  /** Nombre del ambiente */
  name?: string;
  /**
   * Elemento HTML que contiene el contenido del reporte
   * (con header y footer ocultos, generatePdf se encarga de mostrarlos)
   */
  contentRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Componente: EnvironmentReportAction
 * Botón para generar PDF del ambiente con paginación inteligente.
 *
 * El flujo es manejado por generatePdf():
 * 1. Clona el contenido (con header/footer ocultos en la web)
 * 2. Mide secciones y filas de tablas para paginar prolijamente
 * 3. Construye cada página con header + contenido + footer numerado
 * 4. Captura cada página con html2canvas-pro (soporta oklch nativo)
 * 5. Compone el PDF con jsPDF y lo descarga
 */
export function EnvironmentReportAction({ 
  code, 
  contentRef,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleGeneratePdf = async () => {
    if (!contentRef?.current) {
      notify.error({
        title: "Error",
        description: "No se pudo capturar el contenido para generar el PDF.",
      });
      return;
    }

    setLoading(true);
    try {
      const filename = `Ambiente-${code}`;
      await generatePdf({
        element: contentRef.current,
        filename,
      });
      notify.success({
        title: "PDF generado",
        description: `${filename}.pdf`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el PDF.";
      notify.error({
        title: "Error",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      disabled={loading}
      onClick={handleGeneratePdf}
      style={{ backgroundColor: "#262626", color: "white" }}
    >
      {loading ? (
        <span>Generando...</span>
      ) : (
        <>
          Reporte PDF
        </>
      )}
    </Button>
  );
}
