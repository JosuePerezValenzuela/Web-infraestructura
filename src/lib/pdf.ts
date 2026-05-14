export interface GeneratePdfOptions {
  /** Elemento HTML a convertir */
  element: HTMLElement;
  /** Nombre del archivo sin extensión */
  filename: string;
  /** Orientación del PDF */
  orientation?: "portrait" | "landscape";
  /** Tamaño del papel */
  format?: "a4" | "letter" | "legal";
  /** Margen en milímetros */
  margin?: number;
  /** Escala para ajustar el contenido */
  scale?: number;
}

/**
 * Dimensiones de formatos de papel en milímetros
 */
const FORMATS: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
};

/**
 * Genera un PDF a partir de un elemento HTML usando html2canvas-pro + jsPDF.
 *
 * html2canvas-pro es un fork de html2canvas que SOPORTA de forma nativa
 * los formatos de color modernos (oklch, lab, lch, color()), eliminando
 * la necesidad de convertir colores manualmente.
 *
 * El header y footer YA están renderizados dentro del HTML (ReportHeader y
 * ReportFooter), por lo que se capturan como parte de la imagen.
 *
 * El flujo es:
 * 1. Captura el elemento HTML como canvas usando html2canvas-pro
 * 2. Calcula paginación: si la imagen es más alta que una página, la parte
 *    en múltiples páginas usando canvas cropping
 * 3. Cada página se agrega al documento jsPDF
 * 4. Descarga el PDF generado
 *
 * @param options - Opciones de generación del PDF
 */
export async function generatePdf(options: GeneratePdfOptions): Promise<void> {
  const {
    element,
    filename,
    orientation = "portrait",
    format = "a4",
    margin = 10,
    scale = 2,
  } = options;

  // Import dinámico (evita errores SSR)
  const html2canvas = (await import("html2canvas-pro")).default;
  const { default: jsPDF } = await import("jspdf");

  // ================================================================
  // 1. Capturar el elemento HTML como canvas
  // ================================================================
  // html2canvas-pro soporta oklch nativamente, no necesitamos
  // ninguna conversión de colores previa
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  // ================================================================
  // 2. Calcular dimensiones
  // ================================================================
  const pageFormat = FORMATS[format] ?? FORMATS.a4;
  const pageWidth = pageFormat.width;
  const pageHeight = pageFormat.height;
  const usableWidth = pageWidth - margin * 2; // Ancho disponible para la imagen
  const usableHeight = pageHeight - margin * 2; // Alto disponible para la imagen

  // Escalamos el canvas para que Ocupe todo el ancho disponible
  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // ================================================================
  // 3. Crear documento jsPDF
  // ================================================================
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format,
  });

  // ================================================================
  // 4. Manejar paginación
  // ================================================================
  if (imgHeight <= usableHeight) {
    // --- 4a. Cabe en una sola página ---
    doc.addImage(
      canvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      margin,
      margin,
      imgWidth,
      imgHeight,
    );
  } else {
    // --- 4b. Múltiples páginas ---
    // Calculamos cuántas páginas se necesitan
    const totalPages = Math.ceil(imgHeight / usableHeight);
    const imgToPxRatio = canvas.width / imgWidth; // px por mm

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) doc.addPage();

      // Calcular la porción del canvas que va en esta página
      const srcY = Math.round(pageIndex * usableHeight * imgToPxRatio);
      const srcH = Math.min(
        Math.round(usableHeight * imgToPxRatio),
        canvas.height - srcY,
      );

      // Crear un canvas temporal con SOLO la porción de esta página
      // Necesario porque jsPDF 4.x no soporta crop source en addImage
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcH;
      const pageCtx = pageCanvas.getContext("2d");
      if (!pageCtx) continue;

      pageCtx.drawImage(
        canvas,
        0, srcY, canvas.width, srcH, // source rect
        0, 0, canvas.width, srcH, // dest rect
      );

      // Altura de esta porción en mm (manteniendo proporción)
      const portionHeight = srcH / imgToPxRatio;

      doc.addImage(
        pageCanvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        margin,
        margin,
        imgWidth,
        portionHeight,
      );
    }
  }

  // ================================================================
  // 5. Descargar el PDF
  // ================================================================
  doc.save(`${filename}.pdf`);
}
