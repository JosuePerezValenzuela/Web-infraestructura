"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notify } from "@/lib/notify";
import { apiFetch } from "@/lib/api";
import {
  environmentCreateSchema,
  type EnvironmentCreateInput,
  type EnvironmentCreateOutput,
} from "../schema";
import {
  CatalogSearchSelect,
  type CatalogOption,
} from "@/components/catalog-search-select";
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
import { Button } from "@/components/ui/button";

type EnvironmentCreateFormProps = {
  blocks: CatalogOption[];
  environmentTypes: CatalogOption[];
  onSuccess?: () => Promise<void> | void;
  onClose?: () => void;
};

const defaultValues: EnvironmentCreateInput = {
  codigo: "",
  nombre: "",
  nombre_corto: "",
  piso: "",
  capacidad_total: "",
  capacidad_examen: "",
  dimension_largo: "",
  dimension_ancho: "",
  dimension_alto: "",
  dimension_unidad: "metros",
  clases: true,
  activo: true,
  tipo_ambiente_id: "",
  bloque_id: "",
};

export function EnvironmentCreateForm({
  blocks,
  environmentTypes,
  onSuccess,
  onClose,
}: EnvironmentCreateFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<EnvironmentCreateInput>({
    resolver: zodResolver(environmentCreateSchema),
    mode: "onTouched",
    defaultValues,
  });

  async function handleSubmit(values: EnvironmentCreateInput) {
    const payload = values as EnvironmentCreateOutput;

    try {
      setSubmitting(true);
      await apiFetch("/ambientes", {
        method: "POST",
        json: payload,
      });
      notify.success({
        title: "Ambiente registrado",
        description: "El inventario se actualizo correctamente.",
      });
      form.reset(defaultValues);
      await onSuccess?.();
      onClose?.();
    } catch (error) {
      const description =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Revisa los datos e intentalo nuevamente.";

      notify.error({
        title: "No se pudo registrar el ambiente",
        description,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        noValidate
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-codigo">Codigo</FormLabel>
                <FormControl>
                  <Input
                    id="env-codigo"
                    maxLength={16}
                    placeholder="Ej. AMB-101"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-nombre">Nombre</FormLabel>
                <FormControl>
                  <Input
                    id="env-nombre"
                    maxLength={64}
                    placeholder="Nombre oficial del ambiente"
                    {...field}
                    value={field.value ?? ""}
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
                <FormLabel htmlFor="env-nombre-corto">
                  Nombre corto (opcional)
                </FormLabel>
                <FormControl>
                  <Input
                    id="env-nombre-corto"
                    maxLength={16}
                    placeholder="Alias corto"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="piso"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-piso">Piso</FormLabel>
                <FormControl>
                  <Input
                    id="env-piso"
                    type="number"
                    placeholder="Ej. 2"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="bloque_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel id="env-bloque-label">Bloque</FormLabel>
                <CatalogSearchSelect
                  buttonId="env-bloque"
                  labelId="env-bloque-label"
                  placeholder="Selecciona un bloque"
                  searchPlaceholder="Buscar bloque"
                  options={blocks}
                  value={field.value ? String(field.value) : ""}
                  onChange={(value) => field.onChange(value)}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo_ambiente_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel id="env-tipo-label">Tipo de ambiente</FormLabel>
                <CatalogSearchSelect
                  buttonId="env-tipo"
                  labelId="env-tipo-label"
                  placeholder="Selecciona un tipo"
                  searchPlaceholder="Buscar tipo de ambiente"
                  options={environmentTypes}
                  value={field.value ? String(field.value) : ""}
                  onChange={(value) => field.onChange(value)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="capacidad_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-cap-total">Capacidad total</FormLabel>
                <FormControl>
                  <Input
                    id="env-cap-total"
                    type="number"
                    min={0}
                    placeholder="Ej. 60"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacidad_examen"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-cap-examen">
                  Capacidad examen
                </FormLabel>
                <FormControl>
                  <Input
                    id="env-cap-examen"
                    type="number"
                    min={0}
                    placeholder="Ej. 30"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <FormField
            control={form.control}
            name="dimension_largo"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-largo">Largo</FormLabel>
                <FormControl>
                  <Input
                    id="env-largo"
                    type="number"
                    step="0.1"
                    placeholder="Ej. 12"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dimension_ancho"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-ancho">Ancho</FormLabel>
                <FormControl>
                  <Input
                    id="env-ancho"
                    type="number"
                    step="0.1"
                    placeholder="Ej. 8"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dimension_alto"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-alto">Alto</FormLabel>
                <FormControl>
                  <Input
                    id="env-alto"
                    type="number"
                    step="0.1"
                    placeholder="Ej. 3"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dimension_unidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-unidad">Unidad de medida</FormLabel>
                <FormControl>
                  <Input
                    id="env-unidad"
                    placeholder="Ej. metros"
                    maxLength={16}
                    readOnly
                    aria-readonly="true"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="clases"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    id="env-clases"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel htmlFor="env-clases">Dicta clases</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Activa esta opcion si el ambiente se usa para clases
                    regulares.
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    id="env-activo"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel htmlFor="env-activo">Activo</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Desmarca si el ambiente no estara disponible por ahora.
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="px-6">
            {submitting ? "Registrando..." : "Registrar ambiente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
