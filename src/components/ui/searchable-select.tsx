"use client";

import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type SearchableSelectOption = {
  /** Valor que se envia al cambiar (string para mantener consistencia con URL params). */
  value: string;
  /** Texto visible en la opcion. */
  label: string;
};

export interface SearchableSelectProps {
  /** ID unico para el select (required para accessibilidad). */
  id: string;
  /** Label visible sobre el campo. */
  label: string;
  /** Placeholder del input de busqueda. */
  searchPlaceholder?: string;
  /** Texto cuando no hay resultados. */
  emptyLabel?: string;
  /** Label para la opcion "todos" (vacia). */
  allLabel?: string;
  /** Valor actual seleccionado. */
  value: string;
  /** Callback cuando cambia la seleccion. */
  onChange: (value: string) => void;
  /** Opciones disponibles para seleccionar. */
  options: SearchableSelectOption[];
  /** Texto del placeholder visible en el trigger cuando no hay seleccion. */
  placeholder?: string;
  /** Cuando esta cargando, deshabilita el select. */
  loading?: boolean;
  /** Clase CSS adicional para el wrapper. */
  className?: string;
  /** Cuando hay opciones agrupadas,define el label del grupo. */
  groupLabel?: string;
}

/**
 * Combobox/SearchableSelect usando Radix Select para maxima accesibilidad.
 * 
 * Caracteristicas:
 * - Keyboard navigation completa (Radix)
 * - Busca/filtrar opciones mientras escribis
 * - Responsive (se adapta al contenedor)
 * - Opcion "todos" (valor vacio) para resetear filtros
 * 
 * @example
 * ```tsx
 * <SearchableSelect
 *   id="faculty-filter"
 *   label="Facultad"
 *   placeholder="Selecciona una facultad"
 *   searchPlaceholder="Buscar facultades..."
 *   emptyLabel="Sin resultados"
 *   allLabel="Todas"
 *   value={filters.facultadId}
 *   onChange={(value) => setFilters(f => ({ ...f, facultadId: value }))}
 *   options={facultyOptions}
 * />
 * ```
 */
export function SearchableSelect({
  id,
  label,
  searchPlaceholder = "Buscar...",
  emptyLabel = "Sin resultados",
  allLabel = "Todos",
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  loading = false,
  className,
  groupLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Enfoque el input cuando abre el dropdown
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      // Small delay para que.renderice el contenido
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Busca opciones que contengan el termino de busqueda (case-insensitive)
  const filteredOptions = React.useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) {
      return options;
    }
    return options.filter((opt) => opt.label.toLowerCase().includes(term));
  }, [options, search]);

  // Encuentra la opcion seleccionada para mostrar en el trigger
  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Limpia la busqueda cuando cierra el dropdown
  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setSearch("");
      }
    },
    []
  );

  // Maneja la seleccion de una opcion
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      // "__all__" es la opcion "todos" - la convertimos a string vacio para consistencia
      onChange(newValue === "__all__" ? "" : newValue);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const labelId = `${id}-label`;
  const groupId = `${id}-group`;

  return (
    <div className={cn("space-y-2", className)}>
      <label
        id={labelId}
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>

      <Select
        open={open}
        onOpenChange={handleOpenChange}
        value={value || "__all__"} // Usamos "__all__" cuando value esta vacio
        onValueChange={handleValueChange}
        disabled={loading}
      >
        <SelectTrigger
          id={id}
          className="w-full justify-between"
          aria-labelledby={`${labelId} ${id}`}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption ? selectedOption.label : allLabel}
          </SelectValue>
        </SelectTrigger>

        <SelectContent position="popper" ref={containerRef}>
          {/* Input de busqueda - siempre visible */}
          <div className="p-2">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Previene que el teclado cierre el dropdown
                  e.stopPropagation();
                }}
                className="pl-8 pr-8"
              />
              {/* Boton para limpiar busqueda */}
              {search && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Limpiar busqueda"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Grupo de opciones */}
          <SelectGroup>
            {groupLabel && (
              <SelectLabel id={groupId}>{groupLabel}</SelectLabel>
            )}

            {/* Opcion "todos" (resetear filtro) - siempre primera */}
            <SelectItem value="__all__">{allLabel}</SelectItem>

            {/* Item seleccionado actual - mostrado prominentemente */}
            {value && value !== "__all__" && selectedOption && (
              <SelectItem value={selectedOption.value}>
                <div className="flex items-center gap-2 pr-4">
                  <span className="text-primary font-semibold">✓</span>
                  <span className="font-medium">{selectedOption.label}</span>
                </div>
              </SelectItem>
            )}

            {/* Opciones filtradas (excluyendo la ya seleccionada) */}
            {loading ? (
              <SelectItem value="__loading__" disabled className="text-muted-foreground">
                Cargando opciones...
              </SelectItem>
            ) : filteredOptions.length > 0 ? (
              filteredOptions
                .filter((option) => option.value !== value) // Excluir el ya seleccionado
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
            ) : (
              <div className="p-2 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </div>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Hidden input para form submission si es necesario */}
      <input type="hidden" name={id} value={value} />
    </div>
  );
}