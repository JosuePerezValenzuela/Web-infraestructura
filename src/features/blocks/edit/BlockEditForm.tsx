"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notify } from "@/lib/notify";
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
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import {
  CatalogSearchSelect,
  type CatalogOption,
} from "@/components/catalog-search-select";
import {
  blockUpdateSchema,
  type BlockUpdateInput,
  type BlockUpdateOutput,
} from "../schema";
import type { BlockRow } from "../list/columns";

const DEFAULT_POSITION = { lat: -17.3939, lng: -66.157 }; // Punto de partida cuando no hay coordenadas guardadas.
const MapPicker = dynamic(() => import("@/features/campus/MapPicker"), {
  ssr: false,
});

type BlockEditFormProps = {
  block: BlockRow;
  faculties: CatalogOption[];
  blockTypes: CatalogOption[];
  onSubmitSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
};

export default function BlockEditForm({
  block,
  faculties,
  blockTypes,
  onSubmitSuccess,
  onCancel,
}: BlockEditFormProps) {
  const [submitting, setSubmitting] = useState(false); // Evita envíos duplicados mientras esperamos la respuesta del backend.
  const initialPayloadRef = useRef<BlockUpdateOutput | null>(null); // Guarda el estado base para detectar qué campos cambian realmente.

  const form = useForm<BlockUpdateInput>({
    resolver: zodResolver(blockUpdateSchema),
    mode: "onTouched",
    defaultValues: buildInitialValues(block),
  }); // Configuramos React Hook Form con la validación de Zod y los valores iniciales.

  useEffect(() => {
    const nextValues = buildInitialValues(block);
    form.reset(nextValues); // Sincronizamos el formulario cada vez que cambia el bloque seleccionado.
    const parsedBaseline = blockUpdateSchema.safeParse(nextValues);
    initialPayloadRef.current = parsedBaseline.success
      ? parsedBaseline.data
      : null; // Solo actualizamos la referencia cuando los datos son válidos para evitar errores en tiempo de ejecución.
  }, [block, form]);

  const latValue = form.watch("lat"); // Escuchamos la latitud para mantener sincronizado el marcador del mapa.
  const lngValue = form.watch("lng"); // Escuchamos la longitud con el mismo fin.

  const mapLat = parseCoordinateValue(latValue, DEFAULT_POSITION.lat); // Determinamos el valor numérico final para el mapa.
  const mapLng = parseCoordinateValue(lngValue, DEFAULT_POSITION.lng); // Repetimos para la longitud.

  const coordinatesLabel = latValue && lngValue
    ? `Lat: ${latValue} | Lng: ${lngValue}`
    : "Selecciona un punto en el mapa para registrar las coordenadas."; // Texto guía que explica el estado actual de las coordenadas.

  const catalogOptions = useMemo(
    () => ({
      faculties,
      blockTypes,
    }),
    [faculties, blockTypes]
  ); // Memoriza los catálogos para evitar renders innecesarios en los selectores personalizados.

  async function handleSubmit(values: BlockUpdateInput) {
    const parsed = blockUpdateSchema.parse(values); // Convertimos los datos del formulario al formato esperado por la API.
    const baseline =
      initialPayloadRef.current ?? blockUpdateSchema.parse(values); // Recuperamos la versión base para comparar cambios.
    const payload = diffPayload(parsed, baseline); // Identificamos qué campos realmente varían.

    if (!Object.keys(payload).length) {
      notify.info({
        title: "Sin cambios para guardar",
        description: "Realiza alguna modificacion antes de enviar la solicitud.",
      }); // Evitamos llamadas vacías cuando la persona usuaria no modificó nada.
      return;
    }

    try {
      setSubmitting(true); // Bloqueamos temporalmente los controles.
      await apiFetch(`/bloques/${block.id}`, {
        method: "PATCH",
        json: payload,
      }); // Notificamos al backend únicamente los campos modificados.

      const becameInactive =
        payload.activo === false && baseline.activo !== false; // Detectamos si el bloque pasó de activo a inactivo.

      notify.success({
        title: "Bloque actualizado",
        description: becameInactive
          ? "Los datos del bloque se guardaron y los ambientes dependientes reflejarán su nuevo estado."
          : "Los datos del bloque se guardaron correctamente.",
      }); // Comunicación clara siguiendo las reglas de la HU.

      const nextBaseline = { ...baseline, ...payload } as BlockUpdateOutput;
      initialPayloadRef.current = nextBaseline; // Actualizamos la referencia para futuros cambios.
      form.reset({
        ...values,
        lat: parsed.lat !== undefined ? String(parsed.lat) : "",
        lng: parsed.lng !== undefined ? String(parsed.lng) : "",
      }); // Reseteamos el formulario con los últimos datos aceptados.

      await onSubmitSuccess?.(); // Avisamos al padre para refrescar la tabla o cerrar el diálogo.
    } catch (error) {
      const description =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message?: unknown }).message)
          : "Error desconocido."; // Traducimos la excepción en un mensaje comprensible.
      notify.error({
        title: "No se pudo actualizar el bloque",
        description,
      }); // Mostramos el fallo sin exponer detalles sensibles.
    } finally {
      setSubmitting(false); // Liberamos los controles sin importar el resultado.
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
              <FormItem className="w-full">
                <FormLabel htmlFor="edit-codigo-input">Codigo</FormLabel>
                <FormControl>
                  <Input
                    id="edit-codigo-input"
                    maxLength={16}
                    placeholder="Ej. BLO-100"
                    {...field}
                    value={field.value ?? ""}
                    className="w-full"
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
              <FormItem className="w-full">
                <FormLabel htmlFor="edit-nombre-input">Nombre</FormLabel>
                <FormControl>
                  <Input
                    id="edit-nombre-input"
                    maxLength={128}
                    placeholder="Nombre oficial del bloque"
                    {...field}
                    value={field.value ?? ""}
                    className="w-full"
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
              <FormItem className="w-full">
                <FormLabel htmlFor="edit-nombre-corto-input">
                  Nombre corto (opcional)
                </FormLabel>
                <FormControl>
                  <Input
                    id="edit-nombre-corto-input"
                    maxLength={16}
                    placeholder="Ej. Bloque A"
                    {...field}
                    value={field.value ?? ""}
                    className="w-full"
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
              <FormItem className="w-full">
                <FormLabel htmlFor="edit-pisos-input">Pisos</FormLabel>
                <FormControl>
                  <Input
                    id="edit-pisos-input"
                    type="number"
                    min={1}
                    max={99}
                    placeholder="Cantidad de pisos"
                    {...field}
                    value={field.value ?? ""}
                    className="w-full"
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
              <FormItem className="w-full">
                <FormLabel id="edit-facultad-label">Facultad</FormLabel>
                <CatalogSearchSelect
                  buttonId="edit-facultad-select"
                  labelId="edit-facultad-label"
                  placeholder="Selecciona una facultad"
                  searchPlaceholder="Buscar facultad"
                  options={catalogOptions.faculties}
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
              <FormItem className="w-full">
                <FormLabel id="edit-tipo-bloque-label">
                  Tipo de bloque
                </FormLabel>
                <CatalogSearchSelect
                  buttonId="edit-tipo-bloque-select"
                  labelId="edit-tipo-bloque-label"
                  placeholder="Selecciona un tipo de bloque"
                  searchPlaceholder="Buscar tipo"
                  options={catalogOptions.blockTypes}
                  value={field.value ? String(field.value) : ""}
                  onChange={(value) => field.onChange(value)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="font-semibold">Estado del bloque</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="edit-block-active"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <label htmlFor="edit-block-active" className="text-sm">
                  Activo
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Si desactivas un bloque, todos sus ambientes dependientes quedaran
                inactivos para mantener la integridad del inventario.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

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
          <p className="mt-2 text-sm text-muted-foreground">
            {coordinatesLabel}
          </p>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onCancel?.()}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function buildInitialValues(block: BlockRow): BlockUpdateInput {
  return {
    codigo: typeof block.codigo === "string" ? block.codigo : "",
    nombre: typeof block.nombre === "string" ? block.nombre : "",
    nombre_corto:
      typeof block.nombre_corto === "string" ? block.nombre_corto : "",
    pisos:
      typeof block.pisos === "number" && !Number.isNaN(block.pisos)
        ? String(block.pisos)
        : "",
    lat: resolveCoordinate(block, "lat"),
    lng: resolveCoordinate(block, "lng"),
    facultad_id: String(
      resolveNumericField(block, ["facultad_id", "facultadId"]) ?? ""
    ),
    tipo_bloque_id: String(
      resolveNumericField(block, ["tipo_bloque_id", "tipoBloqueId"]) ?? ""
    ),
    activo: block.activo !== false,
  };
}

function resolveNumericField(
  block: BlockRow,
  candidates: string[]
): number | undefined {
  for (const key of candidates) {
    const value = (block as Record<string, unknown>)[key];
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function resolveCoordinate(block: BlockRow, axis: "lat" | "lng"): string {
  const direct = (block as Record<string, unknown>)[axis];
  if (typeof direct === "number" && !Number.isNaN(direct)) {
    return String(direct);
  }
  if (typeof direct === "string" && direct.trim().length) {
    const parsed = Number(direct);
    if (!Number.isNaN(parsed)) {
      return String(parsed);
    }
  }

  const candidates = [
    "coordenadas",
    "coordinates",
    "coordenadas_text",
    "coordenadasPoint",
  ];

  for (const key of candidates) {
    const value = (block as Record<string, unknown>)[key];
    if (!value) {
      continue;
    }
    if (typeof value === "string") {
      const parsed = parsePointString(value);
      if (axis === "lat" && typeof parsed.lat === "number") {
        return String(parsed.lat);
      }
      if (axis === "lng" && typeof parsed.lng === "number") {
        return String(parsed.lng);
      }
    } else if (Array.isArray(value) && value.length >= 2) {
      const [lngCandidate, latCandidate] = value;
      if (axis === "lat" && typeof latCandidate === "number") {
        return String(latCandidate);
      }
      if (axis === "lng" && typeof lngCandidate === "number") {
        return String(lngCandidate);
      }
    } else if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (axis === "lat") {
        if (typeof record.lat === "number") {
          return String(record.lat);
        }
        if (typeof record.y === "number") {
          return String(record.y);
        }
      } else {
        if (typeof record.lng === "number") {
          return String(record.lng);
        }
        if (typeof record.x === "number") {
          return String(record.x);
        }
      }
    }
  }
  return "";
}

function parsePointString(
  value: string
): { lat?: number; lng?: number } {
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return {};
  }

  const numbers = matches.map((item) => Number(item)).filter(
    (num) => !Number.isNaN(num)
  );
  if (numbers.length < 2) {
    return {};
  }

  if (value.trim().toUpperCase().startsWith("POINT")) {
    return { lng: numbers[0], lat: numbers[1] };
  }

  return { lng: numbers[0], lat: numbers[1] };
}

function parseCoordinateValue(
  value: unknown,
  fallback: number
): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function diffPayload(
  current: BlockUpdateOutput,
  baseline: BlockUpdateOutput
): Partial<BlockUpdateOutput> {
  const changes: Partial<BlockUpdateOutput> = {};
  (Object.keys(current) as Array<keyof BlockUpdateOutput>).forEach((key) => {
    if (!Object.is(current[key], baseline[key])) {
      changes[key] = current[key];
    }
  });
  return changes;
}
