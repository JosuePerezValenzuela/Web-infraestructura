'use client'

import Link from "next/link";
import { GraduationCap, Building2, Landmark } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import Image from 'next/Image'

export default function AppSidebar() {
    return (
        <Sidebar>

            <SidebarHeader className="border-b">
              <div className="flex items-center gap-3 px-3 py-2">
                <Image
                  src='/logo_UMSS.png'
                  alt="UMSS"
                  width={28}
                  height={28}
                  priority
                />

                {/* Ocular el texto cuando el sidebar esta colapsado */}
                <div className="leading-tight group-data-[collapsible=icon]:hidden">
                    <div className="font-semibold">
                        <p>Universidad Mayor</p>
                        <p>de San Simón</p>
                    </div>
                </div>
              </div>

              {/* Subtitulo del menu*/}
              <div className="px-3 pb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
                Menu de navegación
              </div>

            </SidebarHeader>

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