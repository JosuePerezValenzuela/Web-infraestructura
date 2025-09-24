"use client";

import Image from "next/Image";
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
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/config/nav";

export default function AppSidebar() {
  return (
    <Sidebar className=" relative z-[1000] bg-slate-900 text-slate-100">
      {/* Header del sidebar */}
      <SidebarHeader className="bg-slate-900 text-slate-100">
        <div className="flex items-center gap-3 px-3 py-3">
          <Image src="/logo_UMSS.png" alt="UMSS" width={32} height={32} />
          <div className="leading-tight">
            <div className="font-semibold">
              <p>Universidad Mayor</p>
              <p>de San Simón</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Contenido del sidebar */}
      <SidebarContent className='bg-slate-900 text-slate-100'>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="px-4">
            <Collapsible defaultOpen>
              {/* 👉 Todo este botón es el trigger */}
              <CollapsibleTrigger asChild>
                <button
                  className="
                    group w-full flex items-center justify-between
                    px-3 py-2 rounded-lg
                    hover:bg-accent/50
                    focus:outline-none focus:ring-2 focus:ring-ring
                    "
                >
                  <span className="flex items-center gap-2">
                    {group.icon ? <group.icon className="size-5" /> : null}
                    <span className="text-lg">{group.label}</span>
                  </span>

                  <ChevronDown
                    className="
                      size-4 transition-transform duration-200
                      group-data-[state=open]:rotate-180
                      "
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2">
                <SidebarGroupContent className="pl-6">
                  <SidebarMenu className="space-y-1">
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

      {/* Footer del sidebar */}
      <SidebarFooter className=" bg-slate-900 text-slate-100 text-xs px-3 py-3">
        © UMSS
      </SidebarFooter>
    </Sidebar>
  );
}
