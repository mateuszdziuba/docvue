'use client'

import { Check } from 'lucide-react'
import { CONSULTATION_STEPS } from '@/lib/consultation'
import { cn } from '@/lib/utils'

export function ConsultationStepper({
  currentIndex,
  completions,
  onSelect,
}: {
  currentIndex: number
  completions: number[]
  onSelect: (index: number) => void
}) {
  const overall = Math.round(
    completions.reduce((total, value) => total + value, 0) / Math.max(1, completions.length),
  )
  const currentStep = CONSULTATION_STEPS[currentIndex]

  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 -mt-4 mb-6 rounded-t-xl border-b border-border/60 bg-background/95 px-4 pb-3 pt-4 backdrop-blur sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-8 md:top-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Postęp konsultacji
        </p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary tabular-nums">
          {overall}%
        </p>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/10"
        role="progressbar"
        aria-label="Postęp konsultacji"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overall}
        aria-valuetext={`Wypełniono ${overall} procent konsultacji`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${overall}%` }}
        />
      </div>

      <nav aria-label="Etapy konsultacji" className="mt-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-8 lg:overflow-visible lg:pb-0">
          {CONSULTATION_STEPS.map((step, index) => {
            const active = index === currentIndex
            const completion = completions[index] ?? 0
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelect(index)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors lg:w-full',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : completion >= 60
                      ? 'border-success/25 bg-success-container/70 text-on-success-container'
                      : 'border-border/70 bg-background/60 text-muted-foreground hover:bg-surface-container-low hover:text-foreground',
                )}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background/20 text-[9px] tabular-nums">
                  {completion >= 60 && !active ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {step.short}
              </button>
            )
          })}
        </div>
      </nav>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Krok {currentIndex + 1} z {CONSULTATION_STEPS.length} · {currentStep.label}
      </p>
    </div>
  )
}
