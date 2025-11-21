import type { LucideIcon } from "lucide-react";
import { Building2, Warehouse } from "lucide-react";

export type ClassifierEntry = {
  slug: string;
  title: string;
  description: string;
  href: string;
  icon?: LucideIcon;
};

export const CLASSIFIERS: ClassifierEntry[] = [
  {
    slug: "tipos-bloques",
    title: "Tipos de bloques",
    description: "Gestiona los tipos de bloques utilizados.",
    href: "/dashboard/tipos-bloques/list",
    icon: Building2,
  },
  {
    slug: "tipos-ambientes",
    title: "Tipos de ambientes",
    description: "Organiza los tipos de ambientes que se asignan a cada espacio.",
    href: "/dashboard/tipos-ambientes/list",
    icon: Warehouse,
  },
];
