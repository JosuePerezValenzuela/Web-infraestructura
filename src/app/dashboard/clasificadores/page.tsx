import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { CLASSIFIERS } from "@/config/classifiers";

export default function ClassifiersPage() {
  // Renderizamos un contenedor principal para mantener el contenido centrado y con separacion vertical.
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Clasificadores</h1>
        <p className="text-muted-foreground text-sm">
          Desde aqui puedes ingresar a cada catalogo de clasificadores para mantenerlos actualizados.
        </p>
      </header>

      {/* Construimos una cuadrícula que adapta la cantidad de columnas al tamaño de pantalla. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CLASSIFIERS.map((classifier) => {
          const Icon = classifier.icon;
          return (
            <Link
              key={classifier.slug}
              href={classifier.href}
              aria-label={classifier.title}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Usamos el componente Card para mantener consistencia visual con el resto del sistema de diseño. */}
              <Card className="h-full transition-transform duration-150 group-hover:-translate-y-1 group-hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {Icon ? (
                      <span className="rounded-full bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                    ) : null}
                    <CardTitle className="text-lg">{classifier.title}</CardTitle>
                  </div>
                </CardHeader>

                <CardContent>
                  <CardDescription>{classifier.description}</CardDescription>
                </CardContent>

                <CardFooter>
                  <span className="text-sm font-medium text-primary">
                    Gestionar
                  </span>
                </CardFooter>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
