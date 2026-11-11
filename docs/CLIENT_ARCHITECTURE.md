# Client architecture & conventions (`client/src`)

> **Read this before adding a screen, component, hook, or API call to the client.**
> It defines where files go, which shared components already exist, and the rules that keep
> the UI consistent as the app grows. The import boundaries in §2 are enforced by ESLint
> (`client/eslint.config.js`).

## 1. Folder structure

```
src/
  app/                          # Composition root. May import anything.
    providers/AppProviders.tsx  #   QueryClient, AuthProvider, Toaster
    layout/                     #   App shell: RootLayout (dir/lang/theme), AppLayout, AppSidebar, nav.ts
    router.tsx  IndexRedirect.tsx
  components/
    ui/                         # shadcn/ui primitives (Button, Card, Dialog, Table, …). Design-system level.
    shared/                     # App-wide presentational components (see §3). Barrel: "@/components/shared".
      feedback/  layout/  inputs/  form/  data/  navigation/
  features/<name>/              # One vertical slice per domain area (auth, users, dashboard, settings, …)
    api/        <name>.api.ts   #   HTTP calls (the only place that touches apiClient)
                <name>.keys.ts  #   TanStack Query key factory
    hooks/      use<Name>Queries.ts  #   useQuery/useMutation wrappers
                use<Thing>.ts        #   feature logic (e.g. useUsersList)
    components/ feature-specific UI; a sub-folder only for a multi-file component (e.g. components/inspector/)
    pages/      route components — thin: compose hooks + components
    schemas/    zod form schemas (only if the feature has forms)
    types/      index.ts
    lib/        pure helpers / constants (e.g. users/lib/roles.ts, auth/lib/permissions.ts)
    context/    only when a feature must provide React context (auth)
    index.ts    PUBLIC API — the only entry other code may import
  hooks/        generic, feature-agnostic hooks (useDirection, useDebouncedValue, useIsMobile)
  lib/          apiClient, i18n, utils (cn, initials), format, download (saveBlob), notify (toastApiError)
  stores/       global client state (Zustand) — e.g. theme. Feature-local UI state stays in components.
  locales/<lng>/<namespace>.json   # en, he (RTL); one namespace per feature + "common"
  styles/globals.css               # design tokens (colors, radius) — light + dark
  test/                            # Vitest setup + render helpers
```

**Don't add type-based folders inside a feature** (`components/buttons/`, `components/dialogs/`).
Create a sub-folder only when a component splits into several files, or a folder grows past ~8 files.

## 2. Dependency rules (ESLint-enforced)

```
app  →  features  →  components/shared  →  components/ui  →  lib / hooks / stores
```

- `components/*`, `hooks/`, `lib/`, `stores/` **never** import `@/features/*` or `@/app/*`.
- A feature imports another feature **only via its barrel**: `import { useAuth } from "@/features/auth"`.
  Inside a feature, use relative imports.
- `app/` imports features only via their barrels.
- Features never import `@/app/*`.

## 3. Where does my file go?

| I'm adding… | Put it in |
|---|---|
| A new route/screen | `features/<name>/pages/` + register it in `app/router.tsx` (+ `app/layout/nav.ts` if it's in the sidebar) |
| UI used by one feature only | `features/<name>/components/` |
| UI used (or clearly about to be used) by 2+ features | `components/shared/<category>/` + export from `components/shared/index.ts` |
| A styling variant of a primitive (new Button/Badge look) | a `cva` variant in `components/ui/<primitive>.tsx` |
| An HTTP call | `features/<name>/api/<name>.api.ts` |
| A query/mutation | `features/<name>/hooks/use<Name>Queries.ts`, keyed via `<name>.keys.ts` |
| Logic shared by a page's components (selection, multi-step flow, derived data) | `features/<name>/hooks/use<Thing>.ts` |
| A form's validation | `features/<name>/schemas/<thing>.schema.ts` |
| A pure helper used app-wide (formatting, files) | `lib/` |
| A generic React hook | `hooks/` |
| Global client state | `stores/` (Zustand) |
| User-facing text | `locales/{en,he}/<namespace>.json` — both, same keys |

## 4. Shared component catalog (`@/components/shared`)

**Search here before creating a component.** If one almost fits, extend it with a prop rather than copying it.

| Component | Use for |
|---|---|
| `PageHeader` | Title + description + actions at the top of every page |
| `LoadingState` (`size="sm" \| "md" \| "page"`) | Any loading view (panel, section, full-screen gate) |
| `EmptyState` | Loaded successfully, nothing to show |
| `ErrorState` (`onRetry?`) | Failed to load |
| `ConfirmDialog` (`variant="destructive"`, `pending`) | Any yes/no confirmation (delete, deactivate, logout) |
| `DetailList` + `DetailRow` | Read-only label/value lists (profile, entity details) |
| `StatCard` | KPI tile (icon + label + number) |
| `IconInput` | Input with a start icon and/or end adornment — base for decorated inputs |
| `SearchInput` | Search field (`value` + `onValueChange`); debounce in the caller (`useDebouncedValue`) |
| `PasswordInput` | Password field with an accessible show/hide toggle |
| `LoadingButton` | Button that triggers async work (spinner + disabled while `pending`) |
| `FormTextField` | Label + input + validation message bound to react-hook-form (`type="password"` → `PasswordInput`) |
| `SubmitButton` | Form submit button (`LoadingButton` with `type="submit"`) |
| `TableCard` | Card container for a data table (title, toolbar, footer) |
| `TableEmptyRow` | "No rows" row inside a `<Table>` |
| `Pagination` | Prev/next pager with totals |
| `IconActionButton` | Icon-only action (table rows/toolbars) — tooltip + `aria-label` built in |
| `GoBackButton` | History back with a fallback route; RTL-aware arrow |

Shared components are **presentational**: typed props in, callbacks out, no API calls, no feature
imports. They may use the `common` i18n namespace for default labels (e.g. "Cancel", "Loading…").

**Don't force a generic component.** Things that only look alike but carry different domain meaning
(e.g. `UserStatusBadge`) stay feature-specific thin wrappers over a primitive.
There is deliberately no column-config `DataTable` yet. Add one when several tables need
sorting/filtering.

## 5. Patterns

**Data access.** Components never call `apiClient` or `*.api.ts` directly. They use hooks.
Query keys come only from the feature's key factory (`userKeys.byRole(role)`),
so invalidation can't drift. Show API failures with `toastApiError(err)` from `@/lib/notify`.

**Pages compose.** A page wires hooks to components and holds only page-level UI state (which row is
being inspected or deleted). Row actions, multi-step flows, and derived data go in a feature hook
(`useUsersList`) so tables/cards stay presentational and testable.

**Every async view handles three states** with the shared components:
`isLoading → <LoadingState/>`, `isError → <ErrorState onRetry/>`, empty → `<EmptyState/>` / `<TableEmptyRow/>`.

**Forms** use react-hook-form + zod + `FormTextField` + `SubmitButton`, with `noValidate` on `<form>`.
Schemas are **factories taking `t`** so messages are localized:

```ts
const schema = useMemo(() => createInviteUserSchema(t), [t]);
const form = useForm<InviteUserValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
```

Shared validation messages live in `common:validation.*`. When the server validates the same
payload, mirror its rules (see `users/schemas/invite.schema.ts`, `auth/schemas/auth.schemas.ts`).
The server stays the authority.

**Authorization in the UI is UX only.** Use `hasPermission` / `RoleRoute` to hide what a user can't
do. Every action is still authorized server-side (`docs/AUTHORIZATION.md`).

## 6. Design system

- **Colors:** only token utilities (`bg-primary`, `text-muted-foreground`, `bg-success`, `text-destructive`, …)
  defined in `styles/globals.css` for light + dark. No hex values or raw Tailwind palette colors
  (`bg-emerald-500`) in components. A new semantic color needs a new token (light + dark +
  `@theme inline` mapping).
- **Radius:** controls/badges/menus `rounded-md`; cards/dialogs/panels use the primitives' default
  (`rounded-xl`); icon tiles `rounded-lg`.
- **Spacing:** pages use `space-y-6` between sections; card grids `gap-4`/`gap-6`; forms `space-y-4`/`space-y-5`.
- **Typography:** page title `text-2xl font-semibold` (via `PageHeader`); card title via `CardTitle`;
  secondary text `text-sm text-muted-foreground`; captions `text-xs`.
- **Icons:** Lucide. Decorative icons get `aria-hidden`; icon-only buttons need an accessible label
  (`IconActionButton` enforces it). Button icons are sized by the Button (don't add `size-4`).
- **RTL:** logical properties only (`ps-/pe-/ms-/me-/start-/end-/text-start`). Flip directional icons
  with `useDirection()` (see `Pagination`, `GoBackButton`).
- **Tables:** `ui/table` header styling and edge padding are the single source of truth. Wrap tables in `TableCard`.

## 7. Rules for every new feature

1. Look at an existing feature (`users` is the fullest example) and at §4 **before** writing UI.
2. Reuse, then extend (new prop/variant), then create, in that order. When you create a new
   shared component, say why the existing ones didn't fit.
3. Keep business logic out of presentational components. Pages compose; hooks own behavior; `api/` owns HTTP.
4. Put each file in the layer from §3. Respect the import boundaries in §2 (lint fails otherwise).
5. No duplicated styling: if you're copying a `className` string for the second time, it's a component or a variant.
6. Keep components small when that helps readability. Don't split a 40-line component into five files.
7. Add an abstraction only for ≥2 real call sites, or one firmly planned.
8. Add every string to both locales and check the screen in Hebrew (RTL) and dark mode.
9. Add co-located tests (`*.test.ts(x)`) for new shared components, schemas, and logic hooks.

## 8. Commands (inside `client/`)

- `npm run dev`. `npm run build` (type-check + bundle). `npm run lint` (includes the boundary rules).
- `npm test` (Vitest + Testing Library, jsdom). `npm run test:watch`.
- Test helpers: `renderWithProviders(ui)` (QueryClient + MemoryRouter + i18n, returns `user` from
  user-event) and `renderHookWithQuery(hook)` in `src/test/render.tsx`.
