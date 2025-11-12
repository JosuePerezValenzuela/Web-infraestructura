"use client";

import { toast } from "sonner";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
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

const toneConfig: Record<Tone, ToneConfig> = {
  success: {
    icon: CheckCircle2,
    accentClass: "border-emerald-200/60 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950",
    duration: 3500,
  },
  error: {
    icon: XCircle,
    accentClass: "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20",
    duration: 5000,
  },
  info: {
    icon: Info,
    accentClass: "border-primary/30 bg-primary/10 text-primary-foreground dark:text-primary",
    duration: 4000,
  },
};

function renderContent(tone: Tone, options: NotifyOptions, toastId: string | number) {
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
          <p className="text-xs text-muted-foreground leading-snug">
            {options.description}
          </p>
        ) : null}
        {options.action ? <div className="pt-1 text-xs">{options.action}</div> : null}
      </div>
      <button
        type="button"
        aria-label="Cerrar notificacion"
        className="rounded-full p-1 text-foreground/70 transition hover:bg-foreground/10"
        onClick={() => toast.dismiss(toastId)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function showNotification(tone: Tone, options: NotifyOptions) {
  const config = toneConfig[tone];
  return toast.custom((toastId) => renderContent(tone, options, toastId), {
    duration: config.duration,
  });
}

export const notify = {
  success: (options: NotifyOptions) => showNotification("success", options),
  error: (options: NotifyOptions) => showNotification("error", options),
  info: (options: NotifyOptions) => showNotification("info", options),
};
