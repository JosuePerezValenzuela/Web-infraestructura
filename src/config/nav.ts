import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Layers3,
  Layers2,
  House,
  ToolCase,
  Shapes,
} from "lucide-react";
import { CLASSIFIERS } from "./classifiers";

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
    },
    {
        label: 'Clasificadores',
        icon: Shapes,
        href: `/dashboard/clasificadores`
    }
]

export type NavGroupWithContentIntern = { label: string; href: string }
export type NavGroupWithContent = { label: string; icon?: LucideIcon; content: NavGroupWithContentIntern[] }

export const NAV_GROUPS_CLASIFICATORS: NavGroupWithContent[] = [
    {
        label: 'Clasificadores',
        icon: Shapes,
        content: CLASSIFIERS.map((classifier) => ({
            label: classifier.title,
            href: classifier.href,
        }))
    }

]
