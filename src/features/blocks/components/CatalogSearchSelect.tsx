"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CatalogOption = {
  id: number;
  nombre: string;
};

type CatalogSearchSelectProps = {
  buttonId: string;
  labelId: string;
  placeholder: string;
  searchPlaceholder: string;
  options: CatalogOption[];
  value: string;
  onChange: (value: string) => void;
};

export default function CatalogSearchSelect({
  buttonId,
  labelId,
  placeholder,
  searchPlaceholder,
  options,
  value,
  onChange,
}: CatalogSearchSelectProps) {
  const [open, setOpen] = useState(false); // Controla si el desplegable está visible.
  const [searchTerm, setSearchTerm] = useState(""); // Texto que se usa para filtrar las opciones.
  const dropdownRef = useRef<HTMLDivElement | null>(null); // Referencia al contenedor de opciones para detectar clicks externos.
  const triggerRef = useRef<HTMLButtonElement | null>(null); // Referencia al botón que abre/cierra el selector.

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase(); // Normalizamos el texto de búsqueda.
    if (!term) {
      return options; // Si no hay búsqueda devolvemos la lista original.
    }
    return options.filter((option) =>
      option.nombre.toLowerCase().includes(term)
    ); // Filtramos por coincidencia simple sin distinguir mayúsculas.
  }, [options, searchTerm]);

  useEffect(() => {
    if (!open) {
      return; // Solo registramos listeners cuando el desplegable está abierto.
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return; // Ignoramos los clicks que ocurren dentro del componente.
      }
      setOpen(false); // Cerramos el selector cuando se hace click fuera.
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false); // Permitimos cerrar el selector con la tecla Escape.
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find(
    (option) => String(option.id) === value
  ); // Identificamos la opción actualmente seleccionada.

  return (
    <div className="relative w-full">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        id={buttonId}
        className="w-full justify-between overflow-hidden"
        aria-labelledby={`${labelId} ${buttonId}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((prev) => !prev); // Alternamos el estado de apertura.
          setSearchTerm(""); // Limpiamos el filtro cada vez que se vuelve a abrir.
        }}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.nombre : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </Button>

      {open ? (
        <div
          ref={dropdownRef}
          className="absolute z-30 mt-2 w-full rounded-md border bg-popover shadow-md"
        >
          <div className="p-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              autoFocus
            />
          </div>

          <ul
            role="listbox"
            aria-labelledby={labelId}
            className="max-h-56 overflow-y-auto px-1 pb-2"
          >
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <li key={option.id} className="p-1">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === String(option.id)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      onChange(String(option.id)); // Propagamos el id seleccionado al formulario padre.
                      setOpen(false); // Cerramos el selector al elegir una opción.
                    }}
                  >
                    {option.nombre}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No se encontraron resultados
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
