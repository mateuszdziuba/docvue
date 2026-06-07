'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { deleteStaff, updateStaff } from '@/src/server/staff'
import type { StaffMember } from '@/types/database'

interface StaffListProps {
  staff: StaffMember[]
  onRefresh?: () => void
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-medium shrink-0">
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role: 'staff' | 'manager' }) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
        role === 'manager'
          ? 'bg-secondary-container text-on-surface border-secondary-container'
          : 'bg-surface-container text-on-surface-variant border-border',
      ].join(' ')}
    >
      {role === 'manager' ? 'Manager' : 'Pracownik'}
    </span>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-on-surface-variant">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-surface-container-high'}`} />
      {active ? 'Aktywny' : 'Nieaktywny'}
    </span>
  )
}

export function StaffList({ staff, onRefresh }: StaffListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggleActive = async (member: StaffMember) => {
    setTogglingId(member.id)
    const result = await updateStaff({ id: member.id, is_active: !member.is_active })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(member.is_active ? 'Konto dezaktywowane' : 'Konto aktywowane')
      onRefresh?.()
    }
    setTogglingId(null)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const result = await deleteStaff({ id })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Pracownik usunięty')
      onRefresh?.()
    }
    setDeletingId(null)
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <p className="text-sm">Brak pracowników. Zaproś pierwszego.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {staff.map((member) => (
        <div key={member.id} className="flex items-center gap-4 py-3 px-4">
          {/* Avatar */}
          {member.avatar_path ? (
            <img
              src={member.avatar_path}
              alt={member.name}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <AvatarPlaceholder name={member.name} />
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-on-surface font-medium truncate">{member.name}</p>
            <p className="text-[12px] text-on-surface-variant truncate">{member.email}</p>
          </div>

          {/* Role + Status */}
          <div className="hidden sm:flex items-center gap-3">
            <RoleBadge role={member.role} />
            <StatusDot active={member.is_active} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleToggleActive(member)}
              disabled={togglingId === member.id}
              title={member.is_active ? 'Dezaktywuj' : 'Aktywuj'}
              className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
            >
              {member.is_active ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" /><circle cx="8" cy="14" r="2" fill="currentColor" stroke="none" /><path d="M12 14h4" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                </svg>
              )}
            </button>
            <button
              onClick={() => {
                if (confirm(`Usunąć pracownika ${member.name}? Tej operacji nie można cofnąć.`)) {
                  handleDelete(member.id)
                }
              }}
              disabled={deletingId === member.id}
              title="Usuń pracownika"
              className="p-1.5 rounded-md text-on-surface-variant hover:bg-destructive/8 hover:text-destructive transition-colors disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
