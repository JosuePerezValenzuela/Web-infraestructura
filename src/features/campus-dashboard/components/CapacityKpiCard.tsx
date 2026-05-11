"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

type CapacityKpiCardProps = {
  title: string;
  total: number;
  examen: number;
  loading?: boolean;
};

export function CapacityKpiCard({
  title,
  total,
  examen,
  loading = false,
}: CapacityKpiCardProps) {
  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: "{b}: {c}",
      },
      grid: {
        top: 10,
        bottom: 20,
        left: 0,
        right: 40,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        show: false,
      },
      yAxis: {
        type: "category",
        data: ["Examen", "Total"],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11,
          color: "var(--muted-foreground)",
          fontWeight: 500,
        },
      },
      series: [
        {
          name: "Capacidad",
          type: "bar",
          data: [
            {
              value: examen,
              itemStyle: { color: "var(--primary)" },
            },
            {
              value: total,
              itemStyle: { color: "var(--chart-2)" }, // Usar otra variable de chart si existe o una secundaria
            },
          ],
          barWidth: 12,
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
          },
          label: {
            show: true,
            position: "right",
            formatter: (params: any) => params.value.toLocaleString(),
            fontSize: 11,
            fontWeight: "bold",
            color: "var(--foreground)",
          },
        },
      ],
    };
  }, [total, examen]);

  if (loading) {
    return (
      <div className="flex h-44 flex-col justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-44 flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
        <p className="text-3xl font-bold text-foreground">
          {total.toLocaleString()}
        </p>
      </div>

      <div className="h-20 w-full">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
