# Architecture (living map)

What exists in the code today. Update this when a module lands.

## Server (`server/src`)

| Area | Path | Notes |
|---|---|---|
| Entry | `index.ts`, `app.ts` | `createApp()` builds middleware stack: helmet → CORS (single `CLIENT_URL`) → body limits → cookies → routers → `errorHandler` |
| Config | `config/` | `env.ts` (fail-fast validation), `securityPolicy.ts` (session/token/password values), `rateLimitPolicies.ts`, `helmet.ts` |
| Auth | `modules/auth` | Login, logout, `me`, sessions revoke, forgot/reset/change password, activation, invite + list/view/deactivate users |
| Audit reads | `modules/audit-logs` | `GET /api/audit-logs` (SUPER_ADMIN, every read audited) |
| Authz | `shared/authz` | Permission catalog, role map, role-assignment guard, ownership helper |
| Middleware | `shared/middlewares` | `authenticate`, `csrf`, `requirePermission`/`requireRole`, `requireRecentAuth`, `validateRequest`, `rateLimit`, `errorHandler` |
| Sessions | `shared/session` | Opaque token in HttpOnly cookie, SHA-256 hash in DB; idle 30m / absolute 8h |
| Audit | `shared/audit` | Append-only `audit_logs`, metadata redaction |

### API

Public: `POST /api/auth/login`, `/password/forgot`, `/password/reset`, `/activate`, `GET /api/health`.
Authenticated: `GET /api/auth/me`, `POST /api/auth/logout`, `/sessions/revoke`, `/sessions/revoke-all`, `/password/change`.
User management: `POST /api/auth/users/{employee,admin}`, `GET /api/auth/users/{employees,admins}[/:id]`, `POST /api/auth/users/{employees,admins}/:id/deactivate`.

### Data model (`server/prisma/schema.prisma`)

`User`, `Session`, `Invitation`, `PasswordResetToken`, `AuditLog`.

## Client (`client/src`)

| Area | Path |
|---|---|
| App shell | `app/` — router, providers, RTL-aware layout + sidebar (`app/layout/nav.ts`) |
| Auth | `features/auth` — login, forgot/reset password, activation, route guards |
| Users | `features/users` — Admins / Employees management + detail page |
| Dashboard | `features/dashboard` — landing page (placeholder for business overview) |
| Settings | `features/settings` — profile, appearance, language, change password |

## Next

Business modules (e.g. customers, contacts, deals, tasks) — each as a server module + client feature slice, with its own permissions.
