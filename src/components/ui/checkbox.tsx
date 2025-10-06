'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>((props, ref) => {
  // Reenviamos la referencia para que los formularios puedan enfocar el elemento nativo cuando lo necesiten.
  const { className, ...rest } = props;

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      // Unimos las clases base con las que entregue el consumidor para mantener estilos coherentes.
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-input shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...rest}
    >
      {/* Dibujamos el icono de check solo cuando el estado es "checked". */}
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3 w-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
