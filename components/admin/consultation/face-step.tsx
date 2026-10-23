'use client'

import type { Dispatch, SetStateAction } from 'react'
import { CONSULTATION_INFO } from '@/lib/consultation'
import type { FaceAnalysis } from '@/types/consultation'
import { ConsultationSection } from './consultation-section'
import { FaceEditor } from './face/face-editor'

export function FaceStep({
  consultationId,
  photoUrl,
  consentAt,
  analysis,
  setAnalysis,
  disabled,
  onPhotoChanged,
}: {
  consultationId: string
  photoUrl: string | null
  consentAt: string | null
  analysis: FaceAnalysis
  setAnalysis: Dispatch<SetStateAction<FaceAnalysis>>
  disabled?: boolean
  onPhotoChanged: (url: string | null) => void
}) {
  return (
    <ConsultationSection
      index={7}
      title="Mapa twarzy"
      description="Zaznacz obszary wymagające uwagi, opisz zmiany i zaplanuj ich obserwację. Widok 3D jest opcjonalny — edytor 2D działa zawsze."
      info={CONSULTATION_INFO.face}
      completion={
        analysis.annotations.length > 0 ? 100 : analysis.base === 'template' || photoUrl ? 50 : 0
      }
    >
      <FaceEditor
        consultationId={consultationId}
        photoUrl={photoUrl}
        consentAt={consentAt}
        analysis={analysis}
        setAnalysis={setAnalysis}
        disabled={disabled}
        onPhotoChanged={onPhotoChanged}
      />
    </ConsultationSection>
  )
}
