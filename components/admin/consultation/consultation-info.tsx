'use client'

import { BookOpen, Info } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CONSULTATION_INFO, CONSULTATION_STEPS, type InfoContent } from '@/lib/consultation'
import { cn } from '@/lib/utils'

function InfoBody({ content }: { content: InfoContent }) {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg leading-snug text-foreground">{content.title}</h3>
      <p className="text-sm leading-relaxed text-on-surface-variant">{content.lead}</p>
      {content.bullets?.length ? (
        <ul className="space-y-1.5 text-sm leading-relaxed text-on-surface-variant">
          {content.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {content.pillars?.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {content.pillars.map((pillar, index) => (
            <div
              key={pillar}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-container text-[10px] font-semibold text-on-primary-container">
                {index + 1}
              </span>
              {pillar}
            </div>
          ))}
        </div>
      ) : null}
      {content.pyramid?.length ? (
        <div className="rounded-xl border border-primary/15 bg-background/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Piramida pielęgnacji
          </p>
          <div className="mt-2 space-y-1" aria-hidden="true">
            {content.pyramid.map((label, index) => (
              <div key={label} className="flex justify-center">
                <div
                  className="rounded-md border border-primary/15 bg-primary-container/60 px-2.5 py-0.5 text-center text-[10px] font-medium text-on-primary-container"
                  style={{ width: `${48 + index * 7}%` }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {content.callout ? (
        <div className="rounded-xl border border-primary/20 bg-primary-container/60 px-3 py-2.5 text-sm font-medium leading-relaxed text-on-primary-container">
          {content.callout}
        </div>
      ) : null}
    </div>
  )
}

export function ConsultationInfoButton({
  content,
  className,
}: {
  content: InfoContent
  className?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Informacje: ${content.title}`}
          title={content.title}
          className={cn(
            'group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors',
            'hover:bg-primary-container/60 hover:text-on-primary-container',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            className,
          )}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="max-h-[min(70vh,34rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border-border/70 p-4 shadow-modal"
      >
        <InfoBody content={content} />
      </PopoverContent>
    </Popover>
  )
}

export function ConsultationGuide() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Przewodnik</span>
          <span className="sr-only sm:hidden">Przewodnik konsultacji</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-surface-container-low/60 px-6 py-5 text-left">
          <SheetTitle className="font-serif text-2xl font-normal">
            Przewodnik konsultacji
          </SheetTitle>
          <SheetDescription>
            Krótkie wyjaśnienia do sekcji formularza — na podstawie karty konsultacji holistycznej.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-6 py-5">
          {CONSULTATION_STEPS.map((step, index) => {
            const content = CONSULTATION_INFO[step.id]
            if (!content) return null
            return (
              <section
                key={step.id}
                className="space-y-2 border-b border-border/40 pb-5 last:border-b-0"
              >
                <p className="label-caps text-muted-foreground">
                  {String(index + 1).padStart(2, '0')} · {step.label}
                </p>
                <InfoBody content={content} />
              </section>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
