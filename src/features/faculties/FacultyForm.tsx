"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { facultyCreateSchema } from "@/features/faculties/schema";
import { apiFetch } from "@/lib/api";
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
import { notify } from "@/lib/notify";
import { MultiSelectChecklist } from "@/components/ui/multi-select-checklist";

type FacultyCreateFormValues = z.input<typeof facultyCreateSchema>;

type CampusOption = {
  id: number;
  nombre: string;
  codigo: string;
};

type CampusListResponse = {
  items: CampusOption[];
};

type Props = {
  submitLabel?: string;
  onSubmitSuccess?: () => Promise<void> | void;
  onCancel?: () => void;
};

export default function FacultyForm({
  submitLabel = "Crear facultad",
  onSubmitSuccess,
  onCancel,
}: Props) {
  const form = useForm<FacultyCreateFormValues>({
    resolver: zodResolver(facultyCreateSchema),
    mode: "onTouched",
    defaultValues: {
      codigo: "",
      nombre: "",
      nombre_corto: "",
      campus_ids: [],
    },
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

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
        console.error("Error al cargar el catalogo de campus", error);
        notify.error({
          title: "No se pudieron cargar los campus",
          description: "Inténtalo nuevamente en unos minutos.",
        });
      }
    }

    void loadCampus();

    return () => controller.abort();
  }, []);

  const handleSubmit = useCallback(
    async (values: FacultyCreateFormValues) => {
      const parsed = facultyCreateSchema.parse(values);
      try {
        setSubmitting(true);

        const payload = {
          codigo: parsed.codigo,
          nombre: parsed.nombre,
          nombre_corto: parsed.nombre_corto,
          campus_ids: parsed.campus_ids,
        };

        await apiFetch("/facultades", {
          method: "POST",
          json: payload,
        });

        notify.success({
          title: "Facultad creada",
          description: "Se registro correctamente la facultad.",
        });

        form.reset({
          codigo: "",
          nombre: "",
          nombre_corto: "",
          campus_ids: [],
        });

        await onSubmitSuccess?.();
      } catch (error: unknown) {
        const err = error as {
          message?: string;
          details?: string[];
        };
        notify.error({
          title: "No se pudo crear la facultad",
          description: err?.details?.join("\n") ?? err?.message ?? "Error desconocido.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSubmitSuccess]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
          <section className="space-y-4 rounded-lg border bg-card p-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Datos generales</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="codigo-facultad">Codigo de la facultad</FormLabel>
                    <FormControl>
                      <Input
                        id="codigo-facultad"
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
                    <FormLabel htmlFor="nombre-corto">Nombre corto (opcional)</FormLabel>
                    <FormControl>
                      <Input id="nombre-corto" placeholder="FCyT" {...field} />
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
                  <FormLabel htmlFor="nombre-facultad">Nombre de la facultad</FormLabel>
                  <FormControl>
                    <Input
                      id="nombre-facultad"
                      placeholder="Facultad de ciencias y tecnologia"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section
            className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card p-4"
            data-testid="faculty-campus-section"
          >
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
                      id="campus-ids"
                      label=""
                      options={campusSelectOptions}
                      selectedValues={(field.value ?? []).map((value) => String(value))}
                      onChange={(nextValues) => {
                        field.onChange(nextValues.map((value) => Number(value)));
                      }}
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

        <div className="sticky bottom-0 border-t bg-background px-6 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando" : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
