"use client";

import Link from "next/link";
import Image from "next/Image";
import { ChevronDown } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { NAV_GROUPS } from "@/config/nav";

export default function AppSidebar() {
  return (
    <Sidebar className="bg-slate-900 text-slate-100">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-3">
          <Image src="/umss-logo.png" alt="UMSS" width={32} height={32} />
          <div className="leading-tight">
            <div className="font-semibold">Universidad Mayor</div>
            <div className="text-slate-300 text-xs">de San Simón</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="px-2">
            <Collapsible defaultOpen>
              <div className="flex items-center justify-between">
                <SidebarGroupLabel className="flex items-center gap-2">
                  {group.icon ? <group.icon className="size-5" /> : null}
                  {group.label}
                </SidebarGroupLabel>
                <CollapsibleTrigger className="text-slate-300 hover:text-white">
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton asChild>
                          <a href={item.href ?? "#"}>{item.label}</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="text-xs text-slate-400 px-3 py-3">
        © UMSS
      </SidebarFooter>
    </Sidebar>
  );
}
