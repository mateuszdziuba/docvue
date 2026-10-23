'use client'

import type { ReactNode } from 'react'
import type { InfoContent } from '@/lib/consultation'
import { cn } from '@/lib/utils'
import { ConsultationInfoButton } from './consultation-info'

export function ConsultationSection({
  index,
  title,
  description,
  info,
  completion,
  children,
  className,
}: {
  index: number
  title: string
  description?: string
  info?: InfoContent
  completion?: number
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-labelledby={`consultation-section-${index}`}
      className={cn('scroll-mt-24', className)}
    >
      <div className="mb-6 flex items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="label-caps text-primary">
            {String(index).padStart(2, '0')} · Holistyczna konsultacja
          </p>
          <h2
            id={`consultation-section-${index}`}
            tabIndex={-1}
            className="mt-1 font-serif text-2xl font-normal tracking-tight text-foreground outline-none sm:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {typeof completion === 'number' && completion > 0 ? (
            <span className="hidden rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
              {completion}%
            </span>
          ) : null}
          {info ? <ConsultationInfoButton content={info} /> : null}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
