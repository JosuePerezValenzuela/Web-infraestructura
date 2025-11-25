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
  // Mantenemos los activos que la persona va agregando para asociarlos en masa.
  const [selectedAssets, setSelectedAssets] = useState<AssetPayload[]>([]);
  // Indicamos cuando estamos buscando en el servicio externo para mostrar feedback.
  const [searching, setSearching] = useState(false);
  // Indicamos cuando estamos enviando los activos al backend local para deshabilitar controles.
  const [saving, setSaving] = useState(false);
  // Mostramos mensajes cortos de error cuando la busqueda falla.
  const [searchError, setSearchError] = useState<string | null>(null);

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
      // Ejecutamos la consulta al servicio externo reutilizando el helper centralizado.
      fetchGoodsByNia(watchedNia, { signal: controller.signal })
        .then((data) => {
          // Guardamos los resultados parseados; si no hay datos, mostramos un mensaje amigable.
          setResults(data);
          if (!data.length) {
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
    // Usamos la descripcion corta como nombre legible; si falta, mostramos el NIA.
    const nombre =
      (typeof item.descripcion === "string" && item.descripcion.trim()) ||
      (nia ? `NIA ${nia}` : "Activo sin nombre");
    // Aprovechamos la descripcion extendida como detalle principal; si falta, caemos en la descripcion corta.
    const descripcion =
      (typeof item.descripcionExt === "string" &&
        item.descripcionExt.trim()) ||
      nombre;
    // Regresamos la estructura que el endpoint POST /api/activos espera.
    return {
      nia,
      nombre,
      descripcion,
      ambiente_id: environmentId,
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
        return current;
      }
      return [...current, payload];
    });
  }

  function handleRemoveAsset(nia: string) {
    // Filtramos la lista para eliminar el activo cuyo NIA coincide con el solicitado.
    setSelectedAssets((current) =>
      current.filter(
        (asset) => asset.nia.toLowerCase() !== nia.toLowerCase()
      )
    );
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
          apiFetch("/activos", { method: "POST", json: asset })
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Asociar activos</DialogTitle>
          <DialogDescription>
            Busca activos por NIA y agregalos al ambiente seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <p className="text-sm font-semibold">Resultados</p>
              {searching ? (
                <span className="text-xs text-muted-foreground">
                  Buscando...
                </span>
              ) : null}
            </div>
            {results.length ? (
              <ul className="space-y-3">
                {results.map((item) => (
                  <li
                    key={String(item.nia)}
                    className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span>{item.descripcion}</span>
                        <Badge variant="outline">
                          NIA {String(item.nia)}
                        </Badge>
                        {item.estado ? (
                          <Badge variant="secondary">{item.estado}</Badge>
                        ) : null}
                      </div>
                      {item.descripcionExt ? (
                        <p className="text-xs text-muted-foreground">
                          {item.descripcionExt}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddAsset(item)}
                    >
                      Agregar activo
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Escribe un NIA para buscar activos disponibles.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">
              Activos seleccionados para asociar
            </p>
            {selectedAssets.length ? (
              <ul className="space-y-2">
                {selectedAssets.map((asset) => (
                  <li
                    key={asset.nia}
                    className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">NIA {asset.nia}</Badge>
                        <span className="font-semibold">{asset.nombre}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {asset.descripcion}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAsset(asset.nia)}
                    >
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavia no agregas activos a la lista.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
