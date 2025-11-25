"use client";

import { useCallback, useEffect, useState } from "react";
import { BlockCreateForm } from "@/features/blocks/BlockCreateForm";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type CatalogApiItem = {
  id: number;
  nombre?: string | null;
  nombre_corto?: string | null;
  descripcion?: string | null;
  codigo?: string | null;
};

type CatalogResponse = {
  items: CatalogApiItem[];
};

type CatalogOption = {
  id: number;
  nombre: string;
};

function normalizeCatalog(items: CatalogApiItem[], fallback: string): CatalogOption[] {
  return items
    .map((item) => {
      if (typeof item.id !== "number") {
        return null;
      }

      const label =
        item.nombre ??
        item.nombre_corto ??
        item.descripcion ??
        item.codigo;

      const finalLabel =
        typeof label === "string" && label.trim().length
          ? label.trim()
          : `${fallback} ${item.id}`;

      return {
        id: item.id,
        nombre: finalLabel,
      };
    })
    .filter((option): option is CatalogOption => Boolean(option));
}

export default function BlockCreatePage() {
  const [faculties, setFaculties] = useState<CatalogOption[]>([]);
  const [blockTypes, setBlockTypes] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [facultiesResponse, blockTypesResponse] = await Promise.all([
        apiFetch<CatalogResponse>("/facultades?page=1&limit=200&activo=True"),
        apiFetch<CatalogResponse>("/tipo_bloques?page=1&limit=200&activo=True"),
      ]);

      setFaculties(normalizeCatalog(facultiesResponse.items, "Facultad"));
      setBlockTypes(normalizeCatalog(blockTypesResponse.items, "Tipo"));
    } catch (err) {
      setError("No pudimos cargar los catalogos. Reintenta en unos segundos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Registrar nuevo bloque
        </h1>
      </header>

      <div className="rounded-lg border bg-card p-2 shadow-sm">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando catalogos...</p>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => loadCatalogs()}>Reintentar</Button>
          </div>
        ) : (
          <BlockCreateForm faculties={faculties} blockTypes={blockTypes} />
        )}
      </div>
    </section>
  );
}
