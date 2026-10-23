'use client'

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import {
  CONSULTATION_STEPS,
  calculateAge,
  createEmptyFaceAnalysis,
  formatConsultationDate,
  formatDateTime,
  getStepCompletion,
} from '@/lib/consultation'
import { Link } from '@/lib/link-compat'
import { useRouterCompat } from '@/lib/router-compat'
import { deleteConsultationFn, saveConsultationFn } from '@/src/server/consultations'
import type {
  ClientConsultation,
  ConsultationClient,
  ConsultationData,
  FaceAnalysis,
} from '@/types/consultation'
import type { StaffMember, Treatment } from '@/types/database'
import { ConsultationGuide } from './consultation-info'
import { ConsultationStepper } from './consultation-stepper'
import { FaceStep } from './face-step'
import {
  CareStep,
  DietStep,
  HealthStep,
  IntroStep,
  LifestyleStep,
  RhythmStep,
  SummaryStep,
} from './steps'

export function ConsultationEditor({
  consultation,
  client,
  initialPhotoUrl,
  isOwner,
  treatments,
  salonId,
  staffMembers,
  beautyPlan,
}: {
  consultation: ClientConsultation
  client: ConsultationClient
  initialPhotoUrl: string | null
  isOwner: boolean
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  salonId: string
  staffMembers: Pick<StaffMember, 'id' | 'name'>[]
  beautyPlan: { id: string; consultation_id: string | null } | null
}) {
  const router = useRouterCompat()
  const [data, setData] = useState<ConsultationData>(consultation.data)
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis>(
    consultation.face_analysis ?? createEmptyFaceAnalysis(),
  )
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [status, setStatus] = useState(consultation.status)
  const [completedAt, setCompletedAt] = useState(consultation.completed_at)
  const [stepIndex, setStepIndex] = useState(0)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [lastSavedAt, setLastSavedAt] = useState(consultation.updated_at)
  const [conflict, setConflict] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const revisionRef = useRef(consultation.revision)
  const lastSavedDataRef = useRef(JSON.stringify(consultation.data))
  const saveTimerRef = useRef<number | null>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const disabled = status === 'completed'

  const completions = CONSULTATION_STEPS.map((step) => {
    if (step.id === 'face') {
      return faceAnalysis.annotations.length > 0
        ? 100
        : faceAnalysis.base === 'template' || photoUrl
          ? 50
          : 0
    }
    return getStepCompletion(data, step.id)
  })

  useEffect(() => {
    if (disabled || conflict) return
    const serialized = JSON.stringify(data)
    if (serialized === lastSavedDataRef.current) return
    setSaveState('saving')
    saveTimerRef.current = window.setTimeout(async () => {
      saveTimerRef.current = null
      try {
        const result = await saveConsultationFn({
          data: {
            id: consultation.id,
            data,
            expectedRevision: revisionRef.current,
          },
        })
        if (result.conflict) {
          setConflict(true)
          setSaveState('error')
          return
        }
        if (result.error) {
          setSaveState('error')
          return
        }
        if (typeof result.revision === 'number') revisionRef.current = result.revision
        if (result.updatedAt) setLastSavedAt(result.updatedAt)
        lastSavedDataRef.current = serialized
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 1200)
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [data, disabled, conflict, consultation.id])

  const saveNow = async () => {
    if (disabled) return
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    setSaveState('saving')
    const serialized = JSON.stringify(data)
    try {
      const result = await saveConsultationFn({
        data: {
          id: consultation.id,
          data,
          expectedRevision: revisionRef.current,
        },
      })
      if (result.conflict) {
        setConflict(true)
        setSaveState('error')
        return
      }
      if (result.error) {
        setSaveState('error')
        toast.error(result.error)
        return
      }
      if (typeof result.revision === 'number') revisionRef.current = result.revision
      if (result.updatedAt) setLastSavedAt(result.updatedAt)
      lastSavedDataRef.current = serialized
      setSaveState('saved')
      toast.success('Konsultacja zapisana')
    } catch {
      setSaveState('error')
      toast.error('Nie udało się zapisać konsultacji')
    }
  }

  const completeConsultation = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    setIsCompleting(true)
    try {
      const serialized = JSON.stringify(data)
      const result = await saveConsultationFn({
        data: {
          id: consultation.id,
          data,
          status: 'completed',
          expectedRevision: revisionRef.current,
        },
      })
      if (result.conflict) {
        setConflict(true)
        toast.error('Konsultacja zmieniła się w innej karcie. Odśwież stronę.')
        return
      }
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (typeof result.revision === 'number') revisionRef.current = result.revision
      if (result.updatedAt) setLastSavedAt(result.updatedAt)
      lastSavedDataRef.current = serialized
      setStatus('completed')
      setCompletedAt(result.completedAt ?? new Date().toISOString())
      setCompleteOpen(false)
      setSaveState('saved')
      toast.success('Konsultacja zakończona')
    } catch {
      toast.error('Nie udało się zakończyć konsultacji')
    } finally {
      setIsCompleting(false)
    }
  }

  const reopenConsultation = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    setIsCompleting(true)
    try {
      const result = await saveConsultationFn({
        data: {
          id: consultation.id,
          data,
          status: 'draft',
          expectedRevision: revisionRef.current,
        },
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (typeof result.revision === 'number') revisionRef.current = result.revision
      if (result.updatedAt) setLastSavedAt(result.updatedAt)
      setStatus('draft')
      setCompletedAt(null)
      toast.success('Konsultacja ponownie otwarta do edycji')
    } catch {
      toast.error('Nie udało się otworzyć konsultacji')
    } finally {
      setIsCompleting(false)
    }
  }

  const deleteConsultation = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteConsultationFn({ data: { id: consultation.id } })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      setDeleteOpen(false)
      toast.success('Konsultacja usunięta')
      router.push(`/dashboard/clients/${client.id}/consultations`)
      await router.invalidate()
    } catch {
      toast.error('Nie udało się usunąć konsultacji')
    } finally {
      setIsDeleting(false)
    }
  }

  const goToStep = (index: number) => {
    if (!disabled && JSON.stringify(data) !== lastSavedDataRef.current) {
      void saveNow()
    }
    setStepIndex(index)
    window.requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById(`consultation-section-${index + 1}`)?.focus()
    })
  }

  const currentStep = CONSULTATION_STEPS[stepIndex]
  const age = calculateAge(client.birth_date)
  const incompleteSteps = CONSULTATION_STEPS.filter((_step, index) => completions[index] < 50).map(
    (step) => step.label,
  )

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6"
      id="consultation-top"
      ref={topRef}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Wróć do klienta
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ConsultationGuide />
          <span
            aria-live="polite"
            className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-2 text-[11px] text-muted-foreground sm:inline-flex"
          >
            {saveState === 'saving' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Zapisywanie…
              </>
            ) : saveState === 'error' ? (
              <>
                <AlertTriangle className="h-3 w-3 text-warning" aria-hidden="true" />
                Błąd zapisu
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-success" aria-hidden="true" />
                Zapisano{' '}
                {new Date(lastSavedAt).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
          </span>
          {!disabled ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveNow()}
              disabled={saveState === 'saving'}
            >
              <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Zapisz
            </Button>
          ) : null}
          {!disabled ? (
            <Button type="button" onClick={() => setCompleteOpen(true)}>
              Zakończ
            </Button>
          ) : isOwner ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void reopenConsultation()}
              disabled={isCompleting}
            >
              <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Wznów edycję
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={disabled && !isOwner}
            aria-label="Usuń konsultację"
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="label-caps text-primary">Konsultacja holistyczna</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Tylko personel
          </span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              disabled
                ? 'bg-success-container text-on-success-container'
                : 'bg-warning-container text-on-warning-container'
            }`}
          >
            {disabled ? 'Zakończona' : 'Wersja robocza'}
          </span>
        </div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          {client.name}
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatConsultationDate(data.meta.consultationDate)}
          </span>
          {age !== null ? <span>{age} lat</span> : null}
          {client.phone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {client.phone}
            </span>
          ) : null}
          {client.email ? (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {client.email}
            </span>
          ) : null}
          {completedAt ? <span>Zakończono {formatDateTime(completedAt)}</span> : null}
        </p>
      </header>

      {client.important_info ? (
        <p className="rounded-xl border border-warning/25 bg-warning-container/60 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-on-warning-container">
          {client.important_info}
        </p>
      ) : null}

      {conflict ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Konsultacja została zmieniona w innej karcie. Odśwież stronę, aby uniknąć nadpisania
            danych.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Odśwież
          </Button>
        </div>
      ) : null}

      {disabled ? (
        <div className="rounded-2xl border border-success/25 bg-success-container/50 px-4 py-3 text-sm text-on-success-container">
          Konsultacja jest zakończona i zablokowana. Dokument pozostaje dostępny do wglądu.
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-background/70 shadow-[0_10px_30px_rgba(27,28,28,0.1)] backdrop-blur-xl">
        <div className="p-4 sm:p-8">
          <ConsultationStepper
            currentIndex={stepIndex}
            completions={completions}
            onSelect={goToStep}
          />

          <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0 disabled:opacity-100">
            {currentStep.id === 'intro' ? (
              <IntroStep data={data} setData={setData} disabled={disabled} />
            ) : currentStep.id === 'rhythm' ? (
              <RhythmStep data={data} setData={setData} disabled={disabled} />
            ) : currentStep.id === 'lifestyle' ? (
              <LifestyleStep data={data} setData={setData} disabled={disabled} />
            ) : currentStep.id === 'diet' ? (
              <DietStep data={data} setData={setData} disabled={disabled} />
            ) : currentStep.id === 'health' ? (
              <HealthStep data={data} setData={setData} disabled={disabled} />
            ) : currentStep.id === 'care' ? (
              <CareStep data={data} setData={setData} disabled={disabled} />
            ) : currentStep.id === 'face' ? (
              <FaceStep
                consultationId={consultation.id}
                photoUrl={photoUrl}
                consentAt={consultation.face_photo_consent_at}
                analysis={faceAnalysis}
                setAnalysis={setFaceAnalysis}
                disabled={disabled}
                onPhotoChanged={setPhotoUrl}
              />
            ) : (
              <SummaryStep
                data={data}
                setData={setData}
                faceAnalysis={faceAnalysis}
                disabled={disabled}
                treatments={treatments}
                clientId={client.id}
                clientName={client.name}
                consultationId={consultation.id}
                salonId={salonId}
                staffMembers={staffMembers}
                beautyPlan={beautyPlan}
              />
            )}
          </fieldset>
        </div>
      </div>

      <div className="sticky bottom-20 z-30 mx-auto flex w-full max-w-md items-center justify-between gap-2 rounded-full border border-border bg-background/95 px-2 py-2 shadow-[0_8px_24px_rgb(111_89_87/0.18)] backdrop-blur md:bottom-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => goToStep(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Wstecz
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Krok {stepIndex + 1} z {CONSULTATION_STEPS.length} · {currentStep.label}
        </span>
        <span className="text-xs text-muted-foreground sm:hidden" aria-live="polite">
          {saveState === 'saving'
            ? 'Zapisywanie…'
            : saveState === 'error'
              ? 'Błąd zapisu'
              : 'Zapisano'}
        </span>
        {stepIndex < CONSULTATION_STEPS.length - 1 ? (
          <Button type="button" onClick={() => goToStep(stepIndex + 1)}>
            Dalej
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        ) : !disabled ? (
          <Button type="button" onClick={() => setCompleteOpen(true)}>
            Zakończ konsultację
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
          >
            Wróć do klienta
          </Button>
        )}
      </div>

      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zakończyć konsultację?</AlertDialogTitle>
            <AlertDialogDescription>
              Po zakończeniu dokument będzie tylko do odczytu. Kolejną wizytę zapiszesz jako nową
              konsultację.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {incompleteSteps.length > 0 ? (
            <div className="rounded-xl border border-warning/25 bg-warning-container/60 px-3 py-2 text-xs leading-relaxed text-on-warning-container">
              Niektóre sekcje są wypełnione częściowo: {incompleteSteps.join(', ')}. Możesz je
              uzupełnić albo zakończyć mimo to.
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Wróć do edycji</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void completeConsultation()
              }}
              disabled={isCompleting}
            >
              {isCompleting ? 'Zapisywanie…' : 'Zakończ konsultację'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć konsultację?</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięte zostaną wszystkie odpowiedzi, mapa twarzy i zdjęcie. Tej operacji nie można
              cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void deleteConsultation()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Usuwanie…' : 'Usuń konsultację'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
