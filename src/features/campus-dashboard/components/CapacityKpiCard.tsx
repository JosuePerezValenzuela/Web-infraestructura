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
    const complement = Math.max(total - examen, 0);
    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const items = params as Array<{ seriesName: string; value: number }>;
          const totalValue = (items?.[0]?.value ?? 0) + (items?.[1]?.value ?? 0);
          return [
            `<strong>${title}</strong>`,
            ...items.map(
              (item) =>
                `${item.seriesName}: ${item.value.toLocaleString()}`
            ),
            `Total: ${totalValue.toLocaleString()}`,
          ].join("<br />");
        },
      },
      grid: { left: 12, right: 12, bottom: 16, top: 30, containLabel: true },
      xAxis: { type: "category", data: [title], axisTick: { show: false }, axisLabel: { show: false } },
      yAxis: { type: "value", splitLine: { show: false } },
      series: [
        {
          name: "Examen",
          type: "bar",
          stack: "capacidad",
          itemStyle: { color: "#a855f7" },
          barWidth: "45%",
          label: {
            show: true,
            position: "insideTop",
            formatter: ({ value }: { value: number }) =>
              `${value.toLocaleString()} (Examen)`,
          },
          data: [examen],
        },
        {
          name: "Total",
          type: "bar",
          stack: "capacidad",
          itemStyle: { color: "#22c55e" },
          barWidth: "45%",
          label: {
            show: true,
            position: "inside",
            formatter: ({ value }: { value: number }) =>
              `${(value + examen).toLocaleString()} (Total)`,
          },
          data: [complement],
        },
      ],
    };
  }, [examen, title, total]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" data-testid="campus-kpi-card">
      <p className="text-sm font-semibold">{title}</p>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="mt-2">
          <ReactECharts option={option} style={{ height: 200 }} opts={{ locale: "es" }} />
        </div>
      )}
    </div>
  );
}
