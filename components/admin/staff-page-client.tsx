'use client'

import { useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { StaffMember } from '@/types/database'
import { AddStaffDialog } from './add-staff-dialog'
import { StaffList } from './staff-list'

interface StaffPageClientProps {
  staff: StaffMember[]
}

export function StaffPageClient({ staff: initialStaff }: StaffPageClientProps) {
  const [showInvite, setShowInvite] = useState(false)
  const router = useRouter()

  const refresh = () => router.invalidate()

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-container-low">
          <span className="text-sm text-on-surface-variant">
            {initialStaff.length} {initialStaff.length === 1 ? 'pracownik' : 'pracowników'}
          </span>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Zaproś pracownika
          </Button>
        </div>

        <StaffList staff={initialStaff} onRefresh={refresh} />
      </div>

      <AddStaffDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={() => {
          setShowInvite(false)
          refresh()
        }}
      />
    </>
  )
}
