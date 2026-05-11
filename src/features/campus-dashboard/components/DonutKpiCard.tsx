"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

type DonutDatum = { label: string; value: number };

type DonutKpiCardProps = {
  title: string;
  data: DonutDatum[];
  loading?: boolean;
};

export function DonutKpiCard({ title, data, loading = false }: DonutKpiCardProps) {
  const total = useMemo(() => data.reduce((acc, curr) => acc + (curr.value ?? 0), 0), [data]);
  
  const activos = data.find((d) => d.label === "Activos" || d.label === "Asignados" || d.label === "Activas")?.value ?? 0;
  const inactivos = data.find((d) => d.label === "Inactivos" || d.label === "Sin Asignar" || d.label === "Sin asignar" || d.label === "Inactivas")?.value ?? 0;

  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
      },
      series: [
        {
          name: title,
          type: "pie",
          radius: ["70%", "90%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: "transparent",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: false,
            },
          },
          labelLine: {
            show: false,
          },
          data: data.map((item) => ({
            name: item.label,
            value: item.value ?? 0,
            itemStyle: {
              color: 
                item.label === "Activos" || item.label === "Asignados" || item.label === "Activas"
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
            },
          })),
        },
      ],
      graphic: {
        type: "text",
        left: "center",
        top: "center",
        style: {
          text: total.toLocaleString(),
          textAlign: "center",
          fill: "var(--foreground)",
          fontSize: 18,
          fontWeight: "bold",
        },
      },
    };
  }, [data, title, total]);

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-28 w-28 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-44 items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col justify-between h-full py-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-foreground">{total.toLocaleString()}</p>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{activos.toLocaleString()}</span> Disponibles
            </p>
          </div>
          {inactivos >= 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">{inactivos.toLocaleString()}</span> Inactivos
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="h-32 w-32 shrink-0">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
