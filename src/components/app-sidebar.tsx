"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_GROUPS } from "@/config/nav";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [logoError, setLogoError] = useState(false);

  return (
    <Sidebar
      collapsible="icon"
      className={cn("border-r border-border bg-sidebar text-sidebar-foreground", className)}
    >
      <SidebarHeader className="border-b border-border/80 bg-sidebar px-3 py-4 text-sidebar-foreground">
        <div className={cn("flex items-center gap-2.5", collapsed ? "justify-center px-1" : "px-2") }>
          <div className="relative inline-flex shrink-0 items-center justify-center">
            {logoError ? (
              <span className="text-xs font-semibold text-primary">
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
          {!collapsed ? (
            <div className="leading-tight">
              <p className="text-xl font-black tracking-[0.22em] text-primary">UMSS</p>
            </div>
          ) : null}
        </div>
      </SidebarHeader>

<SidebarContent className="flex-1 overflow-y-auto bg-sidebar px-2 py-4 text-sidebar-foreground">
        <div className={cn("mt-3 flex flex-col", collapsed ? "px-1" : "px-2")}>
          {NAV_GROUPS.map((group) => {
            const Icon = group.icon;
            const isActive = pathname.startsWith(group.href);

            return (
              <SidebarGroup key={group.label} className="px-0">
                <SidebarGroupLabel className="sr-only">{group.label}</SidebarGroupLabel>
                <Link
                  href={group.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring",
                    isActive
                      ? "border-l-4 border-primary bg-muted text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-primary",
                    collapsed ? "justify-center px-2 py-3.5" : "mx-2 px-4 py-3"
                  )}
                >
                  {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                  {!collapsed ? <span className="truncate">{group.label}</span> : null}
                </Link>
              </SidebarGroup>
            );
          })}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/80 bg-sidebar px-3 py-3 text-xs text-muted-foreground">
        {collapsed ? (
          <span className="mx-auto">UMSS</span>
        ) : (
          <div className="px-2">
            <p className="font-medium text-foreground">Infraestructura UMSS</p>
            <p className="text-[11px] text-muted-foreground">Gestión de campus, facultades y bloques</p>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
