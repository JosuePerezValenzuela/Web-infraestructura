'use client'

import Link from "next/link";
import { GraduationCap, Building2, Landmark } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

export default function AppSidebar() {
    return (
        <Sidebar>
            <SidebarContent>
                
                {/*Seccion Campus */}
                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center gap-2">
                        <GraduationCap className="size-4" />
                        Campus
                    </SidebarGroupLabel>

                    <SidebarGroupContent>
                        <SidebarMenu>

                            
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="#campus-registrar">Registrar</Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="#campus-listar">Listar</Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/*Seccion Facultades */}
                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center gap-2">
                        <Building2 className="size-4" />
                        Facultades
                    </SidebarGroupLabel>

                    <SidebarGroupContent>
                        <SidebarMenu>

                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href="#facultades - registrar">Registrar</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href='#facultades - listar'>Listar</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        </SidebarMenu>
                    </SidebarGroupContent>

                </SidebarGroup>

            </SidebarContent>
        </Sidebar>
    );
}