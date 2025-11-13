"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { facultyCreateSchema } from "@/features/faculties/schema";
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
import { notify } from "@/lib/notify";
import dynamic from "next/dynamic";

type FacultyCreateFormValues = z.input<typeof facultyCreateSchema>;

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
  submitLabel?: string;
  onSubmitSuccess?: () => Promise<void> | void;
};

const INITIAL_POSITION = { lat: -17.3939, lng: -66.157 };

const MapPicker = dynamic(() => import("@/features/campus/MapPicker"), {
  ssr: false,
});

export default function FacultyForm({
  submitLabel = "Crear facultad",
  onSubmitSuccess,
}: Props) {
  // Creamos el formulario con react-hook-form aplicando la validaciÃ³n de Zod.
  const form = useForm<FacultyCreateFormValues>({
    resolver: zodResolver(facultyCreateSchema),
    mode: "onTouched",
    defaultValues: {
      codigo: "",
      nombre: "",
      nombre_corto: "",
      campus_id: undefined,
      lat: INITIAL_POSITION.lat,
      lng: INITIAL_POSITION.lng,
    },
  });

  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [campusSearch, setCampusSearch] = useState<string>("");
  const [campusDropdownOpen, setCampusDropdownOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const filteredCampusOptions = useMemo(() => {
    const term = campusSearch.trim().toLowerCase();
    if (!term) {
      return campusOptions;
    }
    return campusOptions.filter((option) =>
      option.nombre.toLowerCase().includes(term)
    );
  }, [campusOptions, campusSearch]);

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
        console.error("Error al cargar el catalogo de campus", error);
        notify.error({
          title: "No se pudieron cargar los campus",
          description: "Inténtalo nuevamente en unos minutos.",
        });
      }
    }

    void loadCampus();

    return () => controller.abort();
  }, []);

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

  const handleSubmit = useCallback(
    async (values: FacultyCreateFormValues) => {
      const parsed = facultyCreateSchema.parse(values);
      try {
        setSubmitting(true);

        const payload = {
          codigo: parsed.codigo,
          nombre: parsed.nombre,
          nombre_corto: parsed.nombre_corto,
          campus_id: parsed.campus_id,
          lat: parsed.lat,
          lng: parsed.lng,
        };

        await apiFetch("/facultades", {
          method: "POST",
          json: payload,
        });

        notify.success({
          title: "Facultad creada",
          description: "Se registro correctamente la facultad.",
        });

        form.reset({
          codigo: "",
          nombre: "",
          nombre_corto: "",
          campus_id: undefined,
          lat: INITIAL_POSITION.lat,
          lng: INITIAL_POSITION.lng,
        });

        setCampusSearch("");
        setCampusDropdownOpen(false);

        await onSubmitSuccess?.();
      } catch (error: unknown) {
        const err = error as {
          message?: string;
          details?: string[];
        };
        notify.error({
          title: "No se pudo crear la facultad",
          description: err?.details?.join("\n") ?? err?.message ?? "Error desconocido.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSubmitSuccess]
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
              <FormLabel htmlFor="codigo-facultad">Codigo de la facultad</FormLabel>
              <FormControl>
                <Input
                  id="codigo-facultad"
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
              <FormLabel htmlFor="nombre-facultad">Nombre de la facultad</FormLabel>
              <FormControl>
                <Input
                  id="nombre-facultad"
                  placeholder="Facultad de ciencias y tecnologia"
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
              <FormLabel htmlFor="nombre-corto">Nombre corto (opcional)</FormLabel>
              <FormControl>
                <Input
                  id="nombre-corto"
                  placeholder="FCyT"
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
            const selectedCampus = campusOptions.find(
              (option) => option.id === field.value
            );

            return (
              <FormItem>
                <FormLabel>Seleccione el campus</FormLabel>
                <div className="relative">
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
                    <span>
                      {selectedCampus ? selectedCampus.nombre : "Seleccionar campus"}
                    </span>
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
                                aria-selected={field.value === option.id}
                                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  field.onChange(option.id);
                                  if (
                                    typeof option.lat === "number" &&
                                    typeof option.lng === "number"
                                  ) {
                                    form.setValue("lat", option.lat, {
                                      shouldValidate: true,
                                    });
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

        <div className="rounded-md border bg-muted/20 p-2">
          <div className="h-64 overflow-hidden rounded-md">
            <MapPicker
              lat={Number(form.watch("lat")) || INITIAL_POSITION.lat}
              lng={Number(form.watch("lng")) || INITIAL_POSITION.lng}
              onChange={(position) => {
                form.setValue("lat", position.lat, { shouldValidate: true });
                form.setValue("lng", position.lng, { shouldValidate: true });
              }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
