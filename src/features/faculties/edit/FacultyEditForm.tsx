"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import {
  facultyUpdateSchema,
  type FacultyUpdateInput,
} from "@/features/faculties/schema";
import type { FacultyRow } from "@/features/faculties/list/columns";

const MapPicker = dynamic(() => import("@/features/campus/MapPicker"), {
  ssr: false,
});

const DEFAULT_POSITION = { lat: -17.3939, lng: -66.157 };

type FacultyUpdateIn = z.input<typeof facultyUpdateSchema>;

type CampusOption = {
  id: number;
  nombre: string;
  codigo: string;
  lat: number | null;
  lng: number | null;
};

type CampusListResponse = {
  items: CampusOption[];
};

type Props = {
  faculty: FacultyRow;
  onSubmitSuccess?: () => void;
};

export default function FacultyEditForm({ faculty, onSubmitSuccess }: Props) {
  // Configuramos el formulario con react-hook-form y la validacion de Zod usando los datos actuales de la facultad.
  const form = useForm<FacultyUpdateIn>({
    resolver: zodResolver(facultyUpdateSchema),
    mode: "onTouched",
    defaultValues: {
      codigo: faculty.codigo,
      nombre: faculty.nombre,
      nombre_corto: faculty.nombre_corto ?? "",
      campus_id: faculty.campus_id,
      lat:
        typeof faculty.lat === "number"
          ? faculty.lat
          : DEFAULT_POSITION.lat,
      lng:
        typeof faculty.lng === "number"
          ? faculty.lng
          : DEFAULT_POSITION.lng,
      activo: faculty.activo,
    },
  });

  // Guardamos el catalogo de campus para alimentar el selector reutilizable.
  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  // Controlamos el texto que la persona escribe al filtrar el listado de campus.
  const [campusSearch, setCampusSearch] = useState("");
  // Manejamos si el listado desplegable de campus esta abierto o cerrado.
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  // Indicamos cuando el formulario se esta enviando para evitar doble submit.
  const [submitting, setSubmitting] = useState(false);

  // Referencias usadas para cerrar el dropdown cuando se hace clic fuera.
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Observamos el campus seleccionado actualmente para sincronizar la UI.
  const currentCampusValue = form.watch("campus_id");

  // Derivamos la lista de campus filtrados usando el termino ingresado en la bÃºsqueda.
  const filteredCampusOptions = useMemo(() => {
    const term = campusSearch.trim().toLowerCase();
    if (!term) {
      return campusOptions;
    }
    return campusOptions.filter((option) =>
      option.nombre.toLowerCase().includes(term)
    );
  }, [campusOptions, campusSearch]);

  // Cargamos el catalogo de campus al montar el componente.
  useEffect(() => {
    const controller = new AbortController();

    async function loadCampus() {
      try {
        const data = await apiFetch<CampusListResponse>(
          "/campus?page=1&limit=1000",
          { signal: controller.signal }
        );

        setCampusOptions(
          data.items.map((item) => ({
            ...item,
            lat: typeof item.lat === "number" ? item.lat : null,
            lng: typeof item.lng === "number" ? item.lng : null,
          }))
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        toast.error("No se pudieron cargar los campus disponibles");
      }
    }

    void loadCampus();
    return () => controller.abort();
  }, []);

  // Si la persona abre el desplegable, registramos eventos globales para cerrarlo al hacer clic fuera.
  useEffect(() => {
    if (!campusDropdownOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (dropdownRef.current?.contains(event.target as Node)) {
        return;
      }
      if (triggerRef.current?.contains(event.target as Node)) {
        return;
      }
      setCampusDropdownOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [campusDropdownOpen]);

  // Cuando cambia la facultad seleccionada, sincronizamos los valores iniciales del formulario.
  useEffect(() => {
    form.reset({
      codigo: faculty.codigo,
      nombre: faculty.nombre,
      nombre_corto: faculty.nombre_corto ?? "",
      campus_id: faculty.campus_id,
      lat:
        typeof faculty.lat === "number"
          ? faculty.lat
          : DEFAULT_POSITION.lat,
      lng:
        typeof faculty.lng === "number"
          ? faculty.lng
          : DEFAULT_POSITION.lng,
      activo: faculty.activo,
    });
  }, [faculty, form]);

  // Si el valor almacenado del campus no es válido, restablecemos el asignado al registro actual.
  useEffect(() => {
    const current = form.getValues("campus_id");
    if (typeof current !== "number" || Number.isNaN(current) || current <= 0) {
      form.setValue("campus_id", faculty.campus_id, { shouldDirty: false });
    }
  }, [faculty.campus_id, form]);

  // Definimos la funcion de envio con comentarios paso a paso para una persona que recien aprende.
  const handleSubmit = useCallback(
    async (values: FacultyUpdateIn) => {
      // Garantizamos que los campos numéricos tengan un valor válido antes de pasar al esquema.
      const normalizedCampusId =
        typeof values.campus_id === "number" && Number.isFinite(values.campus_id)
          ? values.campus_id
          : typeof values.campus_id === "string" && values.campus_id.trim().length > 0
          ? Number(values.campus_id)
          : faculty.campus_id;

      const normalizedValues: FacultyUpdateIn = {
        ...values,
        campus_id: normalizedCampusId,
        lat:
          typeof values.lat === "number" && Number.isFinite(values.lat)
            ? values.lat
            : typeof values.lat === "string" && values.lat.trim().length > 0
            ? Number(values.lat)
            : DEFAULT_POSITION.lat,
        lng:
          typeof values.lng === "number" && Number.isFinite(values.lng)
            ? values.lng
            : typeof values.lng === "string" && values.lng.trim().length > 0
            ? Number(values.lng)
            : DEFAULT_POSITION.lng,
      };

      // Normalizamos los datos usando Zod para asegurarnos de enviar la forma correcta.
      const payload: FacultyUpdateInput = facultyUpdateSchema.parse(normalizedValues);
      try {
        // Activamos el estado de envio para bloquear dobles clics mientras esperamos la respuesta.
        setSubmitting(true);

        // Realizamos la peticion PATCH al backend con los datos actualizados.
        await apiFetch(`/facultades/${faculty.id}`, {
          method: "PATCH",
          json: payload,
        });

        // Mostramos un mensaje exitoso indicando que los cambios se guardaron.
        toast.success("Facultad actualizada", {
          description: "Se guardaron los cambios correctamente.",
        });

        // Sincronizamos el formulario con los datos que se enviaron para mantener el estado visible correcto.
        form.reset(payload);

        // Notificamos al componente padre para refrescar la tabla y cerrar el modal.
        await onSubmitSuccess?.();
      } catch (error) {
        const err = error as {
          message?: string;
          details?: string[];
        };
        toast.error("No se pudo actualizar la facultad", {
          description: err?.details?.join("\n") ?? err?.message ?? "Error desconocido.",
        });
      } finally {
        // Apagamos el estado de envio sin importar el resultado para reactivar los controles.
        setSubmitting(false);
      }
    },
    [faculty.id, form, onSubmitSuccess]
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="codigo"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="codigo-facultad-edit">Codigo de la facultad</FormLabel>
              <FormControl>
                <Input
                  id="codigo-facultad-edit"
                  placeholder="FAC-001"
                  type="text"
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
              <FormLabel htmlFor="nombre-facultad-edit">Nombre de la facultad</FormLabel>
              <FormControl>
                <Input
                  id="nombre-facultad-edit"
                  placeholder="Facultad de Ingenieria"
                  {...field}
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
              <FormLabel htmlFor="nombre-corto-edit">Nombre corto (opcional)</FormLabel>
              <FormControl>
                <Input
                  id="nombre-corto-edit"
                  placeholder="FI"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="campus_id"
          render={({ field }) => {
            const resolvedCampusId =
              typeof currentCampusValue === "number" && Number.isFinite(currentCampusValue)
                ? currentCampusValue
                : Number(currentCampusValue);

            const selectedCampusId =
              Number.isFinite(resolvedCampusId) && resolvedCampusId > 0
                ? resolvedCampusId
                : faculty.campus_id;
            const selectedCampus =
              campusOptions.find((option) => option.id === selectedCampusId) ??
              campusOptions.find((option) => option.id === faculty.campus_id);

            const buttonLabel = selectedCampus
              ? selectedCampus.nombre
              : faculty.campus_nombre ?? "Seleccionar campus";

            return (
              <FormItem>
                <FormLabel>Seleccione el campus</FormLabel>
                <div className="relative">
                  <FormControl>
                    <input
                      type="hidden"
                      name={field.name}
                      value={String(selectedCampusId)}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        field.onChange(
                          Number.isNaN(nextValue) || nextValue <= 0
                            ? faculty.campus_id
                            : nextValue
                        );
                      }}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  </FormControl>
                  <Button
                    ref={triggerRef}
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    aria-haspopup="listbox"
                    aria-expanded={campusDropdownOpen}
                    onClick={() => {
                      setCampusDropdownOpen((open) => !open);
                      setCampusSearch("");
                    }}
                  >
                    <span>{buttonLabel}</span>
                    <span aria-hidden className="text-xs text-muted-foreground">
                      {campusDropdownOpen ? "Cerrar" : "Abrir"}
                    </span>
                  </Button>

                  {campusDropdownOpen ? (
                    <div
                      ref={dropdownRef}
                      className="absolute z-20 mt-2 w-full rounded-md border bg-popover shadow-md"
                    >
                      <div className="p-2">
                        <Input
                          placeholder="Buscar campus"
                          value={campusSearch}
                          onChange={(event) => setCampusSearch(event.target.value)}
                        />
                      </div>

                      <ul
                        role="listbox"
                        aria-label="Listado de campus"
                        className="max-h-56 overflow-y-auto px-1 pb-2"
                      >
                        {filteredCampusOptions.length ? (
                          filteredCampusOptions.map((option) => (
                            <li key={option.id} className="p-1">
                          <button
                            type="button"
                            role="option"
                                aria-selected={selectedCampusId === option.id}
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              field.onChange(option.id);
                              if (typeof option.lat === "number") {
                                form.setValue("lat", option.lat, {
                                      shouldValidate: true,
                                    });
                                  }
                                  if (typeof option.lng === "number") {
                                    form.setValue("lng", option.lng, {
                                      shouldValidate: true,
                                    });
                                  }
                                  setCampusDropdownOpen(false);
                                }}
                              >
                                {option.nombre}
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-muted-foreground">
                            No se encontraron campus
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FormControl>
                  <Checkbox
                    id="activo-facultad"
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                  />
                </FormControl>
                <FormLabel htmlFor="activo-facultad" className="cursor-pointer text-base">
                  Facultad activa
                </FormLabel>
              </div>
              <p className="text-sm text-muted-foreground">
                Desmarca esta opcion para deshabilitar la facultad y sus dependencias.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-md border bg-muted/20 p-2">
          <div className="h-64 overflow-hidden rounded-md">
            <MapPicker
              lat={
                Number.isFinite(Number(form.watch("lat")))
                  ? Number(form.watch("lat"))
                  : typeof faculty.lat === "number"
                  ? faculty.lat
                  : DEFAULT_POSITION.lat
              }
              lng={
                Number.isFinite(Number(form.watch("lng")))
                  ? Number(form.watch("lng"))
                  : typeof faculty.lng === "number"
                  ? faculty.lng
                  : DEFAULT_POSITION.lng
              }
              onChange={(position) => {
                form.setValue("lat", position.lat, { shouldValidate: true });
                form.setValue("lng", position.lng, { shouldValidate: true });
              }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
