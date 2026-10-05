# docvue — Developer Reference

## What Is This

docvue is a Polish SaaS for beauty salon form management. Salon owners create consent forms and surveys (zgody, ankiety), assign them to clients via unique token links, and manage responses from their admin dashboard. Clients fill forms on their phones — no account required.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | TanStack Start 1.x (file-based routing, SSR via Vite) |
| Build Tool | Vite 8 (replaced Next.js) |
| Language | TypeScript 5.7 |
| Database / Auth | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Design System | DESIGN.md — Noto Serif + Manrope, blush/sage/cream palette |
| Charts | Recharts |
| Animations | Framer Motion (landing page only) |
| Forms | React Hook Form + Zod |
| Notifications | Sonner |
| Package Manager | pnpm |
| Analytics | Umami + PostHog + Google Analytics |
| Deployment | Vercel |

> **Migration note**: The app was migrated from Next.js App Router to TanStack Start. Server Actions → `createServerFn`. `next/navigation` → `@tanstack/react-router`. `app/` routes → `src/routes/`. Remaining `'use client'` directives in components are harmless legacy artifacts — they have no effect in TanStack Start.

---

## Commands

```bash
pnpm dev          # Vite dev server
pnpm build        # Production build (Vite)
pnpm lint         # Biome (lint)
pnpm lint:styles  # Guard spójności tokenów (palette/hex)
pnpm test         # Vitest (użyj `pnpm exec vitest run` w CI)
```

---

## Route Architecture (TanStack File-based Routing)

```
src/routes/
├── __root.tsx                        # Root layout (Toaster, font links, meta)
├── index.tsx                         # Landing page (marketing)
├── login.tsx                         # Login page
├── register.tsx                      # Registration
├── logout.tsx                        # Logout handler
├── f.$token.tsx                      # Public form fill (no auth, token-based)
├── f.$token_.success.tsx             # Form fill success screen
│
├── _authed.tsx                       # Auth guard (redirects to /login if no user)
│
└── _authed/
    ├── dashboard.tsx                 # Dashboard layout (Sidebar + LockProvider)
    └── dashboard/
        ├── index.tsx                 # Overview: stats, chart, upcoming visits
        ├── clients/
        │   ├── index.tsx             # Client list
        │   └── $clientId.tsx         # Client detail
        ├── forms/
        │   ├── index.tsx             # Form list
        │   ├── new.tsx               # Form builder (create)
        │   └── $formId/edit.tsx      # Form editor
        ├── visits/
        │   ├── index.tsx             # Visit list
        │   └── $visitId.tsx          # Visit detail + photos
        ├── submissions/
        │   ├── index.tsx             # Submission list
        │   └── $submissionId.tsx     # Submission detail
        ├── treatments/index.tsx      # Treatment list
        ├── calendar/index.tsx        # Calendar view
        └── staff/index.tsx           # Staff management (owner only)

src/server/                           # Server functions (createServerFn — replaces Next.js Server Actions)
├── auth.ts                           # fetchUserFn, loginFn, signupFn, logoutFn
├── clients.ts                        # CRUD for salon clients
├── forms.ts                          # CRUD for form templates
├── form-usage.ts                     # checkFormUsageFn
├── settings.ts                       # getSalonFn, updateSalonSettingsFn
├── staff.ts                          # Staff management: getStaffFn, inviteStaffFn, etc.
├── submissions.ts                    # Form submissions
├── appointments.ts                   # Appointment CRUD
└── treatments.ts                     # Treatment CRUD
```

---

## Database Schema (Supabase)

### Tables

| Table | Key Columns | Notes |
|---|---|---|
| `salons` | id, user_id, name, phone, address, pin_code | One per auth user |
| `clients` | id, salon_id, name, email, phone, birth_date, notes, user_id | user_id = optional client account |
| `forms` | id, salon_id, title, description, schema (JSON), is_active, is_public | schema = array of field definitions |
| `client_forms` | id, salon_id, client_id, form_id, token (32-char), status (pending/completed), filled_at, filled_by | Junction for form assignment |
| `submissions` | id, client_form_id, form_id, client_id, salon_id, data (JSON), client_name, client_email, signature | Completed form responses |
| `treatments` | id, salon_id, name, description, duration_minutes, price | Beauty services |
| `appointments` | id, salon_id, client_id, treatment_id, start_time, status, notes, before_photo_path, after_photo_path | Scheduled visits |
| `treatment_forms` | treatment_id, form_id | Which forms required per treatment |

### Appointment Statuses
- `pending_forms` — required form not yet submitted
- `scheduled` — confirmed, forms OK
- `completed` — visit done
- `cancelled`

---

## Design System

**Single source of truth:** `src/styles/app.css` (Tailwind v4, CSS-first). `tailwind.config.js` was removed; do not add palette utilities.

### Colors (semantic CSS variables)
- **Primary** (blush brown): `hsl(5 12% 39%)` — CTAs, active states, brand mark
- **Secondary** (sage): `hsl(115 6% 90%)` / foreground `hsl(115 6% 25%)`
- **Accent** (blush container): `hsl(10 18% 94%)`
- **Status**: `success`, `info`, `warning`, `destructive` (+ `-container` / `on-*-container`) — always use these instead of palette colors
- **Surfaces**: `surface-container-low|base|high|highest`, `card`, `popover`, `muted`
- **Panel** (auth brand side): `panel-surface`, `panel-on-surface*`, `panel-emphasis`
- **Input border**: `--input` is darker than `--border` to meet WCAG 1.4.11 (≥3:1)

Dark mode via `.dark` class (custom ThemeProvider in `lib/theme-compat.tsx`).

### Typography
- Fonts: **Noto Serif** (display, `.font-serif`) + **Manrope** (body, `--font-sans`), Geist Mono for code
- `.label-caps` utility for uppercase micro-labels; avoid arbitrary `text-[Npx]` except dense calendar labels (10–11px)

### Guardrail
`pnpm lint:styles` (`scripts/check-styles.mjs`) blocks Tailwind palette utilities and arbitrary hex colors in live code. Run it before commit; `pnpm check` includes it.

### Typography
- Font: Geist Sans (local woff), Geist Mono for code
- All UI copy is in **Polish**
- Font sizes via Tailwind utility classes

### Spacing / Radius
- Sidebar width: `w-60` (240px)
- Border radius base: `0.625rem`
- Max content width: `max-w-5xl` (admin), `max-w-6xl` (landing nav), `max-w-2xl` (forms)

---

## Key Components

### Admin Layout (`components/admin/sidebar.tsx`)
- `Sidebar` — desktop, always visible, `w-60`
- `MobileHeader` — fixed top bar, hamburger opens slide-in drawer
- `MobileBottomNav` — fixed bottom, 5 icons
- `UserMenu` — account dropdown in desktop sidebar bottom

**Note:** Sidebar receives `salon` prop from layout server component to avoid client-side fetches.

### Form Builder (`components/admin/edit-form-client.tsx`)
Supports 9 field types: `text`, `textarea`, `select`, `radio`, `checkbox_group`, `date`, `email`, `tel`, `separator`.
- Drag-reorder via Framer Motion
- Forms lock structurally once submissions exist (prevents data schema drift)

### Public Form (`app/f/[token]/page.tsx` + `components/token-form-client.tsx`)
- Token-based access, no auth required
- Prevents duplicate submissions
- Records: data JSON, client_name, signature, filled_by

### Lock Screen (`components/admin/lock-screen.tsx`)
- 4-digit PIN stored on `salons.pin_code`
- LocalStorage toggle: `dashboard_locked`

### Logo (`components/ui/docvue-logo.tsx`)
- Text mark: "doc" (foreground) + "vue" (primary/teal)
- Props: `className` for font-size

---

## Server Functions (`src/server/`)

All server-side logic uses TanStack Start's `createServerFn`. These replaced Next.js Server Actions.

| File | Key Functions |
|---|---|
| `auth.ts` | `fetchUserFn`, `loginFn`, `signupFn`, `logoutFn` |
| `client-forms.ts` | `assignFormToClientFn`, `getClientFormByTokenFn`, `submitClientFormFn`, `deleteClientFormFn` |
| `submissions.ts` | `submitFormFn`, `getPublicFormFn`, `deleteSubmissionFn` |
| `forms.ts` | CRUD for form templates |
| `clients.ts` | CRUD for salon clients |
| `appointments.ts` | Appointment scheduling + sync |
| `settings.ts` | `getSalonFn`, `updateSalonSettingsFn` |
| `staff.ts` | `getStaffFn`, `inviteStaffFn`, `updateStaffFn`, `deleteStaffFn` |

---

## Key Patterns

- **TanStack loaders** — data fetching in `loader` on each route, passed via `Route.useLoaderData()`
- **Parallel Supabase queries** — use `Promise.all()` for independent queries in loaders
- **URL-based state** — search, filters via `useSearch()` from TanStack Router
- **Server Functions** — `createServerFn()` for mutations (replaces Next.js Server Actions)
- **Optimistic UI** — client state updated before server confirms where appropriate
- **Token-based public access** — no session needed for `/f/[token]`
- **Form locking** — forms with submissions cannot have fields added/removed; title/description remain editable
- **LockProvider** — wraps dashboard; triggered before form fill in kiosk mode. PIN stored in `salons.pin_code`
- **Staff accounts** — owner can invite staff via email. Staff access is limited (no settings, no staff management)

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GA_ID
```

---

## File Naming Conventions

- Page-level: `page.tsx`, `layout.tsx`
- Admin components: `components/admin/[feature]-[type].tsx` (e.g. `clients-list.tsx`, `add-client-form.tsx`)
- Server actions: `actions/[resource].ts`
- Supabase helpers: `lib/supabase/server.ts`, `lib/supabase/client.ts`

---

## Known Hardcoded Values to Avoid

Do NOT hardcode these colors inline — use CSS variables:
- Blue: use `var(--color-info)` instead of `hsl(220,50%,50%)`
- Green: use `var(--color-success)` instead of `hsl(150,45%,45%)`

---

## Business Domain

- Target: Polish beauty/cosmetic salons (gabinety kosmetyczne)
- Core workflow: Salon creates form → assigns to client → client fills via link → salon sees response
- Secondary workflow: Appointment scheduling with required forms per treatment
- Client portal: clients can log in to see their appointments and calendar
