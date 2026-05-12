"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_PALETTES, CHART_COLOR_ARRAY } from "@/config/dashboard-colors";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

type DistributionData = {
  nombre: string;
  tipos: Array<{ tipo: string | null; cantidad: number }>;
};

type DistributionChartCardProps = {
  title: string;
  data: DistributionData[];
  loading?: boolean;
  height?: number;
};

export function DistributionChartCard({
  title,
  data,
  loading = false,
  height = 450,
}: DistributionChartCardProps) {
  // Usar paleta de distribución (primeros 10 colores de la paleta)
  const colorList = CHART_PALETTES.distribution;

  const { option, legendItems } = useMemo(() => {
    if (loading || !data.length) return { option: null, legendItems: [] };

    // Recolectar todos los tipos y calcular totales para ordenar
    const typeTotals = new Map<string, number>();
    data.forEach((campus) => {
      campus.tipos.forEach((t) => {
        const typeName = t.tipo || "Sin especificar";
        typeTotals.set(typeName, (typeTotals.get(typeName) || 0) + t.cantidad);
      });
    });

    // Ordenar tipos por cantidad total (mayor a menor)
    const sortedTypes = Array.from(typeTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tipo]) => tipo);

    // Ordenar campuses por cantidad total (menor a mayor)
    // Para que el de mayor cantidad aparezca ARRIBA en la gráfica
    const sortedData = [...data].sort((a, b) => {
      const totalA = a.tipos.reduce((sum, t) => sum + t.cantidad, 0);
      const totalB = b.tipos.reduce((sum, t) => sum + t.cantidad, 0);
      return totalA - totalB; // Menor a mayor = mayor queda arriba
    });

    const campusNames = sortedData.map((d) => d.nombre);

    // Construir series en el orden calculado
    const series = sortedTypes.map((type) => ({
      name: type,
      type: "bar" as const,
      stack: "total" as const,
      emphasis: { focus: "series" },
      data: sortedData.map((campus) => {
        const found = campus.tipos.find(
          (t) => (t.tipo || "Sin especificar") === type
        );
        return found ? found.cantidad : 0;
      }),
    }));

    // Crear items de leyenda para la lista personalizada
    const legendItems = sortedTypes.map((type, index) => ({
      tipo: type,
      color: colorList[index % colorList.length],
      cantidad: typeTotals.get(type) || 0,
    }));

    return {
      option: {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          // Filtrar solo items con cantidad > 0 en el tooltip
          formatter: (params: any[]) => {
            const validItems = params.filter((p) => p.value > 0);
            if (validItems.length === 0) return "";
            return validItems
              .map((p) => `<span style="display:inline-block;margin-right:4px;border-radius:50%;width:8px;height:8px;background:${p.color};"></span>${p.seriesName}: <strong>${p.value}</strong>`)
              .join("<br/>");
          },
        },
        legend: {
          show: false, // Ocultamos la leyenda de ECharts, usamos la nuestra
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "15%", // Más espacio para la leyenda personalizada
          top: "3%",
          containLabel: true,
        },
        xAxis: {
          type: "value",
          splitLine: { lineStyle: { type: "dashed", opacity: 0.2, color: "var(--border)" } },
          axisLabel: { color: "var(--muted-foreground)" },
        },
        yAxis: {
          type: "category",
          data: campusNames,
          axisTick: { show: false },
          axisLine: { lineStyle: { color: "var(--border)" } },
          axisLabel: { color: "var(--foreground)", fontWeight: 500 },
        },
        series,
        color: colorList,
      },
      legendItems,
    };
  }, [data, loading, colorList]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-4 text-base font-semibold text-card-foreground">
        {title}
      </h3>
      {loading ? (
        <Skeleton style={{ height }} className="w-full rounded-lg" />
      ) : option ? (
        <>
          <ReactECharts
            option={option}
            style={{ height: height - 60 }}
            opts={{ locale: "es" }}
          />
          {/* Leyenda personalizada: colores y tipos ordenados por cantidad */}
          {legendItems.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
              {legendItems.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.tipo}{" "}
                    <span className="font-medium text-foreground">
                      ({item.cantidad.toLocaleString()})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          style={{ height }}
          className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        >
          No hay datos disponibles
        </div>
      )}
    </div>
  );
}