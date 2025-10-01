import type { LucideIcon } from "lucide-react";
import { 
    Building2, Layers3, Layers2,
    House,
    ToolCase,
    Shapes
} from 'lucide-react'

export type NavGroup = { label: string; icon?: LucideIcon; href: string }

export const NAV_GROUPS: NavGroup[] = [
    {
        label: "Campus",
        icon: Layers3,
        href: `/dashboard/campus/list`,
    },
    {
        label: 'Facultades',
        icon: Layers2,
        href: `/dashboard/facultades/list`    
    },
    {
        label: 'Bloques',
        icon: Building2,
        href: `/dashboard/bloques/list`
    },
    {
        label: 'Ambientes',
        icon: House,
        href: `/dashboard/ambientes/list`
    },
    {
        label: 'Activos',
        icon: ToolCase,
        href: `/dashboard/activos/list`
    }
]

export type NavGroupWithContentIntern = { label: string; href: string }
export type NavGroupWithContent = { label: string; icon?: LucideIcon; content: NavGroupWithContentIntern[] }

export const NAV_GROUPS_CLASIFICATORS: NavGroupWithContent[] = [
    {
        label: 'Clasificadores',
        icon: Shapes,
        content: [
            { label: 'Tipo de bloques', href: '/dashboard/bloques/list' },
            { label: 'Tipos de ambientes', href: '/dashboard/ambientes/list' },
            { label: 'Tipos de activos', href: '/dashboard/activos/list' },
        ]
    }
    
]