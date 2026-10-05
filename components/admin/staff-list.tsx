'use client'

import { Pencil, Power, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { deleteStaff, updateStaff } from '@/src/server/staff'
import type { StaffMember } from '@/types/database'
import { DeleteIconButton } from './delete-icon-button'
import { EditStaffDialog } from './edit-staff-dialog'

interface StaffListProps {
  staff: StaffMember[]
  onRefresh?: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function RoleBadge({ role }: { role: 'staff' | 'manager' }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border px-2 py-0.5 text-xs font-medium',
        role === 'manager'
          ? 'border-secondary-container bg-secondary-container text-on-surface'
          : 'border-border bg-surface-container text-on-surface-variant',
      )}
    >
      {role === 'manager' ? 'Manager' : 'Pracownik'}
    </Badge>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-success' : 'bg-surface-container-high'}`}
      />
      {active ? 'Aktywny' : 'Nieaktywny'}
    </span>
  )
}

export function StaffList({ staff, onRefresh }: StaffListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null)
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)

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
      <EmptyState
        icon={<Users className="h-6 w-6" aria-hidden="true" />}
        title="Brak pracowników"
        description="Zaproś pierwszego pracownika."
      />
    )
  }

  return (
    <div className="divide-y divide-border">
      {staff.map((member) => (
        <div key={member.id} className="flex items-center gap-4 py-3 px-4">
          <Avatar className="h-9 w-9">
            {member.avatar_path ? <AvatarImage src={member.avatar_path} alt={member.name} /> : null}
            <AvatarFallback className="bg-primary-container text-sm font-medium text-on-primary-container">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-on-surface font-medium truncate">{member.name}</p>
            <p className="text-xs text-on-surface-variant truncate">{member.email}</p>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <RoleBadge role={member.role} />
            <StatusDot active={member.is_active} />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditTarget(member)}
              aria-label={`Edytuj pracownika ${member.name}`}
              className="h-11 w-11 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleToggleActive(member)}
              disabled={togglingId === member.id}
              aria-label={`${member.is_active ? 'Dezaktywuj' : 'Aktywuj'} ${member.name}`}
              className="h-11 w-11 rounded-lg text-muted-foreground"
            >
              {member.is_active ? (
                <Power className="h-4 w-4" aria-hidden="true" />
              ) : (
                <UserCheck className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <DeleteIconButton
              label={`Usuń pracownika ${member.name}`}
              onClick={() => setDeleteTarget(member)}
              disabled={deletingId === member.id}
              className="h-11 w-11"
            />
          </div>
        </div>
      ))}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń pracownika</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć pracownika {deleteTarget?.name}? Tej operacji nie można
              cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (deleteTarget) {
                  handleDelete(deleteTarget.id).then(() => setDeleteTarget(null))
                }
              }}
              disabled={deletingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId !== null ? 'Usuwanie…' : 'Usuń pracownika'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditStaffDialog
        staff={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        onSaved={onRefresh}
      />
    </div>
  )
}
