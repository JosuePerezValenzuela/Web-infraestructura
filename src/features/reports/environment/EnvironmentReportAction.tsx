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
   * (sin cabecera ni pie de página, que se agregan al generar el PDF)
   */
  contentRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Componente: EnvironmentReportAction
 * Botón para generar PDF del ambiente.
 *
 * El flujo es:
 * 1. Clona el contenido del reporte (que en la web se ve sin cabecera ni pie)
 * 2. En el clon, MUESTRA la cabecera y el pie de página (ocultos en la web)
 * 3. Agrega el clon al DOM (fuera de pantalla)
 * 4. Captura el clon con html2canvas-pro (soporta oklch nativamente)
 * 5. Genera el PDF con jsPDF
 * 6. Limpia el clon del DOM
 */
export function EnvironmentReportAction({ 
  code, 
  name, 
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

    // --- 1. Clonar el elemento para no modificar el original ---
    const clone = contentRef.current.cloneNode(true) as HTMLElement;

    // --- 2. Mostrar cabecera y pie en el clon ---
    // En la vista web están ocultos (clase "hidden"), 
    // pero en el PDF queremos que aparezcan
    const headerEl = clone.querySelector(".report-header");
    const footerEl = clone.querySelector(".report-footer");
    if (headerEl) (headerEl as HTMLElement).classList.remove("hidden");
    if (footerEl) (footerEl as HTMLElement).classList.remove("hidden");

    // --- 3. Posicionar el clon fuera de pantalla ---
    // Necesario para que html2canvas-pro pueda leer estilos computados
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = "210mm";
    document.body.appendChild(clone);

    try {
      const filename = `Ambiente-${code}`;
      await generatePdf({
        element: clone,
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
      // --- 4. Limpiar: remover el clon del DOM ---
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
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
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </>
      )}
    </Button>
  );
}
