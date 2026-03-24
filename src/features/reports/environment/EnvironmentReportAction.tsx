"use client";

import { useState, type JSX } from "react";
import { FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";

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
  downloadEnvironmentReport,
  type EnvironmentReportFormat,
} from "./download";

type Props = {
  code: string;
  name?: string;
  showLabel?: boolean;
};

export function EnvironmentReportAction({ code, name, showLabel = false }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<EnvironmentReportFormat | null>(null);

  const handleDownload = async (format: EnvironmentReportFormat) => {
    setLoading(format);
    try {
      const { filename } = await downloadEnvironmentReport({ code, format });
      notify.success({
        title: "Reporte descargado",
        description: filename,
      });
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar el reporte.";
      notify.error({
        title: "Descarga fallida",
        description: message,
      });
    } finally {
      setLoading(null);
    }
  };

  const cards: Array<{
    format: EnvironmentReportFormat;
    title: string;
    description: string;
    icon: JSX.Element;
  }> = [
    {
      format: "pdf",
      title: "PDF",
      description: "Para compartir o imprimir rápidamente.",
      icon: <FileText className="h-5 w-5" aria-hidden />,
    },
    {
      format: "excel",
      title: "Excel",
      description: "Para editar, filtrar y anexar a informes.",
      icon: <FileSpreadsheet className="h-5 w-5" aria-hidden />,
    },
  ];

  return (
    <>
      {showLabel ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          style={{ backgroundColor: "oklch(0.147 0.004 49.25)", color: "white" }}
        >
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Descargar reporte del ambiente"
          aria-label="Descargar reporte del ambiente"
          onClick={() => setOpen(true)}
        >
          <FileDown className="h-4 w-4" aria-hidden />
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!loading) {
            setOpen(value);
          }
        }}
      >
        <DialogContent className="max-w-[540px] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reporte del ambiente</DialogTitle>
            <DialogDescription>
              Elige el formato para {name ?? code}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => {
              const isLoading = loading === card.format;
              return (
                <Button
                  key={card.format}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start gap-3 p-3 text-left whitespace-normal"
                  disabled={Boolean(loading)}
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
