"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useCampusDashboardFilters } from "@/features/campus-dashboard/hooks/useCampusDashboardFilters";
import { useCampusDashboardData } from "@/features/campus-dashboard/hooks/useCampusDashboardData";

type CampusOption = { id: number; nombre: string };

function SwitchInactive({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Mostrar inactivos"
      onClick={() => onCheckedChange(!checked)}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition ${
        checked
          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
          : "border-muted-foreground/40 bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`flex h-4 w-7 items-center rounded-full transition ${
          checked ? "bg-emerald-500/80" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
      Mostrar inactivos
    </button>
  );
}

export default function CampusDashboardDetailPage({
  params,
}: {
  params: { campusId: string };
}) {
  const router = useRouter();
  const campusId = Number(params.campusId);
  const { filters, setIncludeInactive, buildGlobalHref } =
    useCampusDashboardFilters();

  const { data, loading } = useCampusDashboardData({
    mode: "detail",
    campusId,
    filters,
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);

  useEffect(() => {
    let active = true;
    async function loadCampus() {
      try {
        const response = await apiFetch<{ items: CampusOption[] }>(
          "/campus?page=1&limit=50"
        );
        if (active) {
          setCampusOptions(response.items ?? []);
        }
      } catch {
        // silencioso para placeholders
      }
    }
    void loadCampus();
    return () => {
      active = false;
    };
  }, []);

  const campusLabel = useMemo(() => {
    const match = campusOptions.find((option) => option.id === campusId);
    if (match) {
      return match.nombre;
    }
    return `Campus ${campusId}`;
  }, [campusId, campusOptions]);

  const kpiEntries = useMemo(() => {
    if (data && data.layout.mode === "detail") {
      const entries = Object.entries(data.data.kpis ?? {});
      if (entries.length >= 4) return entries;
      const padded = [...entries];
      while (padded.length < 4) {
        padded.push([`kpi-${padded.length + 1}`, "--"]);
      }
      return padded;
    }
    return [
      ["kpi-1", "--"],
      ["kpi-2", "--"],
      ["kpi-3", "--"],
      ["kpi-4", "--"],
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 space-y-3 border-b bg-background/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Campus</p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-semibold">
              {campusLabel}
            </div>
          </div>
          <Link
            href="/dashboard/campus/list"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Administrar Campus
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SwitchInactive
            checked={filters.includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(buildGlobalHref())}
          >
            Volver
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiEntries.map(([label, value], index) => (
          <div
            key={label ?? index}
            data-testid="campus-kpi-card"
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            {loading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <p className="text-sm font-medium">
                  {typeof label === "string" ? label : `KPI ${index + 1}`}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {typeof value === "string" || typeof value === "number"
                    ? value
                    : "--"}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
