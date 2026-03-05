# docvue — Developer Reference

## What Is This

docvue is a Polish SaaS for beauty salon form management. Salon owners create consent forms and surveys (zgody, ankiety), assign them to clients via unique token links, and manage responses from their admin dashboard. Clients fill forms on their phones — no account required.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.1.1 (App Router, Server Components) |
| Language | TypeScript 5.7 |
| Database / Auth | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Animations | Framer Motion (landing page only) |
| Forms | React Hook Form + Zod |
| Notifications | Sonner |
| Package Manager | pnpm |
| Analytics | Umami + PostHog + Google Analytics |
| Deployment | Vercel |

---

## Commands

```bash
pnpm dev          # dev server (webpack mode)
pnpm build        # production build
pnpm lint         # ESLint
pnpm test         # Vitest
```

---

## Route Architecture

```
app/
├── page.tsx                          # Landing page (marketing)
├── layout.tsx                        # Root layout (Geist font, Toaster, providers)
├── globals.css                       # Design tokens + Tailwind config
│
├── (auth)/                           # Unauthenticated routes
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── (admin)/                          # Protected admin dashboard
│   ├── layout.tsx                    # Auth gate + LockProvider + Sidebar
│   └── dashboard/
│       ├── page.tsx                  # Overview: stats, chart, upcoming visits
│       ├── clients/                  # Client CRUD
│       ├── forms/                    # Form builder + list
│       │   └── new/page.tsx          # Form builder (9 field types)
│       ├── visits/                   # Appointment scheduling
│       │   └── [id]/                 # Visit detail + photos + form assignment
│       ├── submissions/              # Form responses
│       │   └── [id]/                 # Submission detail
│       └── treatments/               # Beauty service definitions
│
├── (client)/                         # Client portal (requires client account)
│   ├── layout.tsx
│   ├── calendar/page.tsx             # Upcoming appointments
│   └── profile/page.tsx             # Profile + history
│
└── f/[token]/                        # Public form submission (no auth)
    ├── page.tsx                      # Form renderer
    └── success/page.tsx              # Confirmation screen

api/
└── upload/route.ts                   # Image upload endpoint
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

### Colors (CSS variables in globals.css)
- **Primary** (brand teal): `hsl(172, 50%, 36%)` — used for CTAs, active states, brand mark
- **Accent** (warm amber): `hsl(36, 80%, 56%)` — secondary highlights
- **Info** (muted blue): `hsl(220, 50%, 50%)` — status badges, chart line
- **Success** (sage green): `hsl(150, 45%, 45%)` — completed status badges, chart line
- **Background**: warm stone `hsl(40, 20%, 98%)` — intentional, not default shadcn white
- **Card**: `hsl(0, 0%, 100%)` — slightly lighter than background
- **Border**: warm stone tint `hsl(30, 12%, 88%)`

Dark mode is supported via `.dark` class (next-themes).

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

## Server Actions (`actions/`)

| File | Key Functions |
|---|---|
| `auth.ts` | `login()`, `signup()`, `logout()` |
| `client-forms.ts` | `assignFormToClient()`, `getClientFormByToken()`, `submitClientForm()`, `deleteClientForm()` |
| `submissions.ts` | `submitForm()`, `getPublicForm()`, `deleteSubmission()` |
| `forms.ts` | CRUD for form templates |
| `clients.ts` | CRUD for salon clients |
| `appointments-sync.ts` | Syncs appointment status based on required form completion |
| `settings.ts` | Update salon profile + PIN |

---

## Key Patterns

- **Server Components by default** — data fetching in layout/page, not in client components
- **Parallel Supabase queries** — use `Promise.all()` for independent queries
- **URL-based state** — search, filters via `searchParams`
- **Server Actions + `revalidatePath`** — mutation pattern throughout
- **Optimistic UI** — client state updated before server confirms where appropriate
- **Token-based public access** — no session needed for `/f/[token]`
- **Form locking** — forms with submissions cannot have fields added/removed

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
