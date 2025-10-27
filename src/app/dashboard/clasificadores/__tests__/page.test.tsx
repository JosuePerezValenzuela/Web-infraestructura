import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Definimos un catalogo ficticio de clasificadores que la pagina debera mostrar.
const classifierEntries = vi.hoisted(() => [
  // Cada objeto representa una tarjeta con informacion de navegacion hacia un listado concreto.
  {
    // slug sirve como identificador interno que reutilizaremos para claves de React.
    slug: "tipos-bloques",
    // title es el encabezado visible dentro de la tarjeta.
    title: "Tipos de bloques",
    // description explica brevemente la accion para personas sin contexto tecnico.
    description: "Gestiona el catalogo de tipos de bloques disponibles en la institucion.",
    // href indica a que ruta debe llevar la tarjeta al ser activada.
    href: "/dashboard/tipos-bloques/list",
  },
  {
    slug: "tipos-ambientes",
    title: "Tipos de ambientes",
    description: "Administra los tipos de ambientes que se emplean para clasificar espacios.",
    href: "/dashboard/tipos-ambientes/list",
  },
]);

// Creamos un mock virtual del modulo de configuracion para suministrar el catalogo controlado en las pruebas.
vi.mock(
  "@/config/classifiers",
  () => ({
    // Exponemos la constante CLASSIFIERS como lo hara el modulo real.
    CLASSIFIERS: classifierEntries,
  }),
);

// Importamos la pagina de clasificadores que deseamos probar.
import ClassifiersPage from "../page";

// Agrupamos los casos de prueba asociados a la vista global de clasificadores.
describe("ClassifiersPage", () => {
  // Limpiaremos los mocks despues de cada escenario para evitar interferencias entre pruebas.
  afterEach(() => {
    // Reiniciamos cualquier mock registrado por las pruebas anteriores.
    vi.clearAllMocks();
  });

  it("muestra el encabezado general y una tarjeta por cada clasificador disponible", async () => {
    // Renderizamos la pagina dentro del entorno de pruebas.
    render(<ClassifiersPage />);

    // Verificamos que el encabezado principal sea visible para orientar a la persona usuaria.
    expect(
      screen.getByRole("heading", { level: 1, name: /clasificadores/i })
    ).toBeInTheDocument();

    // Recorremos cada entrada simulada para confirmar que la tarjeta se muestre en pantalla.
    for (const entry of classifierEntries) {
      // Validamos que el titulo del clasificador sea visible exactamente una vez.
      expect(screen.getByText(entry.title)).toBeInTheDocument();

      // Comprobamos que la descripcion educativa tambien sea accesible para apoyar la comprension.
      expect(screen.getByText(entry.description)).toBeInTheDocument();
    }
  });

  it("ofrece enlaces navegables que apuntan a cada ruta de clasificador", async () => {
    // Creamos un usuario virtual para navegar usando el teclado.
    const user = userEvent.setup();

    // Renderizamos la vista a evaluar.
    render(<ClassifiersPage />);

    // Recorremos las tarjetas y confirmamos que cada una posee un enlace correcto.
    for (const entry of classifierEntries) {
      // Buscamos el enlace que contiene el titulo del clasificador actual.
      const link = screen.getByRole("link", { name: entry.title });

      // Comprobamos que el enlace apunte a la ruta esperada.
      expect(link).toHaveAttribute("href", entry.href);

      // Enfocamos el enlace con el teclado para asegurar que la navegacion es accesible.
      await user.tab();

      // Confirmamos que el enfoque haya quedado sobre el enlace para garantizar accesibilidad.
      expect(link).toHaveFocus();
    }
  });
});
