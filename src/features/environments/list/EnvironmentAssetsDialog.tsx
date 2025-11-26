"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import { fetchGoodsByNia, type GoodsApiItem } from "@/lib/goods-api";
import type { EnvironmentRow } from "./columns";

type EnvironmentAssetsDialogProps = {
  open: boolean;
  environment: EnvironmentRow | null;
  onClose: () => void;
  onSuccess: () => void;
};

type AssetPayload = {
  nia: string;
  nombre: string;
  descripcion: string;
  ambiente_id: number;
  ambiente_origen?: string | null;
};

const searchSchema = z.object({
  nia: z.string().trim().min(1, "Ingresa un NIA para buscar."),
});

export function EnvironmentAssetsDialog({
  open,
  environment,
  onClose,
  onSuccess,
}: EnvironmentAssetsDialogProps) {
  // Guardamos la lista de resultados que vienen del servicio externo.
  const [results, setResults] = useState<GoodsApiItem[]>([]);
  // Guardamos el ambiente de origen devuelto por la API interna para cada NIA.
  const [originByNia, setOriginByNia] = useState<Record<string, string | null>>(
    {}
  );
  // Mantenemos los activos que la persona va agregando para asociarlos en masa.
  const [selectedAssets, setSelectedAssets] = useState<AssetPayload[]>([]);
  // Indicamos cuando estamos buscando en el servicio externo para mostrar feedback.
  const [searching, setSearching] = useState(false);
  // Indicamos cuando estamos enviando los activos al backend local para deshabilitar controles.
  const [saving, setSaving] = useState(false);
  // Mostramos mensajes cortos de error cuando la busqueda falla.
  const [searchError, setSearchError] = useState<string | null>(null);
  // Señalamos en el modal cuando se intenta agregar un activo duplicado.
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);

  // Creamos el formulario que observa el NIA y valida con Zod cada vez que cambia.
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { nia: "" },
    mode: "onChange",
  });

  // Observamos el valor del NIA en tiempo real para disparar la busqueda con debounce.
  const watchedNia = form.watch("nia");

  // Construimos una etiqueta legible para el ambiente que se esta editando.
  const environmentLabel = useMemo(() => {
    // Si no hay ambiente seleccionado, retornamos una cadena vacia.
    if (!environment) {
      return "";
    }
    // Tomamos nombre y codigo para que la persona identifique el contexto del modal.
    const name =
      typeof environment.nombre === "string"
        ? environment.nombre.trim()
        : "";
    const code =
      typeof environment.codigo === "string"
        ? environment.codigo.trim()
        : "";
    // Si ambos existen, los combinamos; de lo contrario devolvemos el disponible.
    return name && code ? `${name} (${code})` : name || code;
  }, [environment]);

  useEffect(() => {
    // Si el modal se cierra, limpiamos el estado interno para evitar datos obsoletos.
    if (!open) {
      form.reset({ nia: "" });
      setResults([]);
      setSearchError(null);
      setSearching(false);
      setSelectedAssets([]);
      setDuplicateMessage(null);
      return;
    }
    // Creamos un abort controller para cancelar la peticion si el NIA cambia o el modal se cierra.
    const controller = new AbortController();
    // Definimos el temporizador que actuara como debounce para no disparar la API en cada tecla.
    const timeout = window.setTimeout(() => {
      // Si no hay NIA, limpiamos la UI y evitamos llamadas innecesarias.
      if (!watchedNia || !watchedNia.trim().length) {
        setResults([]);
        setSearchError(null);
        setSearching(false);
        return;
      }
      // Marcamos el inicio de la busqueda para mostrar un estado de cargando.
      setSearching(true);
      setSearchError(null);
      // Ejecutamos la consulta al servicio externo y al backend interno en paralelo.
      Promise.all([
        fetchGoodsByNia(watchedNia, { signal: controller.signal }),
        apiFetch<{ id?: number; ambiente_nombre?: string | null; nombre?: string | null; descripcion?: string | null }>(
          `/activos/buscar_por_nia?nia=${encodeURIComponent(
            watchedNia.trim()
          )}`,
          { signal: controller.signal }
        ).catch(() => null),
      ])
        .then(([externalResults, localAsset]) => {
          setResults(externalResults);
          if (localAsset) {
            const key = watchedNia.trim().toLowerCase();
            setOriginByNia((prev) => ({
              ...prev,
              [key]:
                typeof localAsset.ambiente_nombre === "string" &&
                localAsset.ambiente_nombre.trim().length
                  ? localAsset.ambiente_nombre.trim()
                  : null,
            }));
          }
          if (!externalResults.length) {
            setSearchError("No encontramos activos con ese NIA.");
          }
        })
        .catch((error: unknown) => {
          // Si el error fue por abortar la peticion, salimos sin mostrar mensajes.
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          // Para cualquier otro fallo mostramos una descripcion simple para la persona usuaria.
          setSearchError(
            error instanceof Error
              ? error.message
              : "No pudimos consultar el servicio externo."
          );
        })
        .finally(() => {
          // Quitamos el indicador de carga sin importar el resultado.
          setSearching(false);
        });
    }, 450);

    // Al limpiar el efecto, cancelamos el timeout y abortamos la solicitud pendiente.
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [watchedNia, open, form]);

  function mapGoodsToPayload(
    item: GoodsApiItem,
    environmentId: number
  ): AssetPayload {
    // Convertimos el NIA a texto para cumplir con el contrato del backend local.
    const nia =
      typeof item.nia === "number"
        ? String(item.nia)
        : String(item.nia ?? "").trim();
    const nombre =
      typeof item.descripcion === "string" && item.descripcion.trim().length
        ? item.descripcion.trim()
        : 'Sin descripcion'
    // Tomamos la descripcion extendida y la recortamos a 128 caracteres para el backend.
    const rawDescripcion =
      typeof item.descripcionExt === "string" && item.descripcionExt.trim().length
        ? item.descripcionExt.trim()
        : nombre;
    const descripcion =
      rawDescripcion.length > 128
        ? rawDescripcion.slice(0, 128)
        : rawDescripcion;
    // Regresamos la estructura que el endpoint POST /api/activos espera.
    return {
      nia,
      nombre,
      descripcion,
      ambiente_id: environmentId,
      ambiente_origen:
        originByNia[nia.toLowerCase()] !== undefined
          ? originByNia[nia.toLowerCase()]
          : null,
    };
  }

  function handleAddAsset(item: GoodsApiItem) {
    // Si no tenemos ambiente seleccionado no podemos mapear el ambiente_id, asi que detenemos la accion.
    if (!environment) {
      return;
    }
    // Traducimos el bien externo a la estructura que guarda el backend local.
    const payload = mapGoodsToPayload(item, environment.id);
    // Evitamos duplicados revisando si ya existe un activo con el mismo NIA en la lista temporal.
    setSelectedAssets((current) => {
      const exists = current.some(
        (asset) => asset.nia.toLowerCase() === payload.nia.toLowerCase()
      );
      if (exists) {
        setDuplicateMessage(
          `El NIA ${payload.nia} ya está en la lista de activos seleccionados.`
        );
        return current;
      }
      setDuplicateMessage(null);
      // Insertamos al inicio para mostrar primero el mas reciente.
      return [payload, ...current];
    });
  }

  function handleRemoveAsset(nia: string) {
    // Filtramos la lista para eliminar el activo cuyo NIA coincide con el solicitado.
    setSelectedAssets((current) =>
      current.filter(
        (asset) => asset.nia.toLowerCase() !== nia.toLowerCase()
      )
    );
    setDuplicateMessage(null);
  }

  async function handleSaveAssets() {
    // Si no hay activos seleccionados, avisamos y salimos sin hacer llamadas.
    if (!selectedAssets.length) {
      notify.info({
        title: "Agrega al menos un activo",
        description: "Busca un NIA y agrega el activo antes de guardar.",
      });
      return;
    }
    // Marcamos que estamos guardando para deshabilitar botones duplicados.
    setSaving(true);
    try {
      // Enviamos cada activo al endpoint interno usando el helper centralizado apiFetch.
      await Promise.all(
        selectedAssets.map((asset) =>
          apiFetch(`/activos/nia/${asset.nia}`, {
            method: "PUT",
            json: {
              nombre: asset.nombre,
              descripcion: asset.descripcion,
              ambiente_id: asset.ambiente_id,
            },
          })
        )
      );
      // Mostramos una notificacion clara de exito indicando cuantos activos se asociaron.
      notify.success({
        title: "Activos asociados",
        description: `Se guardaron ${selectedAssets.length} activos en el ambiente.`,
      });
      // Ejecutamos el callback de exito para refrescar la tabla externa y cerrar el modal.
      onSuccess();
    } catch (error) {
      // Si algo falla, informamos a la persona usuaria con un mensaje entendible.
      notify.error({
        title: "No pudimos asociar los activos",
        description:
          error instanceof Error
            ? error.message
            : "Intenta nuevamente en unos segundos.",
      });
    } finally {
      // Sin importar el resultado, levantamos el indicador de guardado.
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        // Cerramos el modal solo cuando se recibe false desde el trigger o el exterior.
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asociar activos</DialogTitle>
          <DialogDescription>
            Busca activos por NIA y agregalos al ambiente seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-md border bg-muted/30 p-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-semibold">Ambiente seleccionado</p>
              <p className="text-muted-foreground">{environmentLabel || "-"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nia-search">Buscar NIA</Label>
              <Input
                id="nia-search"
                aria-label="Buscar NIA"
                placeholder="Escribe el NIA y espera un instante"
                {...form.register("nia")}
              />
              <p className="text-xs text-muted-foreground">
                Consultamos automaticamente cuando dejas de escribir.
              </p>
              {form.formState.errors.nia ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nia.message}
                </p>
              ) : null}
              {searchError ? (
                <p className="text-xs text-destructive">{searchError}</p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Resultados</p>
                  <p className="text-xs text-muted-foreground">
                    Selecciona un activo para agregarlo a la lista.
                  </p>
                </div>
                {searching ? (
                  <span className="text-xs text-muted-foreground">
                    Buscando...
                  </span>
                ) : null}
              </div>
              {results.length ? (
                <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {results.map((item) => {
                    const originKey = String(item.nia).toLowerCase();
                    const origin =
                      originByNia[originKey] === undefined
                        ? null
                        : originByNia[originKey];
                    return (
                      <li
                        key={String(item.nia)}
                        className="rounded-lg border bg-card p-3 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">
                                NIA {String(item.nia)}
                              </Badge>
                              {item.estado ? (
                                <Badge variant="secondary">{item.estado}</Badge>
                              ) : null}
                              {item.unidadMedida ? (
                                <Badge variant="outline">
                                  {item.unidadMedida}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="space-y-1 text-sm">
                              <p className="font-semibold leading-snug">
                                {item.descripcion}
                              </p>
                              {item.descripcionExt ? (
                                <p className="text-xs text-muted-foreground leading-snug">
                                  {item.descripcionExt}
                                </p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">
                                Ambiente origen:{" "}
                                {origin && origin.trim().length
                                  ? origin
                                  : "Sin asignar"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddAsset(item)}
                            >
                              Agregar activo
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Escribe un NIA para buscar activos disponibles.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">
                Activos seleccionados para asociar
              </p>
              {duplicateMessage ? (
                <p className="text-xs text-destructive text-right">
                  {duplicateMessage}
                </p>
              ) : null}
            </div>
            {selectedAssets.length ? (
              <div className="max-h-[420px] overflow-y-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50 text-xs font-semibold text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-3 py-2">NIA</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Ambiente origen</th>
                      <th className="px-3 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAssets.map((asset) => (
                      <tr key={asset.nia} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">
                          {asset.nia}
                        </td>
                        <td className="px-3 py-2 leading-snug">
                          {asset.nombre}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {asset.ambiente_origen && asset.ambiente_origen.trim().length
                            ? asset.ambiente_origen
                            : "Sin asignar"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAsset(asset.nia)}
                            >
                              Quitar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavia no agregas activos a la lista.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveAssets}
            disabled={saving || !selectedAssets.length}
          >
            {saving ? "Guardando..." : "Guardar activos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
