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
  blockTypeUpdateSchema,
  type BlockTypeUpdateInput,
} from "../schema";
import type { BlockTypeRow } from "../list/columns";

type BlockTypeEditFormProps = {
  blockType: BlockTypeRow;
  onSubmitSuccess?: () => void | Promise<void>;
};

export default function BlockTypeEditForm({
  blockType,
  onSubmitSuccess,
}: BlockTypeEditFormProps) {
  // Configuramos el formulario declarando los campos, la validacion con Zod y los valores iniciales que vienen del registro seleccionado.
  const form = useForm<BlockTypeUpdateInput>({
    resolver: zodResolver(blockTypeUpdateSchema),
    mode: "onTouched",
    defaultValues: {
      nombre: blockType.nombre,
      descripcion: blockType.descripcion,
      activo: blockType.activo,
    },
  });

  // Registramos si se esta enviando informacion para deshabilitar los controles y evitar envios repetidos.
  const [submitting, setSubmitting] = useState(false);

  // Cada vez que la fila seleccionada cambie, sincronizamos nuevamente los valores del formulario.
  useEffect(() => {
    form.reset({
      nombre: blockType.nombre,
      descripcion: blockType.descripcion,
      activo: blockType.activo,
    });
  }, [blockType, form]);

  async function handleSubmit(values: BlockTypeUpdateInput) {
    // Validamos los datos recibidos para asegurarnos de que cumplen todas las reglas antes de llamar al backend.
    const payload = blockTypeUpdateSchema.parse(values);
    try {
      // Indicamos que la peticion comenzo para mostrar feedback inmediato.
      setSubmitting(true);

      // Enviamos la solicitud PATCH al API utilizando la funcion compartida que aplica encabezados y control de errores.
      await apiFetch(`/tipo_bloques/${blockType.id}`, {
        method: "PATCH",
        json: payload,
      });

      // Mostramos un mensaje que confirme el exito de la operacion.
      toast.success("Tipo de bloque actualizado", {
        description: "Se guardaron los cambios correctamente.",
      });

      // Actualizamos el formulario con los valores aceptados por el servidor.
      form.reset(payload);

      // Avisamos al componente padre para que refresque el listado o cierre el dialogo.
      await onSubmitSuccess?.();
    } catch (error) {
      // Traducimos el error recibido en un mensaje claro para las personas usuarias.
      const description =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message?: unknown }).message)
          : "Error desconocido.";

      // Informamos la situacion mediante un toast de error.
      toast.error("No se pudo actualizar el tipo de bloque", {
        description,
      });
    } finally {
      // Liberamos el estado de envio para que el formulario vuelva a estar disponible.
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
                <Input
                  placeholder="Ej. Laboratorio"
                  {...field}
                />
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
                  rows={3}
                  placeholder="Describe el uso del tipo de bloque."
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
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormLabel className="m-0">Estado:</FormLabel>
              <FormControl>
                <Checkbox
                  id="block-type-active"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <FormLabel
                htmlFor="block-type-active"
                className="cursor-pointer"
              >
                Activo
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
