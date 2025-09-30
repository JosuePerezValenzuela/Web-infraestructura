import type { LucideIcon } from "lucide-react";
import { 
    School, Building2, Landmark, Layers3, DoorOpen, Boxes,
    Layers2
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
    }
]