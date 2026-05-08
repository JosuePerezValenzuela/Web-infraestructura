"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose, User } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { NAV_GROUPS, NAV_GROUPS_CLASIFICATORS } from "@/config/nav";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const navMatch = NAV_GROUPS.find((item) => pathname.startsWith(item.href));
  if (navMatch) {
    return [{ name: navMatch.label, href: navMatch.href }];
  }

  for (const group of NAV_GROUPS_CLASIFICATORS) {
    const nested = group.content.find((item) => pathname.startsWith(item.href));
    if (nested) {
      return [
        { name: group.label, href: group.content[0]?.href },
        { name: nested.label, href: nested.href },
      ];
    }
  }

  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return [];
  }

  const crumbs: BreadcrumbItem[] = [];
  let cumulative = "";

  segments.forEach((segment) => {
    cumulative += `/${segment}`;
    if (segment === "dashboard") {
      return;
    }

    crumbs.push({ name: toTitleCase(segment), href: cumulative });
  });

  return crumbs;
}

export function TopHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const { open, toggleSidebar } = useSidebar();
  const breadcrumbs = resolveBreadcrumbs(pathname);
  const currentSection = breadcrumbs[breadcrumbs.length - 1]?.name ?? "Infraestructura";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 border-b border-border bg-background/85 shadow-sm backdrop-blur-md",
        className
      )}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            aria-label={open ? "Contraer barra lateral" : "Expandir barra lateral"}
          >
            {open ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>

          <div className="hidden md:block">
            <p className="text-sm font-semibold tracking-tight text-primary">
              Sistema de Infraestructura UMSS
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2 border-l border-border pl-4 text-sm text-muted-foreground">
            <Link href="/dashboard/ambientes/list" className="transition-colors hover:text-primary">
              Inicio
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.name}-${index}`} className="flex items-center gap-2">
                <span className="text-muted-foreground/50">/</span>
                {crumb.href && index < breadcrumbs.length - 1 ? (
                  <Link href={crumb.href} className="transition-colors hover:text-primary">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{crumb.name}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="lg:hidden text-sm font-medium text-foreground">{currentSection}</div>

          <div className="ml-1 flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2 py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-xs font-medium text-foreground">Infraestructura</p>
              <p className="text-[11px] text-muted-foreground">UMSS</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
