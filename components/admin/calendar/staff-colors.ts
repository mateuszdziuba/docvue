export interface StaffColor {
  key: string
  containerClass: string
  borderClass: string
  solidClass: string
  ringClass: string
}

const PALETTE: StaffColor[] = [
  {
    key: 'primary',
    containerClass: 'bg-primary-container text-on-primary-container',
    borderClass: 'border-primary/40',
    solidClass: 'bg-primary',
    ringClass: 'ring-primary/30',
  },
  {
    key: 'info',
    containerClass: 'bg-info-container text-on-info-container',
    borderClass: 'border-info/45',
    solidClass: 'bg-info',
    ringClass: 'ring-info/35',
  },
  {
    key: 'success',
    containerClass: 'bg-success-container text-on-success-container',
    borderClass: 'border-success/45',
    solidClass: 'bg-success',
    ringClass: 'ring-success/35',
  },
  {
    key: 'warning',
    containerClass: 'bg-warning-container text-on-warning-container',
    borderClass: 'border-warning/50',
    solidClass: 'bg-warning',
    ringClass: 'ring-warning/40',
  },
  {
    key: 'secondary',
    containerClass: 'bg-secondary-container text-secondary-foreground',
    borderClass: 'border-secondary-foreground/30',
    solidClass: 'bg-secondary-foreground',
    ringClass: 'ring-secondary-foreground/25',
  },
  {
    key: 'accent',
    containerClass: 'bg-accent text-accent-foreground',
    borderClass: 'border-accent-foreground/30',
    solidClass: 'bg-accent-foreground',
    ringClass: 'ring-accent-foreground/25',
  },
  {
    key: 'neutral',
    containerClass: 'bg-surface-container-high text-foreground',
    borderClass: 'border-border',
    solidClass: 'bg-foreground/60',
    ringClass: 'ring-border',
  },
]

export const UNASSIGNED_STAFF_COLOR: StaffColor = {
  key: 'unassigned',
  containerClass: 'bg-muted text-muted-foreground',
  borderClass: 'border-border',
  solidClass: 'bg-muted-foreground/50',
  ringClass: 'ring-border',
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function staffColor(staffId: string | null | undefined): StaffColor {
  if (!staffId) return UNASSIGNED_STAFF_COLOR
  return PALETTE[hashString(staffId) % PALETTE.length]
}

export function staffInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}
