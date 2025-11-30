"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { notify } from "@/lib/notify";
import { apiFetch } from "@/lib/api";
import type { EnvironmentRow } from "./columns";
import { Clock3, Trash2 } from "lucide-react";

type EnvironmentSchedulesDialogProps = {
  open: boolean;
  environment: EnvironmentRow | null;
  onClose: () => void;
  onSuccess: () => void;
};

type SelectedSlots = Record<number, Set<string>>;
type LastSelection = { day: number; slot: string } | null;

type ApiError = {
  error?: string;
  message?: string;
  details?: Array<{ field?: string; message?: string }> | string;
};

const DAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Lunes" },
  { value: 1, label: "Martes" },
  { value: 2, label: "Miercoles" },
  { value: 3, label: "Jueves" },
  { value: 4, label: "Viernes" },
  { value: 5, label: "Sabado" },
  { value: 6, label: "Domingo" },
];

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function buildSlots(start: string, end: string, period: number): string[] {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const slots: string[] = [];
  for (
    let current = startMinutes;
    current <= endMinutes - period;
    current += period
  ) {
    slots.push(toTimeString(current));
  }
  return slots;
}

function formatEnvironmentLabel(environment: EnvironmentRow | null): string {
  if (!environment) return "";
  const name =
    typeof environment.nombre === "string" ? environment.nombre.trim() : "";
  const code =
    typeof environment.codigo === "string" ? environment.codigo.trim() : "";
  if (name && code) return `${name} (${code})`;
  return name || code;
}

function resolveApiError(error: unknown): string {
  const generic = "Intenta nuevamente en unos segundos.";
  if (!error || typeof error !== "object") return generic;
  const apiError = error as ApiError;
  if (Array.isArray(apiError.details) && apiError.details.length) {
    const message = apiError.details
      .map((detail) => (typeof detail === "string" ? detail : detail.message))
      .filter(Boolean)
      .join("\n");
    if (message) return message;
  }
  if (typeof apiError.message === "string" && apiError.message.trim()) {
    return apiError.message.trim();
  }
  return generic;
}

function buildEmptySelection(): SelectedSlots {
  return DAY_OPTIONS.reduce<SelectedSlots>((acc, day) => {
    acc[day.value] = new Set<string>();
    return acc;
  }, {} as SelectedSlots);
}

export function EnvironmentSchedulesDialog({
  open,
  environment,
  onClose,
  onSuccess,
}: EnvironmentSchedulesDialogProps) {
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [periodMinutes, setPeriodMinutes] = useState<number>(45);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>(() =>
    buildEmptySelection()
  );
  const [lastSelection, setLastSelection] = useState<LastSelection>(null);

  useEffect(() => {
    if (!open) {
      setStartTime("");
      setEndTime("");
      setPeriodMinutes(45);
      setSlots([]);
      setSelectedSlots(buildEmptySelection());
      setLastSelection(null);
    }
  }, [open]);

  function clearSelections() {
    setSelectedSlots(buildEmptySelection());
    setLastSelection(null);
  }

  function selectAll() {
    if (!slots.length) return;
    const filled = DAY_OPTIONS.reduce<SelectedSlots>((acc, day) => {
      acc[day.value] = new Set(slots);
      return acc;
    }, {} as SelectedSlots);
    setSelectedSlots(filled);
    setLastSelection(null);
  }

  function handleCellClick(
    day: number,
    slot: string,
    event?: MouseEvent<HTMLButtonElement | HTMLDivElement>
  ) {
    const useRange = Boolean(
      event?.shiftKey && lastSelection && lastSelection.day === day
    );
    setSelectedSlots((current) => {
      const next: SelectedSlots = { ...current };
      const currentSet = new Set(next[day]);

      if (useRange && lastSelection) {
        const ordered = [...slots].sort((a, b) => toMinutes(a) - toMinutes(b));
        const startIndex = ordered.indexOf(lastSelection.slot);
        const endIndex = ordered.indexOf(slot);

        if (startIndex !== -1 && endIndex !== -1) {
          const low = Math.min(startIndex, endIndex);
          const high = Math.max(startIndex, endIndex);
          const desiredSelected = !currentSet.has(slot);

          for (let i = low; i <= high; i++) {
            if (desiredSelected) {
              currentSet.add(ordered[i]);
            } else {
              currentSet.delete(ordered[i]);
            }
          }
        }
      } else {
        if (currentSet.has(slot)) {
          currentSet.delete(slot);
        } else {
          currentSet.add(slot);
        }
      }

      next[day] = currentSet;
      return next;
    });

    setLastSelection({ day, slot });
  }

  function slotsToRanges(
    day: number
  ): Array<{ dia: number; hora_inicio: string; hora_fin: string }> {
    const times = Array.from(selectedSlots[day] ?? []).sort(
      (a, b) => toMinutes(a) - toMinutes(b)
    );
    const ranges: Array<{
      dia: number;
      hora_inicio: string;
      hora_fin: string;
    }> = [];
    if (!times.length) return ranges;

    let rangeStart = times[0];
    let previous = times[0];

    for (let i = 1; i < times.length; i++) {
      const current = times[i];
      const isContiguous =
        toMinutes(current) - toMinutes(previous) === periodMinutes;

      if (!isContiguous) {
        const end = toTimeString(toMinutes(previous) + periodMinutes);
        ranges.push({ dia: day, hora_inicio: rangeStart, hora_fin: end });
        rangeStart = current;
      }
      previous = current;
    }

    const finalEnd = toTimeString(toMinutes(previous) + periodMinutes);
    ranges.push({ dia: day, hora_inicio: rangeStart, hora_fin: finalEnd });

    return ranges;
  }

  function handleGenerate() {
    if (!startTime || !endTime) {
      notify.info({
        title: "Define hora de inicio y fin",
        description: "Completa ambos campos para generar la grilla.",
      });
      return;
    }

    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      notify.error({
        title: "Formato de hora invalido",
        description: "Usa el formato HH:mm (ej. 06:45).",
      });
      return;
    }

    if (periodMinutes <= 0) {
      notify.error({
        title: "Periodo invalido",
        description: "El periodo debe ser mayor que cero.",
      });
      return;
    }

    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    if (start >= end) {
      notify.error({
        title: "Rango de horas invalido",
        description: "La hora inicio debe ser menor que la hora fin.",
      });
      return;
    }

    if (end - start < periodMinutes) {
      notify.info({
        title: "Rango demasiado corto",
        description: "Ajusta el periodo o amplia el rango de horas.",
      });
      return;
    }

    const totalSlots = buildSlots(startTime, endTime, periodMinutes);

    if (!totalSlots.length) {
      notify.info({
        title: "Sin franjas generadas",
        description: "Ajusta el rango o el periodo para ver la grilla.",
      });
      return;
    }

    setSlots(totalSlots);
    setSelectedSlots(buildEmptySelection());
    setLastSelection(null);
  }

  async function handleSave() {
    if (!environment) {
      notify.info({
        title: "Selecciona un ambiente",
        description:
          "El ambiente debe existir y estar activo para asignar horarios.",
      });
      onClose();
      return;
    }

    if (environment.activo === false) {
      notify.info({
        title: "Ambiente inactivo",
        description: "Solo puedes asignar horarios a ambientes activos.",
      });
      return;
    }

    if (
      !startTime ||
      !endTime ||
      !timeRegex.test(startTime) ||
      !timeRegex.test(endTime)
    ) {
      notify.info({
        title: "Define hora de apertura y cierre",
        description:
          "Completa las horas con el formato HH:mm antes de guardar los horarios.",
      });
      return;
    }

    if (periodMinutes <= 0) {
      notify.info({
        title: "Periodo invalido",
        description: "Define un periodo en minutos mayor que cero.",
      });
      return;
    }

    if (!slots.length) {
      notify.info({
        title: "Genera la grilla primero",
        description: "Ingresa las horas y el periodo para crear las celdas.",
      });
      return;
    }

    const franjas = DAY_OPTIONS.flatMap((day) => slotsToRanges(day.value));

    if (!franjas.length) {
      notify.info({
        title: "Selecciona al menos una franja",
        description: "Haz clic en una o varias celdas para asignar horarios.",
      });
      return;
    }

    try {
      await apiFetch(`/ambientes/${environment.id}/horarios`, {
        method: "PUT",
        json: {
          hora_apertura: startTime,
          hora_cierre: endTime,
          periodo: periodMinutes,
          franjas,
        },
      });

      notify.success({
        title: "Horarios guardados",
        description: `Se asignaron ${franjas.length} franjas al ambiente.`,
      });

      onSuccess();
    } catch (error) {
      notify.error({
        title: "No pudimos guardar los horarios",
        description: resolveApiError(error),
      });
    }
  }

  const environmentLabel = formatEnvironmentLabel(environment);

  const displaySlots = useMemo(() => {
    if (!slots.length) return [] as Array<{ value: string; isEnd: boolean }>;

    const rows: Array<{ value: string; isEnd: boolean }> = slots.map(
      (slot) => ({
        value: slot,
        isEnd: false,
      })
    );

    const lastStart = slots[slots.length - 1];
    const endRow = endTime && timeRegex.test(endTime) ? endTime : null;

    if (endRow && lastStart !== endRow) {
      rows.push({ value: endRow, isEnd: true });
    }

    return rows;
  }, [endTime, slots]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      {/* diálogo fijo a 90vh, footer siempre visible */}
      <DialogContent className="h-[90vh] w-full max-w-[95vw] sm:max-w-[1200px] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Clock3 className="h-4 w-4" aria-hidden />
            Asignar horarios
          </DialogTitle>
          <DialogDescription>
            Define hora de inicio, fin y periodo para generar la grilla y
            selecciona franjas con un clic. Usa Shift + clic para seleccionar
            rangos continuos en el mismo dia.
          </DialogDescription>
        </DialogHeader>

        {/* cuerpo con grilla y formulario */}
        <div className="mt-4 flex-1 min-h-0">
          <div className="grid h-full gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            {/* Columna izquierda */}
            <div className="space-y-3 overflow-y-auto pr-2">
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-semibold">Ambiente seleccionado</p>
                <p className="text-muted-foreground">
                  {environmentLabel || "Sin seleccionar"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="schedule-start">Hora inicio</Label>
                  <Input
                    id="schedule-start"
                    type="time"
                    step="900"
                    placeholder="06:45"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="schedule-end">Hora fin</Label>
                  <Input
                    id="schedule-end"
                    type="time"
                    step="900"
                    placeholder="21:45"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </div>

                {/* Periodo + botón Generar grilla */}
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="schedule-period">Periodo (min)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="schedule-period"
                      type="number"
                      min={1}
                      max={240}
                      step={5}
                      placeholder="45"
                      value={periodMinutes}
                      onChange={(event) =>
                        setPeriodMinutes(Number(event.target.value))
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleGenerate}
                      className="whitespace-nowrap"
                    >
                      Generar grilla
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Separator orientation="vertical" className="h-6" />
                  <span>
                    Completa los campos y presiona &quot;Generar grilla&quot;
                    para ver las celdas.
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelections}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Limpiar seleccion
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={selectAll}
                    disabled={!slots.length}
                  >
                    Seleccionar todo
                  </Button>
                </div>
              </div>
            </div>

            {/* Columna derecha: grilla */}
            <div className="space-y-3 h-full overflow-hidden">
              <div className="h-full rounded-md border bg-card overflow-auto">
                {displaySlots.length ? (
                  <table className="w-full min-w-[700px] border-collapse text-[11px]">
                    <thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-16 px-2 py-1 text-left">Hora</th>
                        {DAY_OPTIONS.map((day) => (
                          <th key={day.value} className="px-2 py-1 text-center">
                            {day.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displaySlots.map((row) => (
                        <tr key={row.value} className="border-t">
                          <th className="px-2 py-1 text-left font-medium">
                            {row.value}
                          </th>
                          {DAY_OPTIONS.map((day) => {
                            const isSelected = selectedSlots[day.value]?.has(
                              row.value
                            );

                            if (row.isEnd) {
                              return (
                                <td
                                  key={`${row.value}-${day.value}`}
                                  className="px-1 py-1 text-center text-muted-foreground"
                                >
                                  -
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`${row.value}-${day.value}`}
                                className="px-1 py-1 text-center"
                              >
                                <button
                                  type="button"
                                  aria-label={`${day.label} ${row.value}`}
                                  aria-pressed={isSelected}
                                  onClick={(event) =>
                                    handleCellClick(day.value, row.value, event)
                                  }
                                  className={`h-6 w-full rounded border text-[10px] leading-none transition ${
                                    isSelected
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-muted bg-muted/30 text-foreground hover:border-emerald-400 hover:bg-emerald-50"
                                  }`}
                                >
                                  <span className="sr-only">{`${day.label} ${row.value}`}</span>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-xs text-muted-foreground">
                    Ingresa hora inicio, hora fin y periodo para generar la
                    grilla de horarios.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Guardar horarios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
