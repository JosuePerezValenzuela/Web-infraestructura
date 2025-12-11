"use client";

import { useState, type JSX } from "react";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notify";

import {
  downloadInventoryReport,
  type InventoryFormat,
  type InventoryScope,
} from "./download";

type Props = {
  scope: InventoryScope;
  scopeId: number | string;
  scopeLabel?: string;
};

export function InventoryReportAction({ scope, scopeId, scopeLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState<InventoryFormat | null>(
    null
  );

  const handleDownload = async (format: InventoryFormat) => {
    setLoadingFormat(format);
    try {
      const { filename } = await downloadInventoryReport({
        scope,
        scopeId,
        format,
      });

      notify.success({
        title: "Reporte descargado",
        description: filename,
      });
      setOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar el reporte.";
      notify.error({
        title: "Descarga fallida",
        description: message,
      });
    } finally {
      setLoadingFormat(null);
    }
  };

  const cards: Array<{
    format: InventoryFormat;
    title: string;
    description: string;
    icon: JSX.Element;
  }> = [
    {
      format: "pdf",
      title: "PDF",
      description: "Documento listo para imprimir o compartir.",
      icon: <FileText className="h-5 w-5" aria-hidden />,
    },
    {
      format: "xlsx",
      title: "Excel",
      description: "Hoja de cálculo para filtrar y pivotear datos.",
      icon: <FileSpreadsheet className="h-5 w-5" aria-hidden />,
    },
  ];

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Descargar reporte de inventario"
        aria-label="Descargar reporte de inventario"
        onClick={() => setOpen(true)}
      >
        <FileDown className="h-4 w-4" aria-hidden />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!loadingFormat) {
            setOpen(value);
          }
        }}
      >
        <DialogContent className="max-w-[540px] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reporte de inventario</DialogTitle>
            <DialogDescription>
              Elige el formato a descargar para {scopeLabel ?? `este ${scope}`}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => {
              const isLoading = loadingFormat === card.format;
              return (
                <Button
                  key={card.format}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start gap-3 p-3 text-left whitespace-normal"
                  disabled={Boolean(loadingFormat)}
                  onClick={() => void handleDownload(card.format)}
                >
                  <span className="rounded-full bg-secondary p-2 text-secondary-foreground">
                    {card.icon}
                  </span>
                  <span className="flex flex-col items-start gap-1">
                    <span className="font-semibold leading-none">
                      {isLoading ? "Generando..." : card.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {card.description}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
