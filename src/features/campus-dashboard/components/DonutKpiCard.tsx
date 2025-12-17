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
  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const value = params.value ?? 0;
          const percent = params.percent ?? 0;
          return `${params.name}: ${value} (${percent}%)`;
        },
      },
      legend: { show: false },
      series: [
        {
          name: title,
          type: "pie",
          radius: ["60%", "80%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "center",
            formatter: () => {
              const total = data.reduce((acc, item) => acc + (item.value ?? 0), 0);
              return total.toLocaleString();
            },
            fontSize: 16,
            fontWeight: 600,
          },
          labelLine: { show: false },
          data: data.map((item) => ({
            name: item.label,
            value: item.value ?? 0,
          })),
        },
      ],
      color: ["#059669", "#f97316", "#2563eb", "#7c3aed"],
    };
  }, [data, title]);

  return (
    <div
      className="rounded-lg border bg-card p-4 shadow-sm"
      data-testid="campus-kpi-card"
    >
      <p className="text-sm font-semibold">{title}</p>
      {loading ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ) : (
        <div className="mt-2">
          <ReactECharts option={option} style={{ height: 180 }} />
        </div>
      )}
    </div>
  );
}
