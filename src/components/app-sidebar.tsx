"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { BarChart3, ExternalLink } from "lucide-react";
import { NAV_GROUPS, type NavGroup } from "@/config/nav";
import { useMemo, useState } from "react";
import { env } from "@/lib/env";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export default function AppSidebar() {
  const [logoError, setLogoError] = useState(false);
  const metabaseUrl = useMemo(
    () => (env.METABASE_URL ? env.METABASE_URL.replace(/\/$/, "") : null),
    []
  );

  const navItems: Array<NavGroup & { external?: boolean; disabled?: boolean; tooltip?: string }> =
    useMemo(
      () => [
        ...NAV_GROUPS,
        {
          label: "Análisis detallados",
          icon: BarChart3,
          href: metabaseUrl ?? "#",
          external: true,
          disabled: !metabaseUrl,
          tooltip: metabaseUrl
            ? "Abrir Metabase en una nueva pestaña"
            : "Configura NEXT_PUBLIC_METABASE_URL para habilitar Metabase",
        },
      ],
      [metabaseUrl]
    );

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-primary text-primary-foreground">
      <SidebarHeader className="bg-sidebar-primary text-primary-foreground">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-md">
            {logoError ? (
              <span className="text-xs font-semibold text-primary-foreground">
                UMSS
              </span>
            ) : (
              <Image
                src="/logo_UMSS.png"
                alt="UMSS"
                width={36}
                height={36}
                priority={process.env.NODE_ENV === "production"}
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium uppercase">Universidad Mayor</p>
            <p className="text-sm font-medium uppercase">de San Simon</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto bg-sidebar-primary px-3 pb-6 text-primary-foreground">
        {navItems.map((group) => {
          const Icon = group.icon;
          const content = (
            <span className="flex items-center gap-2">
              {Icon ? <Icon className="size-5" /> : null}
              <span className="truncate">{group.label}</span>
              {group.external ? <ExternalLink className="h-4 w-4 opacity-70" /> : null}
            </span>
          );

          const button = group.disabled ? (
            <button
              type="button"
              disabled
              className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground/80 transition-colors"
            >
              {content}
            </button>
          ) : (
            <Link
              href={group.href}
              target={group.external ? "_blank" : undefined}
              rel={group.external ? "noreferrer" : undefined}
              className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {content}
            </Link>
          );

          const wrapped = group.tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right">{group.tooltip}</TooltipContent>
            </Tooltip>
          ) : (
            button
          );

          return (
            <SidebarGroup key={group.label} className="px-1">
              <SidebarGroupLabel className="sr-only">{group.label}</SidebarGroupLabel>
              {wrapped}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar-primary px-4 py-3 text-xs text-primary-foreground/80">
        (c) UMSS
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
