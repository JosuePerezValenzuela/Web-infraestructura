/**
 * Dashboard Color Palette
 * 
 * Colores centralizados para usar en ECharts (canvas/SVG).
 * Mantienen consistencia con las variables CSS del tema.
 * 
 * Paleta: Azules -> Verdes -> Dorados/Ocres -> Grises -> Púrpuras
 * Todos los colores siguen una línea coherente sin naranja/rojo.
 * 
 * IMPORTANTE: Si cambias estos hex, también cambia los oklch en globals.css
 */

/**
 * Paleta de colores para gráficos (orden sugerido para mejor contraste visual)
 */
export const CHART_COLORS = {
  // Azules (indices 0-3) - azul oscuro a azul sky
  primary: "#003049",
  chart1: "#003049",  // Azul oscuro (primary)
  chart2: "#1A5276",  // Azul medio
  chart3: "#2980B9",  // Azul claro
  chart4: "#5DADE2",  // Azul sky
  
  // Verdes (indices 4-7) - verde azulado a verde suave
  chart5: "#148F77",  // Verde azulado
  chart6: "#1E8449",  // Verde
  chart7: "#27AE60",  // Verde claro
  chart8: "#7DCEA0",  // Verde suave
  
  // Dorados/Ocres (indices 8-11) - oro a marrón
  chart9: "#D4A84B",  // Oro/ocre
  chart10: "#B7950B", // Ocre oscuro
  chart11: "#A67C52", // Marrón claro
  chart12: "#7E5109", // Marrón oscuro
  
  // Grises (indices 12-17) - gris azulado a gris slate oscuro
  chart13: "#566573", // Gris azulado
  chart14: "#7B7D7D", // Gris medio
  chart15: "#99A3A4", // Gris claro
  chart16: "#ABB2B9", // Gris muy claro
  chart17: "#85929E", // Gris slate
  chart18: "#515A5A", // Gris slate oscuro
  
  // Púrpuras (indices 18-19) - para variedad
  chart19: "#6C3483", // Púrpura medio
  chart20: "#7D3C98", // Púrpura claro
} as const;

// Array de colores para iterar (orden sugerido para distribuciones)
export const CHART_COLOR_ARRAY: readonly string[] = [
  CHART_COLORS.chart1,    // 0 - Azul oscuro
  CHART_COLORS.chart2,    // 1 - Azul medio
  CHART_COLORS.chart3,    // 2 - Azul claro
  CHART_COLORS.chart4,    // 3 - Azul sky
  CHART_COLORS.chart5,    // 4 - Verde azulado
  CHART_COLORS.chart6,    // 5 - Verde
  CHART_COLORS.chart7,    // 6 - Verde claro
  CHART_COLORS.chart8,    // 7 - Verde suave
  CHART_COLORS.chart9,    // 8 - Oro/ocre
  CHART_COLORS.chart10,   // 9 - Ocre oscuro
  CHART_COLORS.chart11,   // 10 - Marrón claro
  CHART_COLORS.chart12,   // 11 - Marrón oscuro
  CHART_COLORS.chart13,   // 12 - Gris azulado
  CHART_COLORS.chart14,   // 13 - Gris medio
  CHART_COLORS.chart15,   // 14 - Gris claro
  CHART_COLORS.chart16,   // 15 - Gris muy claro
  CHART_COLORS.chart17,   // 16 - Gris slate
  CHART_COLORS.chart18,   // 17 - Gris slate oscuro
  CHART_COLORS.chart19,   // 18 - Púrpura medio
  CHART_COLORS.chart20,   // 19 - Púrpura claro
];

/**
 * Obtiene un color del array por índice (cíclico si excede el límite)
 */
export function getChartColor(index: number): string {
  return CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length];
}

/**
 * Colores específicos para tipos de gráficos
 * Cada paleta usa colores coherentes que no compiten entre sí
 */
export const CHART_PALETTES = {
  /** Para gráficos de dona/KPI - 2 colores: activo/inactivo */
  donut: [CHART_COLORS.chart1, CHART_COLORS.chart3] as const,
  
  /** Para barras de capacidad - 2 colores: examen/total */
  capacity: [CHART_COLORS.chart3, CHART_COLORS.chart9] as const,
  
  /** Para rankings - 1 color por tipo de dato */
  ranking: {
    cantidad: CHART_COLORS.chart5,   // Verde azulado
    capacidad: CHART_COLORS.chart9,  // Oro/ocre
    default: CHART_COLORS.chart1,    // Azul oscuro
  } as const,
  
  /** Para distribuciones - colores cycling para múltiples tipos (primeros 10) */
  distribution: CHART_COLOR_ARRAY.slice(0, 10) as readonly string[],
} as const;

/**
 * Obtiene color para ranking basado en valueKey
 */
export function getRankingColor(valueKey: string): string {
  const key = valueKey.toLowerCase();
  if (key.includes("cantidad") || key.includes("ambiente")) {
    return CHART_PALETTES.ranking.cantidad;
  }
  if (key.includes("capacidad")) {
    return CHART_PALETTES.ranking.capacidad;
  }
  return CHART_PALETTES.ranking.default;
}