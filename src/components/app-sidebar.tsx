'use client';

import { useState } from "react";
import { Layers, School, Building2, DoorClosed, 
    Package, Landmark, ChevronDown, ChevronRight
 } from "lucide-react";

export function AppSidebar() {
    return (
        <aside
          className="w-64 min-h-screen bg-slate-900 text-slate-100 p-4"
        >
          <div className="font-semibold">Menu de navegación</div>
        </aside>
    );
}