import { API_BASE } from "@/lib/api";
import { createPdfCapture } from "@/lib/pdf";
import type { InventoryScope } from "./download";

// ================================================================
// Tipos de la API
// ================================================================

type AmbienteDTO = {
  id: number;
  codigo: string;
  nombre: string;
  piso: number;
  tipo_ambiente: string;
  capacidad: { total: number; examen: number };
  dimensiones?: string;
  clases: boolean;
  estado: "activo" | "inactivo";
  activos_count: number;
};

type BloqueDTO = {
  id: number;
  codigo: string;
  nombre: string;
  tipo_bloque: string;
  pisos: number;
  estado: "activo" | "inactivo";
  ambientes: AmbienteDTO[];
};

type FacultadDTO = {
  id: number;
  codigo: string;
  nombre: string;
  estado: "activo" | "inactivo";
  bloques: BloqueDTO[];
};

type CampusDTO = {
  id: number;
  codigo: string;
  nombre: string;
  direccion: string;
  estado: "activo" | "inactivo";
  facultades: FacultadDTO[];
};

type InventoryResponse = {
  scope: InventoryScope;
  campus?: CampusDTO;
  facultad?: FacultadDTO;
  bloque?: BloqueDTO;
};

// ================================================================
// Constantes de página
// ================================================================

const PAGE_WIDTH = 210;  // A4 mm
const PAGE_HEIGHT = 297; // A4 mm
const MARGIN = 10;
const INNER_H = PAGE_HEIGHT - MARGIN * 2; // 277mm

// ================================================================
// CSS helpers (inline styles como strings)
// ================================================================

const CSS = {
  page: `width:${PAGE_WIDTH}mm; height:${INNER_H}mm; padding:${MARGIN}mm; background:#fff; box-sizing:border-box; font-family:Arial,sans-serif; display:flex; flex-direction:column; overflow:hidden;`,

  header: `border-bottom:2px solid #1e293b; padding-bottom:8px; margin-bottom:16px; flex-shrink:0;`,

  footer: `margin-top:16px; padding-top:8px; border-top:1px solid #cbd5e1; display:flex; justify-content:space-between; font-size:10px; color:#64748b; flex-shrink:0;`,

  spacer: `flex:1; min-height:0;`,

  card: `border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; flex-shrink:0;`,

  cardTitle: `background:#f1f5f9; padding:10px 16px; border-bottom:1px solid #cbd5e1;`,

  table: `width:100%; border-collapse:collapse; font-size:11px;`,

  th: `padding:8px 10px; text-align:left; font-weight:600; color:#475569; border-bottom:1px solid #cbd5e1; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;`,

  td: `padding:7px 10px; color:#334155; vertical-align:middle;`,

  row: (last: boolean) =>
    `border-bottom:${last ? "none" : "1px solid #e2e8f0"};`,

  estado: (activo: boolean) => {
    const bg = activo ? "#d1fae5" : "#f1f5f9";
    const tx = activo ? "#065f46" : "#64748b";
    return `display:inline-block; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:500; background:${bg}; color:${tx};`;
  },
};

// ================================================================
// Construcción de elementos HTML
// ================================================================

function statusText(estado: string): string {
  return estado === "activo" ? "Activo" : "Inactivo";
}

/** Datos para el header del reporte (mismos campos que ReportHeader) */
type HeaderData = {
  logoSrc?: string;
  institutionName: string;
  systemName: string;
  userName?: string;
  generatedAt: Date;
};

const DEFAULT_HEADER: HeaderData = {
  logoSrc: "/logo_UMSS.png",
  institutionName: "Universidad Mayor de San Simón",
  systemName: "Gestión de Infraestructura",
  generatedAt: new Date(),
};

/** Crea el header del reporte (coincide visualmente con ReportHeader de report-layout) */
function createHeaderEl(headerData: HeaderData, scope: InventoryScope): HTMLDivElement {
  const { institutionName, systemName, userName, generatedAt } = headerData;
  const dateStr = generatedAt.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = generatedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const displayUser = userName || "Sin usuario";

  const d = document.createElement("div");
  d.style.cssText = CSS.header;
  d.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${headerData.logoSrc ? `<img src="${headerData.logoSrc}" alt="Logo" style="width:48px; height:48px; object-fit:contain;" />` : ""}
        <div>
          <div style="font-size:18px; font-weight:700; color:#1e293b; line-height:1.2;">${institutionName}</div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">Reporte de inventario — ${scope === "campus" ? "Campus" : scope === "facultad" ? "Facultad" : "Bloque"}</div>
        </div>
      </div>
      <div style="text-align:right; font-size:10px; color:#64748b; line-height:1.6;">
        <div>${dateStr} ${timeStr}</div>
        <div><span style="font-weight:500;">Sistema:</span> ${systemName}</div>
        <div><span style="font-weight:500;">Usuario:</span> ${displayUser}</div>
      </div>
    </div>
  `;
  return d;
}

/** Crea el footer con número de página */
function createFooterEl(pageNum: number, totalPages: number, systemName: string): HTMLDivElement {
  const d = document.createElement("div");
  d.style.cssText = CSS.footer;
  const pageText = totalPages > 0 ? `Página ${pageNum} de ${totalPages}` : `Página ${pageNum}`;
  d.innerHTML = `
    <span>${pageText}</span>
    <span>${systemName}</span>
  `;
  return d;
}

/** Crea un elemento de página vacío (con header, spacer y footer) */
function createPageShell(
  headerData: HeaderData,
  scope: InventoryScope,
  pageNum: number,
  totalPages: number,
): HTMLDivElement {
  const page = document.createElement("div");
  page.style.cssText = CSS.page;
  page.appendChild(createHeaderEl(headerData, scope));
  const spacer = document.createElement("div");
  spacer.style.cssText = CSS.spacer;
  spacer.setAttribute("data-slot", "spacer");
  page.appendChild(spacer);
  page.appendChild(createFooterEl(pageNum, totalPages, headerData.systemName));
  return page;
}

/** Encuentra el spacer dentro de un page shell para reemplazarlo con contenido */
function getSpacer(pageEl: HTMLDivElement): HTMLElement | null {
  return pageEl.querySelector('[data-slot="spacer"]');
}

// ================================================================
// Construcción de tabla como array de strings HTML (filas)
// ================================================================

type TableCol = { key: string; header: string };
type TableRow = Record<string, string>;

function makeTableRowsHtml(
  cols: TableCol[],
  rows: TableRow[],
): string[] {
  return rows.map((row, idx) => {
    const isLast = idx === rows.length - 1;
    const cells = cols
      .map((col) => {
        const val = row[col.key] ?? "-";
        if (col.key === "estado") {
          const active = val === "activo";
          return `<td style="${CSS.td}"><span style="${CSS.estado(active)}">${statusText(val)}</span></td>`;
        }
        return `<td style="${CSS.td}">${val}</td>`;
      })
      .join("");

    return `<tr style="${CSS.row(isLast)}">${cells}</tr>`;
  });
}

function makeTableSectionHtml(title: string, cols: TableCol[], rowHtmls: string[]): string {
  return `
    <div style="${CSS.card}">
      <div style="${CSS.cardTitle}"><h3 style="font-size:13px; font-weight:600; color:#1e293b; margin:0;">${title}</h3></div>
      <div style="padding:0; overflow:visible;">
        <table style="${CSS.table}">
          <thead>
            <tr style="background:#f8fafc;">
              ${cols.map((c) => `<th style="${CSS.th}">${c.header}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rowHtmls.join("\n")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ================================================================
// Page builder con overflow detection
// ================================================================

/**
 * Construye páginas para una sección de tabla usando detección de overflow.
 *
 * Cada página contiene header + título de sección + tabla (con filas que entran) + footer.
 * Cuando la tabla no cabe, las filas se parten justo en el límite de fila (nunca a la mitad).
 *
 * @param scope     - Tipo de entidad para el header
 * @param sectionTitle - Título de la sección (ej: "2. Facultades")
 * @param cols      - Definición de columnas
 * @param rows      - Datos de las filas
 * @param pageOffset - Número de página donde empieza esta sección
 * @returns Array de elementos DIV, uno por página
 */
function buildTablePages(
  headerData: HeaderData,
  scope: InventoryScope,
  sectionTitle: string,
  cols: TableCol[],
  rows: TableRow[],
  pageOffset: number,
): { pages: HTMLDivElement[]; totalUsed: number } {
  if (rows.length === 0) return { pages: [], totalUsed: 0 };

  // Convertir filas a HTML una sola vez
  const allRowHtmls = makeTableRowsHtml(cols, rows);

  // Template de la tabla SIN filas (solo thead)
  const tableTemplate = (rowHtmls: string[]) => makeTableSectionHtml(sectionTitle, cols, rowHtmls);

  const result: HTMLDivElement[] = [];
  let rowIdx = 0;
  let pageCount = 0;

  while (rowIdx < allRowHtmls.length) {
    pageCount++;
    const shell = createPageShell(headerData, scope, pageOffset + pageCount, 999); // total se corrige después

    // Empezamos con todas las filas restantes
    const remainingCount = allRowHtmls.length - rowIdx;
    const candidateRows: string[] = [];

    // Agregamos filas de a una hasta detectar overflow
    for (let i = 0; i < remainingCount; i++) {
      candidateRows.push(allRowHtmls[rowIdx + i]);

      // Construir HTML de prueba con las filas actuales
      const testHtml = tableTemplate(candidateRows);

      // Clonar el shell y agregar la tabla para medir
      const testEl = shell.cloneNode(true) as HTMLDivElement;
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = testHtml;
      const tableEl = tempDiv.firstElementChild as HTMLElement;

      // Insertar contenido ANTES del spacer (así el spacer sigue empujando el footer)
      const spacerEl = getSpacer(testEl);
      if (spacerEl) testEl.insertBefore(tableEl, spacerEl);
      testEl.style.position = "absolute";
      testEl.style.left = "-9999px";
      testEl.style.top = "0";
      document.body.appendChild(testEl);

      const overflows = testEl.scrollHeight > testEl.clientHeight;

      document.body.removeChild(testEl);

      if (overflows) {
        // La última fila agregada no entra → la sacamos
        candidateRows.pop();
        break;
      }
    }

    if (candidateRows.length === 0) {
      // Ni una sola fila entra (caso extremo: una fila es más alta que la página)
      candidateRows.push(allRowHtmls[rowIdx]);
    }

    // Construir página definitiva con las filas que entraron
    const finalShell = createPageShell(headerData, scope, pageOffset + pageCount, 0);
    const finalHtml = tableTemplate(candidateRows);
    const finalDiv = document.createElement("div");
    finalDiv.innerHTML = finalHtml;
    const finalTableEl = finalDiv.firstElementChild as HTMLElement;
    const finalSpacer = getSpacer(finalShell);
    if (finalSpacer) finalShell.insertBefore(finalTableEl, finalSpacer);
    result.push(finalShell);

    rowIdx += candidateRows.length;
  }

  return { pages: result, totalUsed: pageCount };
}

// ================================================================
// Generación del PDF
// ================================================================

/**
 * Genera el PDF de inventario para campus, facultad o bloque.
 *
 * Estrategia:
 * 1. Obtiene los datos de la API
 * 2. Construye páginas UNA POR UNA con detección de overflow
 * 3. Cada sección (info, facultades, bloques, ambientes) arranca en una nueva hoja
 * 4. Las tablas se parten JUSTO en el límite de una fila (nunca a la mitad)
 * 5. Captura cada página con html2canvas-pro y las compone en un solo PDF con jsPDF
 */
export async function generateInventoryPdf(
  scope: InventoryScope,
  scopeId: number | string,
): Promise<string> {
  // --- 1. Fetch data ---
  const params = new URLSearchParams({ scope, scopeId: String(scopeId), formato: "pdf" });
  const url = `${API_BASE}/reportes/inventario-ambientes?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let message = response.statusText || "No se pudo obtener los datos del reporte.";
    try {
      const errorBody = await response.json();
      if (errorBody?.message) message = errorBody.message;
    } catch { /* keep default */ }
    throw new Error(message);
  }

  const data: InventoryResponse = await response.json();

  const entity = data.campus ?? data.facultad ?? data.bloque;
  const headerData: HeaderData = { ...DEFAULT_HEADER };

  const entityLabel = scope === "campus" ? "Campus" : scope === "facultad" ? "Facultad" : "Bloque";

  // ================================================================
  // Construir TODAS las páginas primero (sin capturar)
  // ================================================================
  const allPages: HTMLDivElement[] = [];

  // --- Página 1: Info de la entidad ---
  {
    const shell = createPageShell(headerData, scope, 1, 0);
    const infoHtml = `
      <div style="${CSS.card}">
        <div style="${CSS.cardTitle}"><h3 style="font-size:13px; font-weight:600; color:#1e293b; margin:0;">1. ${entityLabel}</h3></div>
        <div style="padding:12px 16px;">
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            ${[
              ["Nombre", entity?.nombre ?? "-"],
              ["Código", `<span style="font-family:monospace">${entity?.codigo ?? "-"}</span>`],
              ...(data.campus ? [["Dirección", data.campus.direccion]] : []),
              ...(data.bloque ? [["Tipo", data.bloque.tipo_bloque], ["Pisos", String(data.bloque.pisos)]] : []),
              ["Estado", `<span style="${CSS.estado(entity?.estado === "activo")}">${statusText(entity?.estado ?? "inactivo")}</span>`],
            ].map(([label, value]) => `
              <tr><td style="padding:6px 12px 6px 0; color:#64748b; width:120px; vertical-align:top; font-size:12px;">${label}</td>
              <td style="padding:6px 0; font-weight:500; color:#1e293b; font-size:12px;">${value}</td></tr>
            `).join("")}
          </table>
        </div>
      </div>
    `;
    const temp = document.createElement("div");
    temp.innerHTML = infoHtml;
    const spacerEl = getSpacer(shell);
    if (spacerEl) shell.insertBefore(temp.firstElementChild!, spacerEl);
    allPages.push(shell);
  }

  // --- Preparar datos para tablas ---
  const facultades: FacultadDTO[] = data.campus?.facultades ?? [];
  const bloques: BloqueDTO[] = data.campus
    ? data.campus.facultades.flatMap((f) => f.bloques)
    : data.facultad ? data.facultad.bloques : [];
  const ambientes: Array<AmbienteDTO & { bloqueNombre: string }> = data.campus
    ? data.campus.facultades.flatMap((f) => f.bloques.flatMap((b) => b.ambientes.map((a) => ({ ...a, bloqueNombre: b.nombre }))))
    : data.facultad ? data.facultad.bloques.flatMap((b) => b.ambientes.map((a) => ({ ...a, bloqueNombre: b.nombre })))
    : data.bloque ? data.bloque.ambientes.map((a) => ({ ...a, bloqueNombre: data.bloque!.nombre }))
    : [];

  function findFacultadForBloque(bloqueId: number): string {
    if (data.campus) {
      const fac = data.campus.facultades.find((f) => f.bloques.some((b) => b.id === bloqueId));
      return fac?.nombre ?? "-";
    }
    if (data.facultad) return data.facultad.nombre;
    return "-";
  }

  // --- Tablas ---
  const tableSections: Array<{ title: string; cols: TableCol[]; rows: TableRow[] }> = [];
  if (facultades.length > 0) {
    tableSections.push({
      title: "2. Facultades",
      cols: [
        { key: "codigo", header: "Código" },
        { key: "nombre", header: "Nombre" },
        { key: "estado", header: "Estado" },
      ],
      rows: facultades.map((f) => ({ codigo: f.codigo, nombre: f.nombre, estado: f.estado })),
    });
  }
  if (bloques.length > 0) {
    tableSections.push({
      title: "3. Bloques",
      cols: [
        { key: "codigo", header: "Código" },
        { key: "nombre", header: "Nombre" },
        { key: "facultad", header: "Facultad" },
        { key: "tipo", header: "Tipo" },
        { key: "pisos", header: "Pisos" },
        { key: "estado", header: "Estado" },
      ],
      rows: bloques.map((b) => ({
        codigo: b.codigo,
        nombre: b.nombre,
        facultad: findFacultadForBloque(b.id),
        tipo: b.tipo_bloque,
        pisos: String(b.pisos),
        estado: b.estado,
      })),
    });
  }
  if (ambientes.length > 0) {
    tableSections.push({
      title: "4. Ambientes",
      cols: [
        { key: "codigo", header: "Código" },
        { key: "nombre", header: "Nombre" },
        { key: "bloque", header: "Bloque" },
        { key: "piso", header: "Piso" },
        { key: "tipo", header: "Tipo" },
        { key: "capacidad", header: "Capacidad" },
        { key: "estado", header: "Estado" },
      ],
      rows: ambientes.map((a) => ({
        codigo: a.codigo,
        nombre: a.nombre,
        bloque: a.bloqueNombre,
        piso: String(a.piso),
        tipo: a.tipo_ambiente,
        capacidad: `${a.capacidad.total} pers.`,
        estado: a.estado,
      })),
    });
  }

  let pageNumber = 1;
  for (const sec of tableSections) {
    const { pages } = buildTablePages(headerData, scope, sec.title, sec.cols, sec.rows, pageNumber + 1);
    allPages.push(...pages);
    pageNumber += pages.length;
  }

  // ================================================================
  // Corregir footers con el total REAL de páginas
  // ================================================================
  const totalPagesNum = allPages.length;
  for (let i = 0; i < allPages.length; i++) {
    const footer = allPages[i].querySelector("div[style*='border-top']");
    if (footer) {
      const pageNum = i + 1;
      footer.innerHTML = footer.innerHTML.replace(
        /Página \d+( de \d+)?/,
        `Página ${pageNum} de ${totalPagesNum}`,
      );
    }
  }

  // ================================================================
  // Capturar cada página con createPdfCapture
  // ================================================================
  const pdf = await createPdfCapture({
    orientation: "portrait",
    format: "a4",
    margin: MARGIN,
    scale: 2,
  });

  for (const page of allPages) {
    await pdf.addPage(page);
  }

  // ================================================================
  // Descargar
  // ================================================================
  const scopeName = entity?.nombre ?? scope;
  const filename = `inventario_${scope}_${scopeName.toLowerCase().replace(/\s+/g, "_")}`;
  pdf.save(filename);

  return `${filename}.pdf`;
}
