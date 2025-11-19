"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import {
  mapEnvironmentDetailToFormValues,
  type EnvironmentDetail,
} from "./mappers";
import { EnvironmentEditForm } from "./EnvironmentEditForm";
import type { CatalogOption } from "@/components/catalog-search-select";

type EnvironmentEditDialogProps = {
  open: boolean;
  environment: EnvironmentDetail | null;
  blocks: CatalogOption[];
  environmentTypes: CatalogOption[];
  onClose: () => void;
  onSuccess?: () => void;
};

function resolveRelatedLabel(
  environment: EnvironmentDetail,
  options: { directKeys: string[]; relationKeys: string[]; fallback?: string }
): string {
  const record = environment as Record<string, unknown>;
  for (const key of options.directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length) {
      return value.trim();
    }
  }
  for (const relationKey of options.relationKeys) {
    const relation = record[relationKey];
    if (relation && typeof relation === "object" && !Array.isArray(relation)) {
      const relationRecord = relation as Record<string, unknown>;
      const candidate =
        relationRecord.nombre ??
        relationRecord.nombre_corto ??
        relationRecord.nombreCorto ??
        relationRecord.descripcion ??
        relationRecord.codigo;
      if (typeof candidate === "string" && candidate.trim().length) {
        return candidate.trim();
      }
    }
  }
  return options.fallback ?? "-";
}

function findOptionIdByLabel(
  options: CatalogOption[],
  label: string
): string | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized.length) {
    return null;
  }
  const match = options.find(
    (option) => option.nombre.trim().toLowerCase() === normalized
  );
  return match ? String(match.id) : null;
}

export function EnvironmentEditDialog({
  open,
  environment,
  blocks,
  environmentTypes,
  onClose,
  onSuccess,
}: EnvironmentEditDialogProps) {
  const formValues = useMemo(() => {
    if (!environment) {
      return null;
    }
    return mapEnvironmentDetailToFormValues(environment);
  }, [environment]);

  const blockOptions = useMemo(() => {
    if (!environment?.bloque_id) {
      return blocks;
    }
    const exists = blocks.some((option) => option.id === environment.bloque_id);
    if (exists) {
      return blocks;
    }
    const label = resolveRelatedLabel(environment, {
      directKeys: [
        "bloque",
        "bloque_nombre",
        "bloqueNombre",
        "bloque_label",
      ],
      relationKeys: ["bloque_detalle", "bloqueDetalle", "bloqueInfo"],
      fallback: `Bloque ${environment.bloque_id}`,
    });
    return [...blocks, { id: environment.bloque_id, nombre: label }];
  }, [blocks, environment]);

  const environmentTypeOptions = useMemo(() => {
    if (!environment?.tipo_ambiente_id) {
      return environmentTypes;
    }
    const exists = environmentTypes.some(
      (option) => option.id === environment.tipo_ambiente_id
    );
    if (exists) {
      return environmentTypes;
    }
    const label = resolveRelatedLabel(environment, {
      directKeys: [
        "tipo_ambiente",
        "tipo_ambiente_nombre",
        "tipoAmbienteNombre",
      ],
      relationKeys: [
        "tipo_ambiente_detalle",
        "tipoAmbienteDetalle",
        "tipoAmbiente",
      ],
      fallback: `Tipo ${environment.tipo_ambiente_id}`,
    });
    return [
      ...environmentTypes,
      { id: environment.tipo_ambiente_id, nombre: label },
    ];
  }, [environmentTypes, environment]);

  const environmentBlockLabel = useMemo(() => {
    if (!environment) {
      return "";
    }
    return resolveRelatedLabel(environment, {
      directKeys: [
        "bloque",
        "bloque_nombre",
        "bloqueNombre",
        "bloque_label",
      ],
      relationKeys: ["bloque_detalle", "bloqueDetalle", "bloqueInfo"],
      fallback: "",
    });
  }, [environment]);

  const environmentTypeLabel = useMemo(() => {
    if (!environment) {
      return "";
    }
    return resolveRelatedLabel(environment, {
      directKeys: [
        "tipo_ambiente",
        "tipo_ambiente_nombre",
        "tipoAmbienteNombre",
      ],
      relationKeys: [
        "tipo_ambiente_detalle",
        "tipoAmbienteDetalle",
        "tipoAmbiente",
      ],
      fallback: "",
    });
  }, [environment]);

  const resolvedBlockId = useMemo(() => {
    if (!formValues) {
      return "";
    }
    if (formValues.bloque_id) {
      return formValues.bloque_id;
    }
    if (!environmentBlockLabel.trim().length) {
      return "";
    }
    return (
      findOptionIdByLabel(blockOptions, environmentBlockLabel) ??
      formValues.bloque_id ??
      ""
    );
  }, [formValues, environmentBlockLabel, blockOptions]);

  const resolvedTypeId = useMemo(() => {
    if (!formValues) {
      return "";
    }
    if (formValues.tipo_ambiente_id) {
      return formValues.tipo_ambiente_id;
    }
    if (!environmentTypeLabel.trim().length) {
      return "";
    }
    return (
      findOptionIdByLabel(environmentTypeOptions, environmentTypeLabel) ??
      formValues.tipo_ambiente_id ??
      ""
    );
  }, [formValues, environmentTypeLabel, environmentTypeOptions]);

  const finalDefaultValues = useMemo(() => {
    if (!formValues) {
      return null;
    }
    return {
      ...formValues,
      bloque_id:
        resolvedBlockId.length > 0 ? resolvedBlockId : formValues.bloque_id,
      tipo_ambiente_id:
        resolvedTypeId.length > 0 ? resolvedTypeId : formValues.tipo_ambiente_id,
    };
  }, [formValues, resolvedBlockId, resolvedTypeId]);

  function handleSuccess() {
    onSuccess?.();
    onClose();
  }

  const environmentId = environment?.id ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent 
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden p-0 sm:max-w-5xl" 
        showCloseButton={false}
      >
        <div className="flex max-h-[90vh] flex-col bg-background">
          <div className="flex items-center justify-between border-b px-6 py-2">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle>Editar ambiente</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!environmentId ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un ambiente valido para editarlo.
              </p>
            ) : null}

            {environmentId && finalDefaultValues ? (
              <EnvironmentEditForm
                environmentId={environmentId}
                defaultValues={finalDefaultValues}
                blocks={blockOptions}
                environmentTypes={environmentTypeOptions}
                onSuccess={handleSuccess}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
