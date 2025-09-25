"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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

export default function AppSidebar() {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-primary text-primary-foreground">
      <SidebarHeader className="bg-sidebar-primary text-primary-foreground">
        <div className="flex items-center gap-3 px-4 py-4">
          <Image src="/logo_UMSS.png" alt="UMSS" width={36} height={36}/>
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
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <span className="flex items-center gap-2">
                      {Icon ? <Icon className="size-5" /> : null}
                      <span>{group.label}</span>
                    </span>
                    <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-1">
                  <SidebarGroupContent className="pl-6">
                    <SidebarMenu className="space-y-1">
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton asChild>
                            <Link href={item.href ?? "#"}>{item.label}</Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
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
