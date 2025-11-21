import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { CLASSIFIERS } from "@/config/classifiers";

type Insight =
  | {
      type: "count";
      label: string;
      valueSuffix?: string;
      description: string;
    }
  | {
      label: string;
      value: string;
      description: string;
      type?: "text";
    };

const strategyInsights: Insight[] = [
  {
    type: "count",
    label: "Catalogos activos",
    valueSuffix: "",
    description: "Listos para alimentar formularios y tablas.",
  },
  {
    label: "Cobertura del dominio",
    value: "Bloques y ambientes",
    description: "Clasificaciones esenciales para infraestructura.",
  },
  {
    label: "Tiempo estimado",
    value: "~2 min",
    description: "Para revisar y sincronizar cada catalogo.",
  },
];

export default function ClassifiersPage() {
  const classifierCount = CLASSIFIERS.length;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-8 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Catalogos consistentes
            </Badge>
            <Badge variant="outline">
              {classifierCount} {classifierCount === 1 ? "catalogo" : "catalogos"}
            </Badge>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Clasificadores para mantener los datos ordenados
            </h1>
            <p className="text-base text-muted-foreground">
              Actualiza los catalogos maestros antes de registrar nuevos campus,
              bloques o ambientes. Asi aseguramos formularios predecibles y un
              inventario alineado con el dominio de infraestructura.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {strategyInsights.map((insight) => (
            <div
              key={insight.label}
              className="rounded-2xl border border-white/20 bg-white/60 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                {insight.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {insight.type === "count"
                  ? `${classifierCount}${
                      insight.valueSuffix ? ` ${insight.valueSuffix}` : ""
                    }`
                  : insight.value}
              </p>
              <p className="mt-1">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Catalogos disponibles
        </h2>
        <p className="text-sm text-muted-foreground">
          Escoge el catalogo que necesitas editar.
        </p>
      </div>

      <div id="catalogos" className="grid gap-5 sm:grid-cols-2">
        {CLASSIFIERS.map((classifier) => {
          const Icon = classifier.icon;
          return (
            <Link
              key={classifier.slug}
              href={classifier.href}
              aria-label={classifier.title}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="relative h-full overflow-hidden border border-border/70 bg-card/80 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg">
                <CardHeader className="flex flex-row items-start gap-4">
                  {Icon ? (
                    <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  ) : null}
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {classifier.title}
                    </CardTitle>
                    <CardDescription>{classifier.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardFooter className="flex items-center justify-between text-sm font-medium text-primary">
                  <span>Gestionar {classifier.title.toLowerCase()}</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </CardFooter>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
