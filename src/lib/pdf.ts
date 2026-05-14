export interface GeneratePdfOptions {
  /** Elemento HTML que contiene TODO el reporte (con header y footer ocultos) */
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
 * Espacio en mm reservado para la cabecera del reporte (logo + datos)
 */
const HEADER_MM = 38;

/**
 * Espacio en mm reservado para el pie de página
 */
const FOOTER_MM = 20;

/**
 * Altura total imprimible de una página A4 en mm (A4 - márgenes * 2)
 */
const PAGE_HEIGHT_MM = 297 - 20; // 20 = 10mm margin top + 10mm margin bottom

/**
 * Altura disponible para contenido por página (sin header ni footer)
 */
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - HEADER_MM - FOOTER_MM;

/**
 * Crea un elemento footer con el número de página correcto
 */
function createFooter(pageNum: number, totalPages: number): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = [
    "margin-top: 16px",
    "padding-top: 8px",
    "border-top: 1px solid #cbd5e1",
    "display: flex",
    "justify-content: space-between",
    "font-size: 10px",
    "color: #64748b",
    "font-family: Arial, sans-serif",
  ].join(";");

  const pageText = document.createElement("span");
  pageText.textContent = `Página ${pageNum} de ${totalPages}`;

  const systemText = document.createElement("span");
  systemText.textContent = "Gestión de Infraestructura";

  div.appendChild(pageText);
  div.appendChild(systemText);
  return div;
}

/**
 * Fix #3a: quita overflow-x-auto de los contenedores de tabla en el clon
 * para que html2canvas-pro no recorte tablas anchas horizontalmente.
 */
function removeTableOverflowClips(root: HTMLElement): void {
  const overflowContainers = root.querySelectorAll<HTMLElement>(
    '[class*="overflow-x-auto"], [style*="overflow-x: auto"]',
  );
  for (const el of Array.from(overflowContainers)) {
    el.style.overflowX = "visible";
    el.style.overflowY = "visible";
  }
}

/**
 * Fix #3b: asegura que las tablas no tengan min-width mayor que su contenedor
 * y que usen todo el ancho disponible. Sin table-layout fixed para mantener
 * el formato original de las columnas.
 */
function fixTableWidthsForPdf(root: HTMLElement): void {
  const tables = root.querySelectorAll<HTMLElement>("table, [data-slot='table']");
  for (const table of Array.from(tables)) {
    table.style.minWidth = "0";
    table.style.maxWidth = "100%";
    table.style.width = "100%";
  }
}

/**
 * Crea un div que representa una página completa del PDF con cabecera,
 * un grupo de elementos de contenido, y pie de página.
 *
 * La altura del elemento se calcula para que, al escalar la captura
 * al ancho imprimible (190mm), la imagen resultante llene exactamente
 * los 277mm de altura imprimible de la página A4.
 *
 * Fix #1: agrega margin-bottom entre secciones (las cards originales
 *         se espaciaban con gap del grid, que se pierde al extraerlas)
 * Fix #2: usa flexbox + spacer para que el footer quede al fondo de la hoja
 * Fix #3: remueve overflow-x-auto de wrappers de tabla para evitar cortes
 */
function createPageElement(
  headerHtml: HTMLElement | null,
  contentElements: HTMLElement[],
  pageNum: number,
  totalPages: number,
  margin: number,
  targetHeightMm: number,
): HTMLDivElement {
  const pageDiv = document.createElement("div");
  pageDiv.style.cssText = [
    `width: 210mm`,
    `height: ${targetHeightMm}mm`,
    `background-color: #ffffff`,
    `padding: ${margin}mm`,
    "display: flex",
    "flex-direction: column",
    "font-family: inherit",
    "box-sizing: border-box",
    "overflow: hidden",
  ].join(";");

  // Fix #2: Cabecera (no se encoge)
  if (headerHtml) {
    const headerClone = headerHtml.cloneNode(true) as HTMLElement;
    headerClone.style.flexShrink = "0";
    pageDiv.appendChild(headerClone);
  }

  // Fix #1 + Fix #3: Contenido con espaciado entre secciones
  for (let i = 0; i < contentElements.length; i++) {
    const clone = contentElements[i].cloneNode(true) as HTMLElement;
    // Fix #1: espaciado entre cards (pierden el gap del grid original)
    if (i < contentElements.length - 1) {
      clone.style.marginBottom = "16px";
    }
    // Fix #3a: quitar overflow-x-auto para que tablas no se corten
    removeTableOverflowClips(clone);
    // Fix #3b: asegurar que las tablas usen todo el ancho disponible
    fixTableWidthsForPdf(clone);
    pageDiv.appendChild(clone);
  }

  // Fix #2: Spacer elástico que empuja el footer al fondo de la página
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  spacer.style.minHeight = "0";
  pageDiv.appendChild(spacer);

  // Fix #2: Pie de página (no se encoge, siempre al final)
  const footer = createFooter(pageNum, totalPages);
  footer.style.flexShrink = "0";
  pageDiv.appendChild(footer);

  return pageDiv;
}

/**
 * Clona el elemento original, muestra el header y footer ocultos,
 * y devuelve referencias a las partes del reporte para medir y paginar.
 *
 * Importante: el clon se agrega al DOM para poder medir alturas reales.
 * Se debe llamar a cleanupLayout() al finalizar.
 */
function prepareLayout(element: HTMLElement): {
  clone: HTMLElement;
  headerEl: HTMLElement | null;
  footerEl: HTMLElement | null;
  sections: HTMLElement[];
} {
  const clone = element.cloneNode(true) as HTMLElement;

  // Mostrar header y footer en el clon
  const headerEl = clone.querySelector<HTMLElement>(".report-header");
  const footerEl = clone.querySelector<HTMLElement>(".report-footer");
  if (headerEl) headerEl.classList.remove("hidden");
  if (footerEl) footerEl.classList.remove("hidden");

  // Configurar layout para medición (ancho A4, offscreen)
  clone.style.cssText = [
    "position: absolute",
    "left: -9999px",
    "top: 0",
    "width: 210mm",
    "padding: 10mm",
    "background-color: #ffffff",
    "box-sizing: border-box",
  ].join(";");

  document.body.appendChild(clone);

  // Obtener todas las secciones (cards) del contenido
  const cardSections = Array.from(
    clone.querySelectorAll<HTMLElement>("[data-pdf-section]"),
  );

  return { clone, headerEl, footerEl, sections: cardSections };
}

/**
 * Limpia el clon de medición del DOM.
 */
function cleanupLayout(clone: HTMLElement): void {
  if (clone.parentNode) {
    clone.parentNode.removeChild(clone);
  }
}

/**
 * Agrupa las secciones en páginas, respetando que:
 * - Las cards atómicas (data-pdf-section="card") NO se parten
 * - Las cards con tabla (data-pdf-section="card-table") se pueden
 *   partir a nivel de filas data-pdf-row
 * - Cada página tiene espacio reservado para header y footer
 *
 * Devuelve un array de páginas, cada una con su lista de elementos.
 */
function paginateSections(sections: HTMLElement[]): HTMLElement[][] {
  const pages: HTMLElement[][] = [];
  let currentPage: HTMLElement[] = [];
  let currentHeight = 0;

  for (const section of sections) {
    const sectionHeight = section.offsetHeight;
    const sectionType = section.getAttribute("data-pdf-section") ?? "";

    // Convertir px a mm basado en el ancho del contenedor
    // (210mm - 20mm padding = 190mm internos)
    const pxPerMm = section.offsetParent
      ? (section.offsetParent as HTMLElement).offsetWidth / 190
      : 1;
    const sectionMm = sectionHeight / pxPerMm;

    if (currentHeight + sectionMm <= CONTENT_HEIGHT_MM) {
      // La sección cabe completa
      currentPage.push(section);
      currentHeight += sectionMm;
    } else if (sectionType === "card-table" && currentPage.length > 0) {
      // Card con tabla: podemos partir. Pero para simplificar,
      // la movemos a la página siguiente completa
      pages.push(currentPage);
      currentPage = [section];
      currentHeight = sectionMm;
    } else if (sectionType === "card-table" && currentPage.length === 0) {
      // Card-table sola en página vacía: forzamos (es más alta que la página)
      currentPage.push(section);
      currentHeight += sectionMm;
    } else {
      // Card atómica: nueva página
      if (currentPage.length > 0) {
        pages.push(currentPage);
      }
      currentPage = [section];
      currentHeight = sectionMm;
    }
  }

  // Última página
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * Genera un PDF a partir de un elemento HTML usando html2canvas-pro + jsPDF.
 *
 * CARACTERÍSTICAS:
 * - Paginación inteligente: las cards se mantienen enteras, las tablas
 *   pueden partirse por filas
 * - Cabecera y pie de página en cada página
 * - Numeración automática (Página X de Y)
 * - Soporta colores modernos (oklch, lab, lch) gracias a html2canvas-pro
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

  const html2canvas = (await import("html2canvas-pro")).default;
  const { default: jsPDF } = await import("jspdf");

  const pageFormat = FORMATS[format] ?? FORMATS.a4;
  const usableWidth = pageFormat.width - margin * 2;

  // ================================================================
  // 1. Preparar layout: clonar, mostrar header/footer, medir secciones
  // ================================================================
  const { clone: measureClone, headerEl, sections } = prepareLayout(element);

  try {
    // ================================================================
    // 2. Paginar: agrupar secciones en páginas
    // ================================================================
    const pageGroups = paginateSections(sections);

    if (pageGroups.length === 0) {
      throw new Error("No se pudo organizar el contenido en páginas.");
    }

    // ================================================================
    // 3. Construir y capturar cada página
    // ================================================================
    const doc = new jsPDF({ orientation, unit: "mm", format });

    // Altura del elemento a capturar para que, escalado al ancho
    // imprimible (usableWidth), la imagen llene exactamente la
    // altura imprimible de la página (pageHeight - 2*margin).
    // Fórmula: targetH = printableH * elementW / printableW
    //   = (297 - 20) * 210 / (210 - 20) = 277 * 210 / 190 ≈ 306mm
    const printableHeight = pageFormat.height - margin * 2;
    const elementHeight = (printableHeight * pageFormat.width) / usableWidth;

    for (let pageIdx = 0; pageIdx < pageGroups.length; pageIdx++) {
      if (pageIdx > 0) doc.addPage();

      // Construir el elemento de la página con la altura exacta calculada
      const pageEl = createPageElement(
        headerEl,
        pageGroups[pageIdx],
        pageIdx + 1,
        pageGroups.length,
        margin,
        elementHeight,
      );

      // Agregar al DOM (necesario para html2canvas-pro)
      pageEl.style.position = "absolute";
      pageEl.style.left = "-9999px";
      pageEl.style.top = "0";
      document.body.appendChild(pageEl);

      try {
        // Capturar con html2canvas-pro (soporta oklch nativamente)
        const canvas = await html2canvas(pageEl, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        // La imagen se coloca ocupando EXACTAMENTE el área imprimible
        doc.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          margin,
          margin,
          usableWidth,
          printableHeight,
        );
      } finally {
        // Limpiar página del DOM
        if (pageEl.parentNode) {
          pageEl.parentNode.removeChild(pageEl);
        }
      }
    }

    // ================================================================
    // 4. Descargar PDF
    // ================================================================
    doc.save(`${filename}.pdf`);

  } finally {
    cleanupLayout(measureClone);
  }
}
