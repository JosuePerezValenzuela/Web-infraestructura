"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  environmentTypeCreateSchema,
  type EnvironmentTypeCreateInput,
  type EnvironmentTypeCreateOutput,
} from "./schema";
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
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { apiFetch } from "@/lib/api";

type EnvironmentTypeFormProps = {
  onSuccess?: () => Promise<void> | void;
  onClose?: () => void;
};

export default function EnvironmentTypeForm({
  onSuccess,
  onClose,
}: EnvironmentTypeFormProps) {
  // Configuramos el formulario con sus reglas de validacion para que cualquier persona pueda completarlo guiada por mensajes claros.
  const form = useForm<EnvironmentTypeCreateInput>({
    resolver: zodResolver(environmentTypeCreateSchema),
    mode: "onTouched",
    defaultValues: {
      nombre: "",
      descripcion: "",
      descripcion_corta: "",
    },
  });

  // Seguimos el estado de envio para deshabilitar los controles mientras esperamos respuesta del backend.
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: EnvironmentTypeCreateInput) {
    // Convertimos los datos del formulario en el formato exacto que exige la API, limpiando espacios y removiendo campos vacios.
    const payload: EnvironmentTypeCreateOutput = environmentTypeCreateSchema.parse(values);

    try {
      // Marcamos que el proceso de guardado comenzo para evitar dobles envios involuntarios.
      setSubmitting(true);

      // Enviamos la informacion al backend siguiendo el contrato POST /tipo_ambientes.
      await apiFetch("/tipo_ambientes", {
        method: "POST",
        json: payload,
      });

      // Informamos a la persona usuaria que el registro se creo correctamente.
      notify.success({
        title: "Tipo de ambiente creado",
        description: "El catalogo se actualizo correctamente.",
      });

      // Reiniciamos el formulario para dejarlo listo ante una nueva alta consecutiva.
      form.reset({
        nombre: "",
        descripcion: "",
        descripcion_corta: "",
      });

      // Solicitamos recargar la tabla para reflejar el nuevo elemento.
      if (onSuccess) {
        await onSuccess();
      }

      // Cerramos el modal si quien usa el formulario asi lo necesita.
      onClose?.();
    } catch (error) {
      // Ante un fallo mostramos un mensaje que explique como continuar.
      notify.error({
        title: "No se pudo crear el tipo de ambiente",
        description: "Revisa los datos e intentalo nuevamente.",
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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}
