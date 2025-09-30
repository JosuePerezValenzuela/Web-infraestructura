'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';

export type CampusRow = {
    id: number;
    codigo: string;
    nombre: string;
    direccion: string;
    lat: number;
    lng: number;
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
};

export const campusColumns: ColumnDef<CampusRow>[] = [
    { accessorKey: 'codigo', header: 'Código' },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'direccion', header: 'Dirección' },
    {
        id: 'ubicacion',
        header: 'Ubicación',
        accessorFn: (row) => `${row.lat}, ${row.lng}`,
        cell: ({ row }) => {
            const { lat, lng } = row.original;
            const fmt = (n: number) =>
                typeof n === 'number' && Number.isFinite(n) ? n.toFixed(4): '-';
            return (
                <span className="font-mono">
                  {fmt(lat)}, {fmt(lng)}
                </span>
            );
        },
    },
    { accessorKey: 'activo', header: 'Estado', 
        cell: ({ getValue }) =>  (getValue<boolean>() ? 'Activo' : 'Inactivo')
    },
    { 
        accessorKey: 'creado_en', 
        header: 'Creado el',
        accessorFn: (row) => row.creado_en,
        cell: ({ row }) => {
            const iso = row.original.creado_en as string;
            const d = new Date(iso);
            const texto = isNaN(d.getTime()) ? '-' : d.toLocaleString(
                'es-BO', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                }
            );
            return texto;
        }
    },
];