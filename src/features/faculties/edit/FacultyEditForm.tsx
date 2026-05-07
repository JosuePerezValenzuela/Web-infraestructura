"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/notify";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectChecklist } from "@/components/ui/multi-select-checklist";
import { apiFetch } from "@/lib/api";
import {
  facultyUpdateSchema,
  type FacultyUpdateInput,
} from "@/features/faculties/schema";
import type { FacultyRow } from "@/features/faculties/list/columns";

type FacultyUpdateIn = z.input<typeof facultyUpdateSchema>;

type CampusOption = {
  id: number;
  nombre: string;
  codigo: string;
};

type CampusListResponse = {
  items: CampusOption[];
};

type Props = {
  faculty: FacultyRow;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
};

export default function FacultyEditForm({
  faculty,
  onSubmitSuccess,
  onCancel,
}: Props) {
  const form = useForm<FacultyUpdateIn>({
    resolver: zodResolver(facultyUpdateSchema),
    mode: "onTouched",
    defaultValues: {
      codigo: faculty.codigo,
      nombre: faculty.nombre,
      nombre_corto: faculty.nombre_corto ?? "",
      campus_ids: faculty.campus_ids,
      activo: faculty.activo,
    },
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const campusSelectOptions = useMemo(
    () =>
      campusOptions.map((option) => ({
        value: String(option.id),
        label: option.nombre,
        description: option.codigo,
      })),
    [campusOptions]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadCampus() {
      try {
        const data = await apiFetch<CampusListResponse>(
          "/campus?page=1&limit=1000&activo=true",
          { signal: controller.signal }
        );

        setCampusOptions(data.items);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        notify.error({
          title: "No se pudieron cargar los campus",
          description: "Inténtalo nuevamente en unos minutos.",
        });
      }
    }

    void loadCampus();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    form.reset({
      codigo: faculty.codigo,
      nombre: faculty.nombre,
      nombre_corto: faculty.nombre_corto ?? "",
      campus_ids: faculty.campus_ids,
      activo: faculty.activo,
    });
  }, [faculty, form]);

  const handleSubmit = useCallback(
    async (values: FacultyUpdateIn) => {
      const payload: FacultyUpdateInput = facultyUpdateSchema.parse(values);

      try {
        setSubmitting(true);

        await apiFetch(`/facultades/${faculty.id}`, {
          method: "PATCH",
          json: payload,
        });

        notify.success({
          title: "Facultad actualizada",
          description: "Se guardaron los cambios correctamente.",
        });

        form.reset(payload);
        await onSubmitSuccess?.();
      } catch (error) {
        const err = error as {
          message?: string;
          details?: string[];
        };
        notify.error({
          title: "No se pudo actualizar la facultad",
          description: err?.details?.join("\n") ?? err?.message ?? "Error desconocido.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [faculty.id, form, onSubmitSuccess]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-3">
          <section className="space-y-3 rounded-lg border bg-card p-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Datos generales</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="codigo-facultad-edit">Codigo de la facultad</FormLabel>
                    <FormControl>
                      <Input
                        id="codigo-facultad-edit"
                        placeholder="FAC-001"
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nombre_corto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="nombre-corto-edit">Nombre corto (opcional)</FormLabel>
                    <FormControl>
                      <Input id="nombre-corto-edit" placeholder="FI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="nombre-facultad-edit">Nombre de la facultad</FormLabel>
                  <FormControl>
                    <Input
                      id="nombre-facultad-edit"
                      placeholder="Facultad de Ingenieria"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="rounded-md border border-border/60 p-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <FormControl>
                      <Checkbox
                        id="activo-facultad"
                        checked={field.value}
                        onCheckedChange={(value) => field.onChange(value === true)}
                      />
                    </FormControl>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <FormLabel htmlFor="activo-facultad" className="cursor-pointer text-base">
                        Facultad activa
                      </FormLabel>
                      <span className="text-muted-foreground">
                        Desmarca para deshabilitar la facultad y sus dependencias.
                      </span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card p-2">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Campus asignados</h2>
            </div>

            <FormField
              control={form.control}
              name="campus_ids"
              render={({ field }) => (
                <FormItem className="mt-4 flex min-h-0 flex-1 flex-col">
                  <FormControl>
                    <MultiSelectChecklist
                      id="campus-ids-edit"
                      label=""
                      options={campusSelectOptions}
                      selectedValues={(field.value ?? []).map((value) => String(value))}
                      onChange={(nextValues) => {
                        field.onChange(nextValues.map((value) => Number(value)));
                      }}
                      placeholder="Esta facultad todavía no tiene campus asignados."
                      searchPlaceholder="Buscar campus por nombre o código"
                      emptyLabel="No se encontraron campus con ese criterio."
                      className="min-h-0 flex-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
        </div>

        <div className="sticky bottom-0 border-t bg-background px-4 py-2">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
