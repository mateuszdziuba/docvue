# Admin Components Reference

All components live in `components/admin/`. These are the building blocks of the admin dashboard.

---

## Layout

### `sidebar.tsx`
Desktop sidebar + mobile header for the admin layout.

**Exports:** `Sidebar`, `MobileHeader`

| Prop | Type | Description |
|---|---|---|
| `salon` | `object \| null` | Salon data (name displayed in bottom bar) |
| `isOwner` | `boolean` | If `false`, hides staff management and settings nav items |

**Design:** Stroke-only SVG icons (18×18, strokeWidth 1.75). Active nav item uses `bg-primary-container text-on-primary-container`. Uses `useLock()` for kiosk mode button ("Tryb kiosku").

### `mobile-nav.tsx`
Fixed bottom navigation bar for mobile screens (5 icon tabs).

**Exports:** `MobileBottomNav`

---

## Lock Screen

### `lock-screen.tsx`
PIN entry screen shown when kiosk mode is active.

**Exports:** `LockScreen`

| Prop | Type | Description |
|---|---|---|
| `onUnlock` | `() => void` | Called when correct PIN entered |

**Note:** `LockProvider` and `useLock` live in `components/providers/lock-provider.tsx`.

---

## Clients

### `clients-list.tsx`
Client list with search, add form toggle, and delete confirmation.

**Exports:** `ClientsList`

| Prop | Type | Description |
|---|---|---|
| `clients` | `Client[]` | List of clients to display |
| `query` | `string?` | Active search query (used for highlighting) |
| `defaultOpenAdd` | `boolean?` | Auto-expand the add form on mount |

### `add-client-form.tsx`
Inline form for creating a new client.

**Exports:** `AddClientForm`

| Prop | Type | Description |
|---|---|---|
| `onSuccess` | `() => void` | Called after successful creation |
| `onCancel` | `() => void` | Called on cancel |

### `edit-client-dialog.tsx`
Modal dialog for editing an existing client.

**Exports:** `EditClientDialog`

| Prop | Type | Description |
|---|---|---|
| `client` | `Client` | Current client data |
| `open` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Close handler |

### `client-detail-client.tsx`
Client detail panel — contact info, notes, assigned forms, visit history.

**Exports:** `ClientDetailClient`

### `client-combobox.tsx`
Searchable dropdown for selecting a client.

**Exports:** `ClientCombobox`

| Prop | Type | Description |
|---|---|---|
| `clients` | `Client[]` | Available clients |
| `value` | `string \| null` | Selected client ID |
| `onSelect` | `(id: string) => void` | Selection callback |

### `filtered-clients-list.tsx`
Wrapper that filters client list based on URL search param.

---

## Forms

### `edit-form-client.tsx`
Full form builder for creating/editing form templates.

**Exports:** `EditFormClient`

| Prop | Type | Description |
|---|---|---|
| `form` | `Form` | Existing form data (null for new) |
| `isNew` | `boolean` | If true, creates a new form |

**Behavior:**
- 9 field types with stroke SVG icons: `text`, `textarea`, `select`, `radio`, `checkbox_group`, `date`, `email`, `tel`, `separator`
- Fields locked structurally once any submission exists (`isLocked`)
- Title and description are **always** editable, even when locked
- Drag-to-reorder via Framer Motion

### `forms-list.tsx`
Grid of form template cards with status badge and link to editor.

**Exports:** `FormsList`

### `filtered-forms-list.tsx`
Wrapper that filters forms list based on URL search param.

---

## Visits & Appointments

### `visits-list.tsx`
Table of appointments with status badges (pending_forms, scheduled, completed, cancelled).

**Exports:** `VisitsList`

### `add-appointment-dialog.tsx`
Modal for scheduling a new appointment (client + treatment + datetime).

**Exports:** `AddAppointmentDialog`

### `delete-visit-button.tsx`
Confirmation button for cancelling/deleting an appointment.

### `fill-visit-form-button.tsx`
Button that opens a pre-filled form for a visit (kiosk mode workflow).

### `visit-notes.tsx`
Editable notes section on the visit detail page.

### `visit-photos.tsx`
Before/after photo section on the visit detail page.

### `visit-status-select.tsx`
Dropdown to update the status of a visit.

### `photo-upload.tsx`
Image upload component with crop/zoom functionality (used for before/after visit photos).

**Exports:** `PhotoUpload`

| Prop | Type | Description |
|---|---|---|
| `appointmentId` | `string` | Target appointment |
| `type` | `'before' \| 'after'` | Which photo slot |
| `onUploaded` | `(url: string) => void` | Called after upload |

### `photo-comparison.tsx`
Side-by-side before/after photo comparison widget.

---

## Submissions

### `submissions-list.tsx`
Table of form submissions with date, client name, and link to detail.

**Exports:** `SubmissionsList`

### `submission-preview-dialog.tsx`
Modal preview of a filled submission (read-only field rendering).

**Exports:** `SubmissionPreviewDialog`

### `delete-submission-button.tsx`
Confirmation button for permanently deleting a submission.

---

## Treatments

### `treatments-list.tsx`
List of treatment templates with price, duration, and edit/delete.

**Exports:** `TreatmentsList`

### `add-treatment-dialog.tsx`
Modal for creating a new treatment (name, duration, price, linked forms).

**Exports:** `AddTreatmentDialog`

### `edit-treatment-dialog.tsx`
Modal for editing an existing treatment.

**Exports:** `EditTreatmentDialog`

---

## Staff

### `staff-list.tsx`
Table of staff members with avatar, name, email, role badge, active status, and action buttons.

**Exports:** `StaffList`

| Prop | Type | Description |
|---|---|---|
| `staff` | `StaffMember[]` | List of staff members |
| `onRefresh` | `() => void?` | Called after mutation to trigger a data reload |

### `staff-page-client.tsx`
Client component for the staff management page — combines `StaffList` + `AddStaffDialog`.

**Exports:** `StaffPageClient`

| Prop | Type | Description |
|---|---|---|
| `staff` | `StaffMember[]` | Initial staff data from loader |

### `add-staff-dialog.tsx`
Modal for inviting a new staff member via email.

**Exports:** `AddStaffDialog`

| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Close handler |
| `onSuccess` | `() => void` | Called after successful invite |

**Behavior:** Inserts a `staff_members` row then calls `admin.auth.admin.inviteUserByEmail()` via `inviteStaffFn`. Roles: `staff` (basic) or `manager` (extended).

### `staff-avatar-upload.tsx`
Avatar upload widget for staff members (uploads to `staff-avatars` Supabase storage bucket).

**Exports:** `StaffAvatarUpload`

| Prop | Type | Description |
|---|---|---|
| `staffId` | `string` | Target staff member ID |
| `salonId` | `string` | Used as storage path prefix |
| `currentAvatarPath` | `string \| null` | Current avatar (signed URL or storage path) |
| `name` | `string` | Used to generate initials placeholder |
| `onUploaded` | `(path: string) => void?` | Called with signed URL after upload |

---

## Analytics & Stats

### `weekly-chart.tsx`
Recharts line chart for dashboard — weekly visit counts.

**Exports:** `WeeklyChart`

---

## Beauty Plan (Client Portal)

### `beauty-plan-section.tsx`
Displays a client's personalized beauty plan on their detail page.

### `edit-beauty-plan-dialog.tsx`
Modal for editing the beauty plan text.

### `delete-beauty-plan-button.tsx`
Confirmation button for deleting a beauty plan.

### `share-beauty-plan-button.tsx`
Generates a shareable link for the beauty plan.

---

## Settings

### `settings-dialog.tsx`
Modal for editing salon profile (name, phone, address) and PIN code.

**Exports:** `SettingsDialog`

---

## Design Conventions

- **Form library:** All forms use `@tanstack/react-form` (`useForm`, `form.Field`, `form.Subscribe`). No `react-hook-form` in the actual app (it remains only in the playground `screens/` demos).
- **Icons:** Stroke-only SVG (viewBox 0 0 24 24, strokeWidth 1.75, no fill). Inline in JSX — no icon library.
- **Colors:** Use CSS variables from `app.css`. Never hardcode colors.
  - Primary buttons: `bg-primary text-primary-foreground`
  - Active/selected states: `bg-primary-container text-on-primary-container`
  - Muted text: `text-on-surface-variant`
  - Cards: `bg-card border border-border rounded-xl`
- **Border radius:** 8–12px (`rounded-md` or `rounded-xl`). No pill shapes.
- **Shadows:** `shadow-sm` max. No heavy glow/blur effects.
- **Typography:** `font-serif` for page headings (Noto Serif). `font-sans` (Manrope) for body/UI.
- **Language:** All UI copy in Polish.
