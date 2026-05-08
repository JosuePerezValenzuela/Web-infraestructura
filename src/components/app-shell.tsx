"use client";

import type { ReactNode } from "react";
import AppSidebar from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen className="min-h-screen flex-col">
      <TopHeader />

      <div className="flex min-h-0 flex-1">
        <AppSidebar className="top-16 h-[calc(100svh-4rem)]" />

        <SidebarInset className="min-h-0 flex-1">
          <main className="h-[calc(100svh-4rem)] overflow-y-auto px-4 py-6 md:px-6 lg:px-8 xl:px-10">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
