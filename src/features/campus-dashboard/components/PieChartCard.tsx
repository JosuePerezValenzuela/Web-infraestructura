"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_PALETTES } from "@/config/dashboard-colors";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

export type PieChartDataItem = {
  tipo: string;
  cantidad: number;
};

export type PieChartCardProps = {
  title: string;
  data: PieChartDataItem[];
  loading?: boolean;
  height?: number;
};

export function PieChartCard({
  title,
  data,
  loading = false,
  height = 350,
}: PieChartCardProps) {
  const colorList = CHART_PALETTES.distribution;

  const option = useMemo(() => {
    if (loading || !data.length) return null;

    // Ordenar de mayor a menor
    const sortedData = [...data].sort((a, b) => b.cantidad - a.cantidad);

    return {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          return `<strong>${params.name}</strong><br/>
Cantidad: ${params.value.toLocaleString()}<br/>
Porcentaje: ${params.percent.toFixed(1)}%`;
        },
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        textStyle: {
          color: "var(--muted-foreground)",
          fontSize: 11,
        },
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 16,
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "15%",
        top: "5%",
        containLabel: true,
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: "var(--card)",
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "outside",
            formatter: "{b}\n{c}",
            color: "var(--foreground)",
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 16,
          },
          labelLine: {
            show: true,
            lineStyle: {
              color: "var(--border)",
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.3)",
            },
            label: {
              show: true,
              fontWeight: "bold",
            },
          },
          data: sortedData.map((item, index) => ({
            value: item.cantidad,
            name: item.tipo,
            itemStyle: {
              color: colorList[index % colorList.length],
            },
          })),
        },
      ],
    };
  }, [data, loading, colorList]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {loading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
      ) : option ? (
        <ReactECharts
          option={option}
          style={{ height }}
          opts={{ locale: "es" }}
        />
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