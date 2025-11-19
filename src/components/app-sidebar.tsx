"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/config/nav";
import { useState } from "react";

export default function AppSidebar() {
  const [logoError, setLogoError] = useState(false);

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
        {NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <SidebarGroup key={group.label} className="px-1">
              <SidebarGroupLabel className="sr-only">{group.label}</SidebarGroupLabel>
                  <Link 
                    href={group.href}
                    className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <span className="flex items-center gap-2">
                      {Icon ? <Icon className="size-5" /> : null}
                      <span>{group.label}</span>
                    </span>
                  </Link>
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
