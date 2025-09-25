import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import "leaflet/dist/leaflet.css";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infraestructura",
  description: "UMSS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <SidebarProvider className="min-h-screen">
          <AppSidebar />

          <SidebarInset className="min-h-screen">
            <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-primary-foreground px-4 shadow-sm sm:px-6">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold">Menu de navegacion</h1>
            </header>
            <main className="p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>

        {/* Sonner toaster global */}
        <Toaster richColors position="top-right" closeButton expand />
      </body>
    </html>
  );
}
