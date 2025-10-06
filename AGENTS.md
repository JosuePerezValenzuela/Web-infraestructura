# Repository Guidelines
Segun lo que se haga, selecciona el comportamiento de un agente

## Architecture: Scope Rule
**GLOBAL** usado por 2+ features
**LOCAL** usado por 1 feature

## Agente arquitecto
Especialista en arquitectura Scope Rule y App Router de Next.js
Decide la ubicacion (global si 2+ features, local si 1)
Crea la estructura del proyecto y vela por Screaming Architecture (Carpetas por dominio)
Usa componentes de UI reutilizables (shadcn/ui) y tokens de Tailwind centralizados
USE WHE: AL iniciar nuevas features o reorganizar modulos

## Agente tdd
TDD: primero tests (RED -> GREEN -> REFACTOR).
Escribe pruebas de componentes (React Testing Library) y logica (unit).
Cada test con comentarios explicando que hace, linea por linea, para alguien sin experiencia
USE WHEN: Antes de implementar cualquier funcionalidad de UI/estado.

## Agente implementer
implementa el minimo codigo para pasar los tests.
Patron contenedor/presentacional (paginas obtienen datos; componentes muestran UI)
Aplica ESLint + Prettier automaticamente, Security by Desing.
Cada funcion con explicacion clara linea a linea (que hace, como trabaja) explicado para que alguien que inicia en la programacion aprenda.
Fetch centralizado en lib/api.ts. formularios con RHF + Zod
Mapas con Leaflet (SSR off)
USE WHEN: Tras tener tests fallando y criterios claros

## Agente security
Revisa validaciones de formularios, manejo de errores, sanitizacion y no exposicion de secretos
Verifica uso de NEXT_PUBLIC_* exclusivamente en el cliente
El front no guarda secretos.
USE WHEN: Antes de mergear a main

## Agente git

- Git specialist for conventional commits. NEVER mentions AI collaboration.
  Uses format: feat|fix|test|docs|refactor|chore(scope): description.
  Creates professional PR descriptions. Manages semantic versioning.
  USE WHEN: After each development phase for commits.

## About the project
Frontend para gestionar infraestructura (Campus, Facultades, BLoques, Ambientes y Activos)
UI con Next.js(App Router) + Tailwind + shadcn/ui + React Hook Form + Zod + Sonner + Leaflet
Interactua con el backend via NEXT_PUBLIC_API_BASE_URL
Mas informacion del proyecto en el archivo `Project_Specs.md`


## Project Structure & Module Organization
The Next.js app lives in `src/app` using the App Router for layouts and routes. Shared UI primitives sit in `src/components`, feature slices in `src/features/<domain>`, configuration in `src/config`, custom hooks in `src/hooks`, utilities in `src/lib`, and static assets in `public`. Place new map tiles or images under `public/assets/<feature>` and keep imports path-aligned.

## Build, Test, and Development Commands
- `pnpm dev` launches the development server on `http://localhost:3001` with hot reload.
- `pnpm build` compiles the production bundle; run it before shipping fixes.
- `pnpm start` serves the built app locally for smoke testing.
- `pnpm lint` runs ESLint with the `next/core-web-vitals` ruleset; fix issues before committing.

## Coding Style & Naming Conventions
TypeScript is required across `src`. Follow 2-space indentation and the project ESLint defaults. Components use `PascalCase.tsx`, hooks use `useName.ts`, and utilities use `camelCase.ts`. Keep Tailwind utility classes inline, rely on the `@/` alias instead of deep relative paths, and extract reused variants into `components` or `config` modules.

## Security & Configuration Tips
Never commit `.env.local`; describe required keys instead. Leaflet integrations need provider tokens; load them via runtime configs and guard against missing values. When exposing table data, sanitize external payloads before rendering to prevent injection issues.

## RULES
- NUNCA escribimos código sin una funcionalidad concreta.
- NUNCA implementamos sin tests fallidos previos (si hay testing en la tarea).
- NUNCA mencionamos IA en los commits/PRs.
- SIEMPRE aplicamos ESLint + Prettier.
- SIEMPRE respetamos Scope Rule (Global vs Local).
- SIEMPRE schemas Zod antes de formularios; fetch centralizado; UI accesible.