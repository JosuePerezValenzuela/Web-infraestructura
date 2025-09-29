"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    campusCreateSchema,
    type CampusCreateInput,
} from "@/features/campus/schema";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { z } from 'zod';
import { Textarea } from "@/components/ui/textarea";

type CampusCreateIn = z.input<typeof campusCreateSchema>;
type CampusCreateOut = z.input<typeof campusCreateSchema>;

const INITIAL_POS = { lat: -17.3939, lng: -66.1570 }

const MapPicker = dynamic(() => import("@/features/campus/MapPicker"), {
    ssr: false,
});

type Props = {
    submitLabel?: string;
    onSubmitSuccess?: () => void;
    initialValues?: Partial<CampusCreateInput>;
}

export default function CampusForm({
    submitLabel = 'Guardar',
    onSubmitSuccess,
    initialValues,
}: Props) {
    const form = useForm<CampusCreateIn>({
        resolver: zodResolver(campusCreateSchema),
        mode: "onTouched",
        defaultValues: {
            codigo: "",
            nombre: "",
            direccion: "",
            lat: INITIAL_POS.lat,
            lng: INITIAL_POS.lng,
            ...initialValues,
        },
    });

    const [submitting, setSubmitting] = useState(false);

    async function onSumbit(values: CampusCreateIn) {
        const data: CampusCreateOut = campusCreateSchema.parse(values);
        try {
            setSubmitting(true);

            const res = await apiFetch("/campus", {
                method: "POST",
                json: values,
            });

            toast.success("Campus creado", {
                description: "Se registro correctamente.",
            });

            form.reset({
                codigo: "",
                nombre: "",
                direccion: "",
                lat: -17.3939,
                lng: -66.157,
            });
            onSubmitSuccess?.();
        } catch (err: any) {
            const details = Array.isArray(err?.details) ? err.details : undefined;
            toast.error("Error al crear el campus", {
                description:
                    details?.join("\n") ?? err?.message ?? "Error desconocido.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSumbit)} className="space-y-4">
                {/* Codigo */}
                <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Codigo</FormLabel>
                            <FormControl><Input placeholder="123456789" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* Nombre */}
                <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl><Input placeholder="Campus Central" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* Dirección */}
                <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                                <Textarea
                                    rows={2}
                                    placeholder="Av Sucre entre Belzu y Oquendo"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="h-64 rounded-md overflow-hidden">
                    <MapPicker
                        lat={Number(form.watch('lat'))}
                        lng={Number(form.watch('lng'))}
                        onChange={(pos) => {
                            form.setValue('lat', pos.lat, { shouldValidate: true });
                            form.setValue('lng', pos.lng, { shouldValidate: true });
                        }}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Guardando…' : submitLabel}
                    </Button>
                </div>
            </form>
        </Form>
    );
}