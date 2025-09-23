"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  campusCreateSchema,
  type CampusCreateInput,
} from "@/features/campus/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import Link from "next/link";

const INITIAL_POS = { lat: -17.3939, lng: -66.1570}

const MapPicker = dynamic(() => import("@/features/campus/MapPicker"), {
  ssr: false,
});

export default function CampusCreatePage() {
  const form = useForm<CampusCreateInput>({
    resolver: zodResolver(campusCreateSchema),
    mode: "onTouched",
    defaultValues: {
      nombre: "",
      direccion: "",
      lat: INITIAL_POS.lat,
      lng: INITIAL_POS.lng,
    },
  });

  const [submitting, setSubmitting] = useState(false);

  async function onSumbit(values: CampusCreateInput) {
    try {
      setSubmitting(true);

      await apiFetch("/campus", {
        method: "POST",
        json: values,
      });

      toast.success("campus creado", {
        description: "Se registor correctamente.",
      });

      form.reset({
        nombre: "",
        direccion: "",
        lat: -17.3939,
        lng: -66.157,
      });
    } catch (err: any) {
      const details = Array.isArray(err?.details) ? err.details : undefined;
      toast.error("Error al crear el campus", {
        description:
          details?.join("\n") ?? err?.message ?? "Error desconocido.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function onCancel() {
    form.reset({
        nombre: '',
        direccion: '',
        lat: INITIAL_POS.lat,
        lng: INITIAL_POS.lng,
    }, { keepErrors: false, keepDirty: false, keepTouched: false});
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-3xl font-semibold text-center">Registrar campus</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSumbit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del campus</FormLabel>
                    <FormControl>
                      <Input placeholder="Campus central" {...field} />
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
                    <FormLabel>Dirección del campus</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Av Sucre entre Belzu y Oquendo"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Coordenadas (opcional, se actualiza con el mapa)
                </summary>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="lat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitud</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lng"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitud</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </details>
              <div className="flex justify-end gap-3 m-4">
                <Button className='mr-8' variant="outline" type="button" onClick={onCancel} asChild>
                  <Link href="/dashboard/campus/new">Cancelar</Link>
                </Button>
                <Button className='mr-8' type="submit" disabled={submitting}>
                  {submitting ? "Guardando…" : "Registrar"}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="rounded-xl border bg-muted/30 p-2">
          <div className="h-full overflow-hidden rounded-lg">
            <MapPicker
              lat={form.watch("lat")}
              lng={form.watch("lng")}
              onChange={(pos) => {
                form.setValue("lat", pos.lat, { shouldValidate: true });
                form.setValue("lng", pos.lng, { shouldValidate: true });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
