"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

type RankingChartCardProps = {
  title: string;
  data: Array<{ nombre: string; [key: string]: number | string }>;
  valueKey: string;
  seriesName: string;
  color?: string;
  loading?: boolean;
  height?: number;
};

export function RankingChartCard({
  title,
  data,
  valueKey,
  seriesName,
  color = "var(--primary)", // Usar variable CSS por defecto
  loading = false,
  height = 350,
}: RankingChartCardProps) {
  const option = useMemo(() => {
    if (loading || !data.length) return null;

    // Ordenamos de mayor a menor (descendente)
    const sortedData = [...data].sort(
      (a, b) => Number(a[valueKey as keyof typeof a]) - Number(b[valueKey as keyof typeof b])
    );

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const item = params[0];
          return `<strong>${item.name}</strong><br/>${seriesName}: ${item.value.toLocaleString()}`;
        },
      },
      grid: {
        left: "3%",
        right: "12%",
        bottom: "3%",
        top: "5%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        splitLine: { 
          lineStyle: { 
            type: "dashed", 
            opacity: 0.2,
            color: "rgb(var(--border) / 0.5)" 
          } 
        },
        axisLabel: {
          color: "var(--muted-foreground)",
          fontSize: 10,
        }
      },
      yAxis: {
        type: "category",
        data: sortedData.map((d) => d.nombre),
        axisTick: { show: false },
        axisLine: { 
          lineStyle: { color: "var(--border)" } 
        },
        axisLabel: {
          color: "var(--foreground)",
          fontSize: 11,
          fontWeight: 500,
          width: 100,
          overflow: "truncate"
        },
      },
      series: [
        {
          name: seriesName,
          type: "bar",
          data: sortedData.map((d) => d[valueKey as keyof typeof d]),
          barWidth: "60%",
          itemStyle: {
            color, // Ahora recibirá "var(--primary)" o similar
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: "right",
            formatter: (params: any) => params.value.toLocaleString(),
            color: "var(--foreground)",
            fontSize: 11,
            fontWeight: "bold",
            distance: 10
          },
          emphasis: {
            itemStyle: {
              opacity: 0.8
            }
          }
        },
      ],
    };
  }, [data, valueKey, seriesName, color, loading]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <h3 className="mb-6 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 flex-1 rounded-sm" />
            </div>
          ))}
        </div>
      ) : option ? (
        <div className="mt-2">
          <ReactECharts
            option={option}
            style={{ height }}
            opts={{ locale: "es" }}
          />
        </div>
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
