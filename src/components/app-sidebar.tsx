'use client';

import { useState } from "react";
import { Layers, School, Building2, DoorClosed, 
    Package, Landmark, ChevronDown, ChevronRight, PlusCircle,
    List
 } from "lucide-react";

export function AppSidebar() {
    return (
        <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 p-4">
            <div className="mb-6 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-700" />
                <div>
                    <div className="text-xs text-slate-300 leading-none"> Universidad Mayor de San Simón</div>
                </div>
            </div>

            <div className="font-semibold">Menu de navegación</div>

            <nav className="space-y-3">
                <div className="px-2 test-xs uppercase tracking-wider text-slate-400">
                    <List className="h-4 w-4" />
                    Campus
                </div>

                <div className="space-y-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-800 text left"
                    >
                        <span>Campus</span>
                    </button>

                    <button
                      type="button"
                      className="w-full flex item-center gap-2 px-2 py-2 rounded-md hover:bg-slate-800 text-left"
                    >
                        <span>Listar</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}