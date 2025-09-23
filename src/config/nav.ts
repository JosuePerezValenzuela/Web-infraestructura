import type { LucideIcon } from "lucide-react";
import { 
    School, Building2, Landmark, Layers3, DoorOpen, Boxes
} from 'lucide-react'

export type NavItem = { label: string; href?: string }
export type NavGroup = { label: string; icon?: LucideIcon; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
    {
        label: "Campus",
        icon: School,
        items: [
            { label: 'Registrar', href: '/dashboard/campus/new' },
            { label: 'Listar', href: '/dashboard/campus/listar'},
        ],
    },
    {
        label: 'Facultades',
        icon: Landmark,
        items: [
            { label: 'Registrar', href: '/dashboard/facultades/new' },
            { label: 'Listar', href: '/dashboard/facultades/listar'},
        ]
    }
]