"use client";

import { toast } from "sonner";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type NotifyOptions = {
  title: string;
  description?: string;
  action?: ReactNode;
};

type ToneConfig = {
  icon: ComponentType<{ className?: string }>;
  accentClass: string;
  duration: number;
};

type BarColors = {
  track: string;
  fill: string;
};

const toneConfig: Record<Tone, ToneConfig> = {
  success: {
    icon: CheckCircle2,
    accentClass:
      "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm shadow-emerald-100/60",
    duration: 3500,
  },
  error: {
    icon: XCircle,
    accentClass:
      "border-rose-200 bg-rose-50 text-rose-950 shadow-sm shadow-rose-100/60",
    duration: 5000,
  },
  info: {
    icon: Info,
    accentClass: "border-slate-200 bg-slate-50 text-slate-950 shadow-sm shadow-slate-100/60",
    duration: 4000,
  },
};

const toneBarColors: Record<Tone, BarColors> = {
  success: { track: "bg-emerald-200/80", fill: "bg-emerald-500/90" },
  error: { track: "bg-rose-200/80", fill: "bg-rose-500/90" },
  info: { track: "bg-slate-200/80", fill: "bg-slate-500/90" },
};

function CountdownBar({ duration, tone }: { duration: number; tone: Tone }) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const barColors = toneBarColors[tone];

  return (
    <>
      <style>
        {`@keyframes notify-countdown { from { width: 100%; } to { width: 0%; } }`}
      </style>
      <div
        className={cn(
          "relative h-1 w-full overflow-hidden rounded-full",
          barColors.track
        )}
      >
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full", barColors.fill)}
          style={{
            animation: started
              ? `notify-countdown ${duration}ms linear forwards`
              : undefined,
          }}
          aria-hidden
        />
      </div>
    </>
  );
}

function renderContent(tone: Tone, options: NotifyOptions) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex w-[320px] items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        config.accentClass ?? "bg-background text-foreground border-border"
      )}
    >
      <Icon className="mt-0.5 h-5 w-5" aria-hidden />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold leading-tight">{options.title}</p>
        {options.description ? (
          <p className="text-xs leading-snug opacity-80">{options.description}</p>
        ) : null}
        {options.action ? <div className="pt-1 text-xs">{options.action}</div> : null}
        <CountdownBar duration={config.duration} tone={tone} />
      </div>
    </div>
  );
}

function showNotification(tone: Tone, options: NotifyOptions) {
  const config = toneConfig[tone];
  return toast.custom(() => renderContent(tone, options), {
    duration: config.duration,
  });
}

export const notify = {
  success: (options: NotifyOptions) => showNotification("success", options),
  error: (options: NotifyOptions) => showNotification("error", options),
  info: (options: NotifyOptions) => showNotification("info", options),
};
