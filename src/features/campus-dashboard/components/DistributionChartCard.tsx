"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

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
  const option = useMemo(() => {
    if (loading || !data.length) return null;

    const allTypes = new Set<string>();
    data.forEach((campus) => {
      campus.tipos.forEach((t) => {
        allTypes.add(t.tipo || "Sin especificar");
      });
    });

    const typeList = Array.from(allTypes);
    const campusNames = data.map((d) => d.nombre);

    const series = typeList.map((type) => {
      return {
        name: type,
        type: "bar",
        stack: "total",
        emphasis: { focus: "series" },
        data: data.map((campus) => {
          const found = campus.tipos.find(
            (t) => (t.tipo || "Sin especificar") === type
          );
          return found ? found.cantidad : 0;
        }),
      };
    });

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        bottom: 0,
        type: "scroll",
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        top: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed", opacity: 0.3 } },
      },
      yAxis: {
        type: "category",
        data: campusNames,
        axisTick: { show: false },
      },
      series,
    };
  }, [data, loading]);

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
