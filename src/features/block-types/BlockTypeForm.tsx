"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blockTypeCreateSchema, type BlockTypeCreateInput } from "./schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { apiFetch } from "@/lib/api";

type BlockTypeFormProps = {
  onSuccess?: () => Promise<void> | void;
  onClose?: () => void;
};

export default function BlockTypeForm({ onSuccess, onClose }: BlockTypeFormProps) {
  // Creamos el formulario declarando qué campos tendrá y cómo se validarán antes de enviar.
  const form = useForm<BlockTypeCreateInput>({
    // Conectamos la validación de Zod para explicar con mensajes claros cualquier error.
    resolver: zodResolver(blockTypeCreateSchema),
    // Elegimos validar cuando la persona usuaria interactúe con cada campo.
    mode: "onTouched",
    // Definimos los valores por defecto que se muestran al abrir el formulario.
    defaultValues: {
      nombre: "",
      descripcion: "",
    },
  });

  // Guardamos si estamos enviando el formulario para desactivar el botón mientras esperamos respuesta.
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: BlockTypeCreateInput) {
    // Validamos nuevamente los datos para asegurarnos de que cumplen el contrato de la API.
    const payload = blockTypeCreateSchema.parse(values);
    try {
      // Indicamos que comenzó el envío para evitar doble clic accidental.
      setSubmitting(true);
      // Llamamos al backend usando la función compartida de fetch para respetar el mismo manejo de errores.
      await apiFetch("/tipo_bloques", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      // Mostramos un mensaje de éxito que confirme la creación del registro.
      notify.success({
        title: "Tipo de bloque creado",
        description: "El catalogo se actualizo correctamente.",
      });
      // Restablecemos el formulario para dejarlo listo para un nuevo registro.
      form.reset({
        nombre: "",
        descripcion: "",
      });
      // Avisamos a la página para que vuelva a obtener los datos y refleje el nuevo elemento.
      if (onSuccess) {
        await onSuccess();
      }
      // Cerramos el diálogo si la persona estaba usando uno.
      onClose?.();
    } catch (error: any) {
      // Si ocurre un problema informamos con un mensaje claro y acción sugerida.
      notify.error({
        title: "No se pudo crear el tipo de bloque",
        description: "Revisa los datos e intentalo nuevamente.",
      });
    } finally {
      // Quitamos el estado de envío para reactivar el formulario.
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
                <Input placeholder="Ej. Laboratorio" {...field} />
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
                  placeholder="Describe el uso del tipo de bloque."
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}
