import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import 'leaflet/dist/leaflet.css';
import { AppSidebar } from "@/components/app-sidebar";

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
      <body>
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1 bg-slate-50 p-6">{children}</main>
        </div>
        {/* Sonner toaster global */}
        <Toaster richColors position="top-right" closeButton expand />
      </body>
    </html>
  );
}
