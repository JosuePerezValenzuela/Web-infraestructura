"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { apiFetch } from "@/lib/api";
import { blockCreateSchema, type BlockCreateInput } from "./schema";
import CatalogSearchSelect, {
  type CatalogOption,
} from "./components/CatalogSearchSelect";

type BlockCreateFormProps = {
  faculties: CatalogOption[];
  blockTypes: CatalogOption[];
};

const DEFAULT_POSITION = { lat: -17.3939, lng: -66.157 };
const MapPicker = dynamic(() => import("@/features/campus/MapPicker"), {
  ssr: false,
});

export function BlockCreateForm({ faculties, blockTypes }: BlockCreateFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<BlockCreateInput>({
    resolver: zodResolver(blockCreateSchema),
    mode: "onTouched",
    defaultValues: {
      codigo: "",
      nombre: "",
      nombre_corto: "",
      pisos: "",
      lat: "",
      lng: "",
      facultad_id: "",
      tipo_bloque_id: "",
      activo: true,
    },
  });

  const latValue = form.watch("lat");
  const lngValue = form.watch("lng");

  const mapLat =
    typeof latValue === "number"
      ? latValue
      : Number.parseFloat(latValue || "") || DEFAULT_POSITION.lat;
  const mapLng =
    typeof lngValue === "number"
      ? lngValue
      : Number.parseFloat(lngValue || "") || DEFAULT_POSITION.lng;

  async function handleSubmit(values: BlockCreateInput) {
    const payload = blockCreateSchema.parse(values);

    try {
      setSubmitting(true);
      await apiFetch("/bloques", {
        method: "POST",
        json: payload,
      });

      notify.success({
        title: "Bloque creado",
        description: "El inventario se actualizó correctamente.",
      });
      router.push("/dashboard/bloques/list");
    } catch {
      notify.error({
        title: "No se pudo crear el bloque",
        description: "Revisa los datos e intentalo nuevamente.",
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
                <FormLabel htmlFor="codigo-input">Codigo</FormLabel>
                <FormControl>
                  <Input
                    id="codigo-input"
                    placeholder="Ej. BLO-101"
                    maxLength={16}
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
                <FormLabel htmlFor="nombre-input">Nombre</FormLabel>
                <FormControl>
                  <Input
                    id="nombre-input"
                    placeholder="Nombre completo del bloque"
                    maxLength={128}
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
                <FormLabel htmlFor="nombre-corto-input">Nombre corto</FormLabel>
                <FormControl>
                  <Input
                    id="nombre-corto-input"
                    placeholder="Ej. Bloque Norte"
                    maxLength={16}
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
            name="pisos"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="pisos-input">Pisos</FormLabel>
                <FormControl>
                  <Input
                    id="pisos-input"
                    type="number"
                    min={1}
                    max={99}
                    placeholder="Cantidad de pisos"
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
            name="facultad_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel id="facultad-label">Facultad</FormLabel>
                <CatalogSearchSelect
                  buttonId="facultad-select"
                  labelId="facultad-label"
                  placeholder="Selecciona una facultad"
                  searchPlaceholder="Buscar facultad"
                  options={faculties}
                  value={field.value ? String(field.value) : ""}
                  onChange={(value) => field.onChange(value)}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo_bloque_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel id="tipo-bloque-label">Tipo de bloque</FormLabel>
                <CatalogSearchSelect
                  buttonId="tipo-bloque-select"
                  labelId="tipo-bloque-label"
                  placeholder="Selecciona un tipo de bloque"
                  searchPlaceholder="Buscar tipo"
                  options={blockTypes}
                  value={field.value ? String(field.value) : ""}
                  onChange={(value) => field.onChange(value)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-md border bg-muted/20 p-1">
          <div className="h-64 overflow-hidden rounded-md">
            <MapPicker
              lat={mapLat}
              lng={mapLng}
              onChange={(position) => {
                form.setValue("lat", String(position.lat), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                form.setValue("lng", String(position.lng), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </div>
          {form.formState.errors.lat?.message ||
          form.formState.errors.lng?.message ? (
            <p className="mt-1 text-sm text-destructive">
              {form.formState.errors.lat?.message ??
                form.formState.errors.lng?.message}
            </p>
          ) : null}
          <div className="sr-only">
            <FormField
              control={form.control}
              name="lat"
              render={({ field }) => (
                <input
                  data-testid="lat-input"
                  type="text"
                  tabIndex={-1}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            />
            <FormField
              control={form.control}
              name="lng"
              render={({ field }) => (
                <input
                  data-testid="lng-input"
                  type="text"
                  tabIndex={-1}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="reset" variant="outline" onClick={() => form.reset()}>
            Limpiar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
