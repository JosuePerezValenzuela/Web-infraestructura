'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import {
    campusCreateSchema,
    type CampusCreateInput,
} from '@/features/campus/schema';
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { any } from "zod";

const MapPicker = dynamic(() => import('@/features/campus/MapPicker'), { ssr: false });

export default function CampusCreatePage() {
    const form = useForm<CampusCreateInput>({
        resolver: zodResolver(campusCreateSchema),
        mode: 'onTouched',
        defaultValues: {
            nombre: '',
            direccion: '',
            lat: -17.3939,
            lng: -66.1570,
        },
    });

    const [submitting, setSubmitting] = useState(false);

    async function onSumbit(values: CampusCreateInput) {
        try {
            setSubmitting(true);
            
            await apiFetch('/campus', {
                method: 'POST',
                json: values,
            });

            toast.success('campus creado', {
                description: 'Se registor correctamente.',
            });

            form.reset({
                nombre: '',
                direccion: '',
                lat: -17.3939,
                lng: -66.1570,
            });
        } catch (err: any) {
            const details = Array.isArray(err?.details) ? err.details : undefined;
            toast.error('Error al crear el campus',{
                description: details?.join('\n') ?? err?.message ?? 'Error desconocido.',
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-semibold">Registrar campus</h1>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSumbit)} className='space-y-4'>
                    <FormField
                        control={form.control}
                        name='nombre'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                    <Input placeholder="Campus Central" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='direccion'
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="Av Sucre entre Belzu y Oquendo" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Lat/Lng visibles y editables para control fino */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="lat"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Latitud</FormLabel>
                                    <FormControl>
                                        <Input type="number" step='any' {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="lng"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Longitud</FormLabel>
                                    <FormControl>
                                        <Input type="number" step='any' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Mapa: Al hacer click debemos actualizar el lat y lng del form */}
                    <MapPicker
                        lat={form.watch('lat')}
                        lng={form.watch('lng')}
                        onChange={(pos) => {
                            form.setValue('lat', pos.lat, { shouldValidate: true });
                            form.setValue('lng', pos.lng, { shouldValidate: true });
                        }}
                    />

                    <Button type="submit" disabled={submitting} className="mt-2">
                        {submitting ? 'Guardando...' : 'Guardar'}
                    </Button>
                    </form>
            </Form>
        </div>
    );
}