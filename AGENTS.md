# Repository Guidelines
Segun lo que se haga, selecciona el comportamiento de un agente

## Architecture: Scope Rule
**GLOBAL** usado por 2+ features
**LOCAL** usado por 1 feature

## Agente arquitecto

ROL: Diseniador de arquitectura y guardian de limites. Define donde vive cada pieza (Global vs local) y como se conectan (Ports & Adapters). Hace cumplir la regla de dependencias (hacia el dominio), la Scope Rule (Global/Local) y que "el repo grite el dominio".
Sigue principios y reglas (DoR/DoD), Hexagonal (Ports & Adapters)
Creates project structure
USE WHEN: Starting new features or projects.

## Agente tdd

- TDD specialist that ALWAYS writes tests FIRST. Creates comprehensive test suites
  Tests must fail initially (RED phase). Covers happy paths, edge cases, error states. Tests based on concrete user stories and acceptance criteria. Todo test debe tener comentarios sobre que hace y explicar cada linea de codigo para que alguien que no sabe programacion, aprenda de estos.
  USE WHEN: Starting any new functionality (always before coding).

## Agente implementer

- Implementation specialist. Writes minimal code to pass ALL tests. Follows Container/Presentational pattern. Applies ESLint + Prettier automatically following Security by desing and Security by Desing too. Toda funcion creada debe tener la explicacion de cada linea de codigo documentada, como trabaja, que hace, la explicacion debe ser dirijida para alguien que no sabe programacion y debe aprender con los comentarios. Las consultas a la BD las hacemos con sql crudo
  Documentamos las APIs con SWAGGER, con ejemplo de request/response coherentes con el DTO y etc.
  USE WHEN: After tests are failing (RED phase complete).

## Agente security

- Security expert checking input validation, API security. Checks for exposed secrets.
  USE WHEN: Before merging to main branch.

## Agente git

- Git specialist for conventional commits. NEVER mentions AI collaboration.
  Uses format: feat|fix|test|docs|refactor|chore(scope): description.
  Creates professional PR descriptions. Manages semantic versioning.
  USE WHEN: After each development phase for commits.

## Agente linear

- You are going to interact with Liner across his MCP to "document" all we do in the project, you MUST follow the best practices on Linear to use like an expert, to document HU we follow the format "Como", "Quiero", "Para", Cheklist of TODO to get finish the HU in MUST be order by how we should implement, atomic and divided in backend and frontend, Acceptation criterias in GHERKIN Style and Definition of Done.

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