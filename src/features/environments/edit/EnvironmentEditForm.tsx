"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notify } from "@/lib/notify";
import { apiFetch } from "@/lib/api";
import {
  environmentUpdateSchema,
  type EnvironmentUpdateInput,
  type EnvironmentUpdateOutput,
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

type EnvironmentEditFormProps = {
  environmentId: number;
  defaultValues: EnvironmentUpdateInput;
  blocks: CatalogOption[];
  environmentTypes: CatalogOption[];
  onSuccess?: () => void;
};

export function EnvironmentEditForm({
  environmentId,
  defaultValues,
  blocks,
  environmentTypes,
  onSuccess,
}: EnvironmentEditFormProps) {
  // Estado para bloquear el formulario mientras enviamos la informacion.
  const [submitting, setSubmitting] = useState(false);
  // Configuramos React Hook Form con el esquema de Zod para validar cada entrada.
  const form = useForm<EnvironmentUpdateInput>({
    resolver: zodResolver(environmentUpdateSchema),
    mode: "onTouched",
    defaultValues,
  });

  // Cada vez que recibimos nuevos valores base (por ejemplo al seleccionar otro ambiente) actualizamos el formulario.
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  // Este manejador se ejecuta cuando la persona hace clic en "Guardar cambios".
  async function handleSubmit(values: EnvironmentUpdateInput) {
    // Convertimos y validamos los datos antes de llamar al backend para garantizar consistencia.
    const payload = values as EnvironmentUpdateOutput;

    try {
      // Indicamos que estamos enviando la informacion para deshabilitar campos y evitar envios duplicados.
      setSubmitting(true);
      // Consumimos el endpoint PATCH usando el cliente HTTP centralizado para mantener seguridad y trazabilidad.
      await apiFetch(`/ambientes/${environmentId}`, {
        method: "PATCH",
        json: payload,
      });
      // Mostramos un mensaje positivo para confirmar que los datos se guardaron correctamente.
      notify.success({
        title: "Ambiente actualizado",
        description: "Se guardaron los cambios correctamente.",
      });
      // Avisamos al componente padre que puede refrescar la tabla o cerrar el modal.
      onSuccess?.();
    } catch (error) {
      // Cuando existe un fallo extraemos un mensaje amigable que explique el motivo.
      const description =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? ((error as { message?: unknown }).message as string)
          : "No pudimos actualizar el ambiente. Intentalo de nuevo.";
      // Informamos del error mediante una notificacion visible.
      notify.error({
        title: "No se pudo actualizar el ambiente",
        description,
      });
    } finally {
      // Siempre habilitamos nuevamente el formulario sin importar el resultado.
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
                <FormLabel htmlFor="env-edit-codigo">Codigo</FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-codigo"
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
                <FormLabel htmlFor="env-edit-nombre">Nombre</FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-nombre"
                    maxLength={64}
                    placeholder="Ej. Laboratorio A"
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
            name="nombre_corto"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="env-edit-nombre-corto">
                  Nombre corto
                </FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-nombre-corto"
                    maxLength={16}
                    placeholder="Ej. Lab A"
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
                <FormLabel htmlFor="env-edit-piso">Piso</FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-piso"
                    type="number"
                    min={-5}
                    max={80}
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
                <FormLabel id="env-edit-bloque-label">Bloque</FormLabel>
                <CatalogSearchSelect
                  buttonId="env-edit-bloque"
                  labelId="env-edit-bloque-label"
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
                <FormLabel id="env-edit-tipo-label">
                  Tipo de ambiente
                </FormLabel>
                <CatalogSearchSelect
                  buttonId="env-edit-tipo"
                  labelId="env-edit-tipo-label"
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
                <FormLabel htmlFor="env-edit-cap-total">
                  Capacidad total
                </FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-cap-total"
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
                <FormLabel htmlFor="env-edit-cap-examen">
                  Capacidad examen
                </FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-cap-examen"
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
                <FormLabel htmlFor="env-edit-largo">Largo</FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-largo"
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
                <FormLabel htmlFor="env-edit-ancho">Ancho</FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-ancho"
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
                <FormLabel htmlFor="env-edit-alto">Alto</FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-alto"
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
                <FormLabel htmlFor="env-edit-unidad">
                  Unidad de medida
                </FormLabel>
                <FormControl>
                  <Input
                    id="env-edit-unidad"
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
                    id="env-edit-clases"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel htmlFor="env-edit-clases">Dicta clases</FormLabel>
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
                    id="env-edit-activo"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel htmlFor="env-edit-activo">Activo</FormLabel>
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
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
