'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import {
  campusUpdateSchema,
  type CampusUpdateInput,
} from '@/features/campus/schema';
import type { CampusRow } from '@/features/campus/list/columns';

const MapPicker = dynamic(() => import('@/features/campus/MapPicker'), {
  ssr: false,
});

const SUBMIT_LABEL = 'Guardar cambios';

type CampusUpdateIn = z.input<typeof campusUpdateSchema>;
type CampusUpdateOut = CampusUpdateInput;

type Props = {
  campus: CampusRow;
  onSubmitSuccess?: () => void;
};

export default function CampusEditForm({ campus, onSubmitSuccess }: Props) {
  // Creamos el formulario RHF con la validacion de Zod y valores pre cargados del campus recibido.
  const form = useForm<CampusUpdateIn>({
    resolver: zodResolver(campusUpdateSchema),
    mode: 'onTouched',
    defaultValues: {
      codigo: campus.codigo,
      nombre: campus.nombre,
      direccion: campus.direccion,
      lat: campus.lat,
      lng: campus.lng,
      activo: campus.activo,
    },
  });

  // Guardamos si el formulario esta enviando informacion para bloquear entradas repetidas.
  const [submitting, setSubmitting] = useState(false);

  // Cuando el campus cambie (por ejemplo el usuario selecciona otro) reseteamos el formulario con los nuevos datos.
  useEffect(() => {
    form.reset({
      codigo: campus.codigo,
      nombre: campus.nombre,
      direccion: campus.direccion,
      lat: campus.lat,
      lng: campus.lng,
      activo: campus.activo,
    });
  }, [campus, form]);

  async function onSubmit(values: CampusUpdateIn) {
    // Convertimos los valores del formulario usando Zod para garantizar los tipos correctos.
    const payload: CampusUpdateOut = campusUpdateSchema.parse(values);
    try {
      // Indicamos que se esta enviando para deshabilitar los controles.
      setSubmitting(true);

      // Realizamos la peticion al backend usando apiFetch para centralizar el acceso HTTP.
      await apiFetch(`/campus/${campus.id}`, {
        method: 'PATCH',
        json: payload,
      });

      // Mostramos una notificacion positiva al usuario indicando que todo salio bien.
      toast.success('Campus actualizado', {
        description: 'Se guardaron los cambios correctamente.',
      });

      // Actualizamos los valores del formulario con la informacion aceptada por el backend.
      form.reset(payload);

      // Avisamos al componente padre para que pueda refrescar datos o cerrar el modal.
      onSubmitSuccess?.();
    } catch (error) {
      // Extraemos un mensaje amigable cuando la peticion falla.
      const description =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : 'Error desconocido';

      // Informamos al usuario del problema mediante un toast.
      toast.error('No se pudo actualizar el campus', {
        description,
      });
    } finally {
      // Restablecemos el estado de envio para reactivar los controles.
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="codigo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codigo del campus</FormLabel>
              <FormControl>
                <Input
                  placeholder="123456789"
                  {...field}
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
              <FormLabel>Nombre del campus</FormLabel>
              <FormControl>
                <Input
                  placeholder="Campus Central"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direccion del campus</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Av Sucre entre Belzu y Oquendo"
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
              <FormLabel>Estado del campus:</FormLabel>
              <FormControl>
                <Checkbox
                  id="activo"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <FormLabel htmlFor="activo" className="cursor-pointer">
                Activo
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="h-64 rounded-md overflow-hidden">
          <MapPicker
            lat={Number(form.watch('lat'))}
            lng={Number(form.watch('lng'))}
            onChange={(coords) => {
              form.setValue('lat', coords.lat, { shouldValidate: true });
              form.setValue('lng', coords.lng, { shouldValidate: true });
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : SUBMIT_LABEL}
          </Button>
        </div>
      </form>
    </Form>
  );
}
