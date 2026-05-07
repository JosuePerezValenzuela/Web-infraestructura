"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MultiSelectChecklistOption = {
  value: string;
  label: string;
  description?: string;
};

type MultiSelectChecklistProps = {
  id: string;
  label: string;
  options: MultiSelectChecklistOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  helperText?: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function MultiSelectChecklist({
  id,
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Selecciona una o más opciones",
  searchPlaceholder = "Buscar...",
  emptyLabel = "No se encontraron opciones.",
  helperText,
  clearLabel = "Limpiar selección",
  disabled = false,
  className,
}: MultiSelectChecklistProps) {
  const [search, setSearch] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);

  const filteredOptions = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [options, search]);

  const selectedOptions = React.useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet]
  );

  const toggleValue = React.useCallback(
    (value: string) => {
      if (disabled) {
        return;
      }

      if (selectedSet.has(value)) {
        onChange(selectedValues.filter((currentValue) => currentValue !== value));
        return;
      }

      onChange([...selectedValues, value]);
    },
    [disabled, onChange, selectedSet, selectedValues]
  );

  return (
    <div className={cn("grid min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]", className)}>
      <div className="flex min-h-0 flex-col rounded-lg border bg-muted/15 p-4">
        <div className="space-y-1">
          <label htmlFor={`${id}-search`} className="text-sm font-medium leading-none">
            {label}
          </label>
          {helperText ? (
            <p className="text-sm text-muted-foreground">{helperText}</p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Badge variant="secondary">{selectedValues.length} seleccionados</Badge>
          {selectedValues.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              disabled={disabled}
              className="h-8 px-2 text-xs"
            >
              {clearLabel}
            </Button>
          ) : null}
        </div>

        <Input
          id={`${id}-search`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled}
          className="mt-3"
        />

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <Badge key={option.value} variant="outline" className="gap-1 pr-1.5">
                  <span>{option.label}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    onClick={() => toggleValue(option.value)}
                    aria-label={`Quitar ${option.label}`}
                    disabled={disabled}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-background px-3 py-2 text-sm text-muted-foreground">
              {placeholder}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 rounded-lg border bg-background">
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="h-full max-h-[340px] divide-y overflow-y-auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isChecked = selectedSet.has(option.value);

              return (
                <li key={option.value} className="px-1 py-0.5 first:pt-1 last:pb-1">
                  <label
                    htmlFor={`${id}-${option.value}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-1.5 text-sm transition hover:bg-accent/50",
                      isChecked && "bg-accent/60"
                    )}
                  >
                    <Checkbox
                      id={`${id}-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleValue(option.value)}
                      disabled={disabled}
                      aria-label={option.label}
                      className="mt-0"
                    />

                    <span className="block font-medium text-foreground">{option.label}</span>
                  </label>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
