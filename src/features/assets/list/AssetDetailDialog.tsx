import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type GoodsAsset = {
  nia: number | string;
  descripcion?: string | null;
  descripcionExt?: string | null;
  estado?: string | null;
  marca?: string | null;
  unidadMedida?: string | null;
  valorInicial?: number | null;
  modelo?: string | null;
  serie?: string | null;
  fechaCompra?: string | null;
  fechaIncorporacion?: string | null;
};

type Props = {
  open: boolean;
  asset: GoodsAsset | null;
  onClose: () => void;
};

export function AssetDetailDialog({ open, asset, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalle del activo</DialogTitle>
        </DialogHeader>

        {asset ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField label="NIA" value={String(asset.nia ?? "-")} />
              <DetailField label="Estado" value={asset.estado ?? "-"} />
              <DetailField label="Marca" value={asset.marca ?? "-"} />
              <DetailField label="Modelo" value={asset.modelo ?? "-"} />
              <DetailField label="Serie" value={asset.serie ?? "-"} />
              <DetailField
                label="Unidad de medida"
                value={asset.unidadMedida ?? "-"}
              />
              <DetailField
                label="Valor inicial"
                value={
                  typeof asset.valorInicial === "number"
                    ? asset.valorInicial.toLocaleString("es-BO", {
                        style: "currency",
                        currency: "BOB",
                      })
                    : "-"
                }
              />
              <DetailField
                label="Fecha de compra"
                value={formatDate(asset.fechaCompra)}
              />
              <DetailField
                label="Fecha de incorporación"
                value={formatDate(asset.fechaIncorporacion)}
              />
            </div>

            <DetailField label="Descripción" value={asset.descripcion ?? "-"} />
            <DetailField
              label="Descripción extendida"
              value={asset.descripcionExt ?? "-"}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecciona un activo para ver el detalle.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type DetailFieldProps = {
  label: string;
  value: string;
};

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
        {value || "-"}
      </p>
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-BO");
}
