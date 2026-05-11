"use client";

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
  color: string;
  loading?: boolean;
  height?: number;
};

export function RankingChartCard({
  title,
  data,
  valueKey,
  seriesName,
  color,
  loading = false,
  height = 350,
}: RankingChartCardProps) {
  const option = !loading && data.length > 0 ? {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", opacity: 0.3 } },
    },
    yAxis: {
      type: "category",
      data: [...data]
        .sort((a, b) => Number(a[valueKey as keyof typeof a]) - Number(b[valueKey as keyof typeof b]))
        .map((d) => d.nombre),
      axisTick: { show: false },
    },
    series: [
      {
        name: seriesName,
        type: "bar",
        data: [...data]
          .sort((a, b) => Number(a[valueKey as keyof typeof a]) - Number(b[valueKey as keyof typeof b]))
          .map((d) => d[valueKey as keyof typeof d]),
        itemStyle: {
          color,
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: "right",
          formatter: "{c}",
        },
      },
    ],
  } : null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-4 text-base font-semibold text-card-foreground">
        {title}
      </h3>
      {loading ? (
        <Skeleton style={{ height }} className="w-full rounded-lg" />
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
