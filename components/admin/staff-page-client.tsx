'use client'

import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { StaffList } from './staff-list'
import { AddStaffDialog } from './add-staff-dialog'
import type { StaffMember } from '@/types/database'

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
          <span className="text-[13px] text-on-surface-variant">
            {initialStaff.length} {initialStaff.length === 1 ? 'pracownik' : 'pracowników'}
          </span>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Zaproś pracownika
          </button>
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
