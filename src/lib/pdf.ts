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
    // No se encoge: el contenido debe mantener su altura natural
    clone.style.flexShrink = "0";
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
 * Crea un elemento de página de prueba (header + spacer + footer)
 * para usar con overflow detection. Misma estructura que createPageElement
 * pero simplificado para testing.
 */
function createTestPageShell(): HTMLDivElement {
  const d = document.createElement("div");
  d.style.cssText = [
    "width: 210mm",
    "height: 277mm",
    "padding: 10mm",
    "background: #fff",
    "display: flex",
    "flex-direction: column",
    "box-sizing: border-box",
    "overflow: hidden",
    "position: absolute",
    "left: -9999px",
    "top: 0",
  ].join(";");

  // Header placeholder (no se usa, pero ocupa espacio)
  const h = document.createElement("div");
  h.style.height = "38mm";
  h.style.flexShrink = "0";
  d.appendChild(h);

  // Spacer
  const s = document.createElement("div");
  s.style.flex = "1";
  s.style.minHeight = "0";
  d.appendChild(s);

  // Footer placeholder
  const f = document.createElement("div");
  f.style.height = "20mm";
  f.style.flexShrink = "0";
  d.appendChild(f);

  return d;
}

/**
 * Agrupa las secciones en páginas usando overflow DETECTION.
 *
 * En lugar de medir alturas (impreciso), construye páginas de prueba,
 * agrega contenido de a uno, y verifica scrollHeight > clientHeight.
 *
 * - Las cards atómicas (data-pdf-section="card") NO se parten
 * - Las cards con tabla (data-pdf-section="card-table") se parten
 *   a nivel de filas (data-pdf-row) repitiendo title + thead
 * - Cada página tiene espacio reservado para header y footer
 */
function paginateSections(sections: HTMLElement[]): HTMLElement[][] {
  const result: HTMLElement[][] = [];
  let currentGroup: HTMLElement[] = [];
  let testPage = createTestPageShell();

  // Encuentra el spacer dentro del test page
  const testSpacer = (): HTMLElement | null =>
    testPage.querySelector("div[style*='flex: 1']") ||
    testPage.querySelector("div[style*='flex:1']");

  function pushPage(): void {
    if (currentGroup.length > 0) {
      result.push(currentGroup);
      currentGroup = [];
    }
    testPage.remove();
    testPage = createTestPageShell();
    document.body.appendChild(testPage);
  }

  // Agregar testPage al DOM (necesario para scrollHeight)
  document.body.appendChild(testPage);

  let i = 0;
  while (i < sections.length) {
    const section = sections[i];
    const sectionType = section.getAttribute("data-pdf-section") ?? "";

    // Forzar salto de página si la sección lo pide y ya hay contenido
    if (section.hasAttribute("data-pdf-break-before") && currentGroup.length > 0) {
      pushPage();
      // El testPage se re-creó limpio, continuamos
    }

    // Clonar la sección en la página de prueba
    const clone = section.cloneNode(true) as HTMLElement;
    clone.style.flexShrink = "0";

    const spacer = testSpacer();
    if (spacer) {
      testPage.insertBefore(clone, spacer);
    } else {
      testPage.appendChild(clone);
    }

    const overflows = testPage.scrollHeight > testPage.clientHeight;

    if (!overflows) {
      // Cabe → agregar a la página actual
      currentGroup.push(section);
      i++;
      continue;
    }

    // --- Overflow: la sección no cabe ---
    // Quitar el clon
    clone.remove();

    if (sectionType !== "card-table") {
      // Card atómica: cerrar página actual, empezar nueva con esta sección
      pushPage();
      currentGroup.push(section);
      // Re-agregar el clon para verificar que cabe (debería en página vacía)
      const newSpacer = testSpacer();
      const newClone = section.cloneNode(true) as HTMLElement;
      newClone.style.flexShrink = "0";
      if (newSpacer) testPage.insertBefore(newClone, newSpacer);
      i++;
      continue;
    }

    // ============================================================
    // card-table: split por filas
    // ============================================================
    const rows = Array.from(section.querySelectorAll<HTMLElement>("[data-pdf-row]"));

    if (rows.length === 0) {
      pushPage();
      currentGroup.push(section);
      const ns = testSpacer();
      const nc = section.cloneNode(true) as HTMLElement;
      nc.style.flexShrink = "0";
      if (ns) testPage.insertBefore(nc, ns);
      i++;
      continue;
    }

    // Encontrar cuántas filas entran agregando de a una
    const testCardClone = section.cloneNode(true) as HTMLElement;
    testCardClone.style.flexShrink = "0";

    // Quitamos todas las filas del clon de prueba
    const testRows = Array.from(testCardClone.querySelectorAll<HTMLElement>("[data-pdf-row]"));
    for (const r of testRows) r.remove();

    let fittingCount = 0;
    const remainingRows = Array.from(section.querySelectorAll<HTMLElement>("[data-pdf-row]"));

    // Agregar filas de a una hasta que desborde
    for (let ri = 0; ri < remainingRows.length; ri++) {
      // Clonar la fila y agregarla al clon de prueba
      const rowClone = remainingRows[ri].cloneNode(true) as HTMLElement;
      const tableBody = testCardClone.querySelector("tbody");
      if (tableBody) {
        tableBody.appendChild(rowClone);
      } else {
        testCardClone.appendChild(rowClone);
      }

      // Probar si cabe
      const testSp = testSpacer();
      if (testSp) testPage.insertBefore(testCardClone, testSp);

      const rowOverflows = testPage.scrollHeight > testPage.clientHeight;

      // Quitar el clon de prueba para la siguiente iteración
      testCardClone.remove();

      if (rowOverflows) {
        // Esta fila no entra → la sacamos del clon
        if (tableBody) {
          tableBody.removeChild(rowClone);
        }
        break;
      }

      fittingCount++;
    }

    if (fittingCount === 0) {
      // Ni una fila entra en esta página → forzar 1
      fittingCount = 1;
    }

    if (fittingCount >= remainingRows.length) {
      // Todas las filas entran
      const ns = testSpacer();
      const nc = section.cloneNode(true) as HTMLElement;
      nc.style.flexShrink = "0";
      if (ns) testPage.insertBefore(nc, ns);
      currentGroup.push(section);
      i++;
      continue;
    }

    // ============================================================
    // Split: crear clon parcial y modificar el original
    // ============================================================

    // Clon parcial: solo las filas que entran
    const partialClone = section.cloneNode(true) as HTMLElement;
    const partialRows = Array.from(partialClone.querySelectorAll<HTMLElement>("[data-pdf-row]"));
    for (let r = fittingCount; r < partialRows.length; r++) {
      partialRows[r].remove();
    }

    // Original: eliminar las filas que ya se fueron
    for (let r = 0; r < fittingCount; r++) {
      rows[r].remove();
    }

    // Agregar clon parcial a la página actual
    const ps = testSpacer();
    partialClone.style.flexShrink = "0";
    if (ps) testPage.insertBefore(partialClone, ps);
    currentGroup.push(partialClone);

    // Cerrar página
    pushPage();

    // El original (con filas restantes) se reprocesa (no incrementamos i)
  }

  // Última página
  if (currentGroup.length > 0) {
    result.push(currentGroup);
  }

  // Limpiar testPage
  if (testPage.parentNode) {
    testPage.parentNode.removeChild(testPage);
  }

  return result;
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
    // 3. Construir y capturar cada página usando createPdfCapture
    // ================================================================
    const pdf = await createPdfCapture({ orientation, format, margin, scale });

    // Altura del elemento para que la captura llene la página exactamente
    const printableHeight = pageFormat.height - margin * 2;
    const elementHeight = (printableHeight * pageFormat.width) / usableWidth;

    for (let pageIdx = 0; pageIdx < pageGroups.length; pageIdx++) {
      const pageEl = createPageElement(
        headerEl,
        pageGroups[pageIdx],
        pageIdx + 1,
        pageGroups.length,
        margin,
        elementHeight,
      );

      await pdf.addPage(pageEl);
    }

    // ================================================================
    // 4. Descargar PDF
    // ================================================================
    pdf.save(filename);

  } finally {
    cleanupLayout(measureClone);
  }
}

// ================================================================
// Utilidad compartida: capturar elemento HTML con html2canvas-pro
// y agregarlo como página a un documento jsPDF.
// ================================================================

export type PdfCapture = {
  /** Agrega una página capturando el elemento con html2canvas-pro */
  addPage: (pageEl: HTMLElement) => Promise<void>;
  /** Guarda el PDF con el nombre indicado */
  save: (filename: string) => void;
};

/**
 * Crea una instancia de captura PDF compartida entre distintos generadores
 * (reporte detallado, inventario, etc.).
 *
 * Ejemplo:
 *   const pdf = await createPdfCapture({ format: "a4", margin: 10, scale: 2 });
 *   for (const pageEl of pageElements) {
 *     await pdf.addPage(pageEl);
 *   }
 *   pdf.save("reporte.pdf");
 */
export async function createPdfCapture(options: {
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter" | "legal";
  margin?: number;
  scale?: number;
}): Promise<PdfCapture> {
  const {
    orientation = "portrait",
    format = "a4",
    margin = 10,
    scale = 2,
  } = options;

  const html2canvas = (await import("html2canvas-pro")).default;
  const { default: jsPDF } = await import("jspdf");
  const pageFormat = FORMATS[format] ?? FORMATS.a4;
  const usableWidth = pageFormat.width - margin * 2;
  const usableHeight = pageFormat.height - margin * 2;

  const doc = new jsPDF({ orientation, unit: "mm", format });
  let pageIndex = 0;

  return {
    addPage: async (pageEl: HTMLElement) => {
      if (pageIndex > 0) doc.addPage();

      pageEl.style.position = "absolute";
      pageEl.style.left = "-9999px";
      pageEl.style.top = "0";
      document.body.appendChild(pageEl);

      try {
        const canvas = await html2canvas(pageEl, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        doc.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          margin,
          margin,
          usableWidth,
          usableHeight,
        );

        pageIndex++;
      } finally {
        if (pageEl.parentNode) {
          pageEl.parentNode.removeChild(pageEl);
        }
      }
    },

    save: (filename: string) => {
      doc.save(`${filename}.pdf`);
    },
  };
}
