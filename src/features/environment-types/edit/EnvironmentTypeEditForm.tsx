"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import {
  environmentTypeUpdateSchema,
  type EnvironmentTypeUpdateInput,
} from "../schema";
import type { EnvironmentTypeRow } from "../list/columns";

type EnvironmentTypeEditFormProps = {
  environmentType: EnvironmentTypeRow;
  onSubmitSuccess?: () => void | Promise<void>;
};

export default function EnvironmentTypeEditForm({
  environmentType,
  onSubmitSuccess,
}: EnvironmentTypeEditFormProps) {
  // Configuramos el formulario con los valores actuales del registro y las reglas de validacion alineadas a la HU 19.
  const form = useForm<EnvironmentTypeUpdateInput>({
    resolver: zodResolver(environmentTypeUpdateSchema),
    mode: "onTouched",
    defaultValues: {
      nombre: environmentType.nombre,
      descripcion: environmentType.descripcion,
      descripcion_corta: environmentType.descripcion_corta ?? "",
      activo: environmentType.activo,
    },
  });

  // Seguimos el estado de envio para deshabilitar los controles mientras esperamos la respuesta del backend.
  const [submitting, setSubmitting] = useState(false);

  // Cada vez que el registro seleccionado cambie sincronizamos los valores del formulario.
  useEffect(() => {
    form.reset({
      nombre: environmentType.nombre,
      descripcion: environmentType.descripcion,
      descripcion_corta: environmentType.descripcion_corta ?? "",
      activo: environmentType.activo,
    });
  }, [environmentType, form]);

  async function handleSubmit(values: EnvironmentTypeUpdateInput) {
    // Validamos los datos del formulario para asegurarnos de que cumplen el contrato antes de hablar con el backend.
    const payload = environmentTypeUpdateSchema.parse(values);

    try {
      // Indicamos que el guardado empezo para evitar envios duplicados.
      setSubmitting(true);

      // Enviamos los cambios al endpoint PATCH /tipo_ambientes/{id} usando el helper centralizado.
      await apiFetch(`/tipo_ambientes/${environmentType.id}`, {
        method: "PATCH",
        json: payload,
      });

      // Notificamos que la actualizacion fue exitosa.
      toast.success("Tipo de ambiente actualizado", {
        description: "Se guardaron los cambios correctamente.",
      });

      // Restablecemos el formulario con los valores aceptados por el backend.
      form.reset({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        descripcion_corta: payload.descripcion_corta ?? "",
        activo: payload.activo,
      });

      // Avisamos al componente padre para que refresque la tabla o cierre el dialogo.
      await onSubmitSuccess?.();
    } catch (error) {
      // Traducimos el error recibido en un mensaje claro para la persona usuaria.
      const description =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message?: unknown }).message)
          : "Error desconocido.";

      toast.error("No se pudo actualizar el tipo de ambiente", {
        description,
      });
    } finally {
      // Liberamos el estado de envio para reactivar los controles.
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Aula interactiva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripcion</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe el uso principal del tipo de ambiente."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descripcion_corta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripcion corta (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Alias breve para el catalogo"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
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
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormLabel className="m-0">Estado:</FormLabel>
              <FormControl>
                <Checkbox
                  id="environment-type-active"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <FormLabel
                htmlFor="environment-type-active"
                className="cursor-pointer"
              >
                Activo
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !form.formState.isDirty}
          >
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
