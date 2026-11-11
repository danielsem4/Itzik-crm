# Itzik CRM

Business management system (CRM). Staff users sign in and manage the business; the app ships **English + Hebrew (RTL)**.

Roles: `SUPER_ADMIN | ADMIN | EMPLOYEE` (no default — role is assigned explicitly at creation). Exactly one active SUPER_ADMIN, created only via the bootstrap CLI. The role→permission contract lives in `server/src/shared/authz/` and is mirrored (UI-only) in `client/src/features/auth/lib/permissions.ts` — keep both in sync.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for what exists today.

## Current state

**Built:** auth + security foundation (password login → opaque server-side session cookie, CSRF synchronizer tokens, per-route rate limiting, append-only audit log, invitation/activation, forgot/reset/change password, SUPER_ADMIN bootstrap CLI), user management (Admins / Employees: invite, list, view, deactivate), audit-log reads (SUPER_ADMIN), client app shell (RTL-aware sidebar layout, theme, i18n), Dashboard placeholder, Settings.

**Not built yet:** business modules (customers, contacts, deals, tasks, invoices, …). No MFA yet — login is password-only; add a second factor as a step between password check and session creation in `AuthService.login`.

## Repo layout

**Two independent projects** (no monorepo root) — each has its own `package.json`, `node_modules`, and `package-lock.json`:
- `client/` — React 19 SPA (Vite 8, Tailwind v4, shadcn/ui, React Router v7).
- `server/` — Express 5 API (Prisma 7 + PostgreSQL).

Both are organized as **feature / vertical slices**. `auth` is the reference slice to copy when adding a new feature.

## Dev commands (run inside `client/` or `server/`, not the repo root)

Run `npm install` once in each directory. Then, in **`client/`**:
- `npm run dev` — Vite dev server on :5173 (proxies `/api` → `:3001`).
- `npm run build` / `npm run preview` — production build / preview.
- `npm run lint` — ESLint (includes module-boundary rules).
- `npm test` — Vitest + Testing Library (co-located `*.test.ts(x)`).

In **`server/`**:
- `npm run dev` — API on :3001 (nodemon). Run alongside the client.
- `npm run db:migrate` — `prisma migrate dev` (migrations in `server/prisma/migrations`).
- `npm run db:generate` — regenerate Prisma client. `npm run db:studio` — Prisma Studio.
- `npm run bootstrap:superadmin` — create the single SUPER_ADMIN (needs `BOOTSTRAP_SUPERADMIN_EMAIL` / `BOOTSTRAP_SUPERADMIN_PASSWORD`).
- `npm run db:seed:dev` — dev-only: one ACTIVE account per role with a shared password (printed).
- `npm test` — Node test runner (`node --test` + `ts-node/register`, files `src/**/*.test.ts`).

Env: `server/.env` (see `server/.env.example`) — `DATABASE_URL`, `CLIENT_URL`, `PORT`, `SMTP_*`. In non-production, emails (invites, reset links) are `console.log`ged, not sent. Production fails to start on missing/unsafe config (`server/src/config/env.ts`).

Note: the init migration adds a raw-SQL partial unique index `one_active_super_admin` that `schema.prisma` cannot express — `prisma migrate dev` may report it as drift; keep it.

## Tech stack — versions are bleeding-edge, verify before assuming

Check current docs (use context7) rather than assuming older behavior:
- **React 19.1**, **Vite 8**, **TypeScript ~6.0**, **Tailwind v4** (CSS-based config, `@tailwindcss/vite`).
- **Express 5.2** (async error handling & routing differ from v4; `req.query` is a getter).
- **Prisma 7.4** — `@prisma/adapter-pg` driver adapter and `prisma.config.ts`. Client output is `server/node_modules/.prisma/client`.
- **Zod 3** (both projects). Client also has: TanStack Query 5, Zustand 5, react-hook-form 7, react-router-dom 7, axios, i18next, sonner.

## Conventions (follow these when adding features)

**Server** (`server/src/`): layered slice per module — `*.routes.ts` → `*.controller.ts` (controller **factory** `createXController(service)`) → `*.service.ts` (business logic, no HTTP/Prisma) → `*.repository.ts` (Prisma, behind an `IXRepository` interface for DI), wired in the module's `index.ts` (`buildXRouter(prisma)`) and mounted in `app.ts`. Validate input with **Zod** (`.strict()`) via `validateRequest`. Throw `AppError` subclasses from `shared/errors`; the central `errorHandler` formats responses. Return DTOs, never raw Prisma models. DB columns are snake_case via `@map`; models `@@map` to plural table names.

**Authorization** is permission-based and deny-by-default: add permissions to `shared/authz/permissions.ts`, grant them in `roles.ts`, update the matrix test `authz.test.ts`, then gate routes with `authenticate` + `requirePermission(...)` (+ `csrf` on every state-changing route). For owned records use the `<THING>_MANAGE` / `<THING>_MANAGE_ANY` pair with `canManageResource`. Audit sensitive mutations via `IAuditLog` (add the action to `AuditAction`). Never log secrets.

**Client** (`client/src/`): **read [`docs/CLIENT_ARCHITECTURE.md`](docs/CLIENT_ARCHITECTURE.md) before adding UI.** In short:
- Feature slice under `features/<name>/` (`api/` + query-key factory, `hooks/`, `components/`, `pages/`, `schemas/`, `types/`, `lib/`) with a public `index.ts` barrel; other code imports a feature **only via its barrel** (ESLint-enforced).
- **Reuse before creating:** check `components/shared` and `components/ui` (shadcn) first.
- Server state via **TanStack Query**, global UI state via **Zustand**. Forms: react-hook-form + zod schema factories taking `t`.
- Colors/radius via design tokens only; logical (RTL-safe) properties.
- Path alias `@/*` → `src/*`. User-facing strings go in `client/src/locales/{en,he}` — keep both in sync and check RTL.

**When in doubt, mirror the `auth` (server) and `users` (client) slices** rather than inventing a new structure.
