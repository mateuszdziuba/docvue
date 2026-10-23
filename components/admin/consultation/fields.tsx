'use client'

import { format } from 'date-fns'
import { Check, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Option } from '@/lib/consultation'
import { cn } from '@/lib/utils'

export function Question({
  number,
  label,
  hint,
  children,
  className,
}: {
  number?: number
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <fieldset
      aria-labelledby={id}
      className={cn('m-0 min-w-0 space-y-2.5 border-0 p-0', className)}
    >
      <div>
        <p id={id} className="text-sm font-medium leading-relaxed text-foreground">
          {number ? (
            <span className="mr-2 inline-block min-w-5 font-serif text-base text-muted-foreground tabular-nums">
              {number}.
            </span>
          ) : null}
          {label}
        </p>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </fieldset>
  )
}

type ChoiceOption = Option | { value: string; label: string; description?: string }

export function ChoiceChips({
  options,
  value,
  onChange,
  multiple = false,
  columns = 2,
  disabled = false,
  className,
}: {
  options: ChoiceOption[]
  value: string | string[] | null
  onChange: (value: string | string[]) => void
  multiple?: boolean
  columns?: 1 | 2 | 3
  disabled?: boolean
  className?: string
}) {
  const groupName = useId()
  const selected = Array.isArray(value) ? value : value ? [value] : []

  const toggle = (optionValue: string, checked: boolean) => {
    if (multiple) {
      const next = checked
        ? Array.from(new Set([...(Array.isArray(value) ? value : []), optionValue]))
        : (Array.isArray(value) ? value : []).filter((item) => item !== optionValue)
      onChange(next)
      return
    }
    onChange(optionValue)
  }

  return (
    <div
      role={multiple ? 'group' : 'radiogroup'}
      className={cn(
        'grid gap-2',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {options.map((option) => {
        const checked = selected.includes(option.value)
        return (
          <label
            key={option.value}
            className={cn(
              'group relative flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm leading-snug transition-colors',
              'hover:border-primary/40 hover:bg-primary-container/30',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
              checked && 'border-primary/60 bg-primary-container/60 text-on-primary-container',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={groupName}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={(event) => toggle(option.value, event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-input bg-background transition-colors',
                multiple ? 'rounded-[4px]' : 'rounded-full',
                checked && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            <span>
              <span className="block font-medium">{option.label}</span>
              {'description' in option && option.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Tak' },
  { value: 'no', label: 'Nie' },
]
const YES_NO_MAYBE_OPTIONS = [
  { value: 'yes', label: 'Tak' },
  { value: 'no', label: 'Nie' },
  { value: 'sometimes', label: 'Czasami' },
]
const YES_NO_PARTLY_OPTIONS = [
  { value: 'yes', label: 'Tak' },
  { value: 'no', label: 'Nie' },
  { value: 'partly', label: 'Częściowo' },
]
const YES_NO_NA_OPTIONS = [
  { value: 'yes', label: 'Tak' },
  { value: 'no', label: 'Nie' },
  { value: 'na', label: 'Nie dotyczy' },
]

export function YesNoField({
  value,
  onChange,
  variant = 'basic',
}: {
  value: string | null
  onChange: (value: string) => void
  variant?: 'basic' | 'maybe' | 'partly' | 'na'
}) {
  const options =
    variant === 'maybe'
      ? YES_NO_MAYBE_OPTIONS
      : variant === 'partly'
        ? YES_NO_PARTLY_OPTIONS
        : variant === 'na'
          ? YES_NO_NA_OPTIONS
          : YES_NO_OPTIONS
  return (
    <ChoiceChips
      options={options}
      value={value}
      onChange={(next) => onChange(next as string)}
      columns={options.length === 2 ? 2 : 3}
      className="sm:max-w-xl"
    />
  )
}

export function TextQuestion({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  required,
  disabled,
  inputMode,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        inputMode={inputMode}
        lang={type === 'date' || type === 'time' ? 'pl' : undefined}
        className="min-h-11 rounded-xl border-border bg-background px-4 py-2.5 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function TextAreaQuestion({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
  disabled,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  rows?: number
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="min-h-24 rounded-xl border-border bg-background px-4 py-3 text-base leading-relaxed focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function ScaleField({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  unit,
  lowLabel,
  highLabel,
  disabled,
  ariaLabelledby,
}: {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  lowLabel?: string
  highLabel?: string
  disabled?: boolean
  ariaLabelledby?: string
}) {
  const id = useId()
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-serif tabular-nums text-foreground">
          {value ?? '—'}
          {value !== null && unit ? (
            <span className="ml-1 text-sm font-sans text-muted-foreground">{unit}</span>
          ) : null}
        </div>
        {value !== null ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Wyczyść
          </button>
        ) : null}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? Math.round((min + max) / 2)}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        aria-labelledby={ariaLabelledby}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{lowLabel ?? min}</span>
        <span>{highLabel ?? max}</span>
      </div>
    </div>
  )
}

export function NotesField({
  value,
  onChange,
  placeholder = 'Zapisz obserwacje, rekomendacje lub rzeczy do omówienia…',
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="mt-2 rounded-2xl border border-border/60 bg-surface-container-low/70 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <Label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          Notatki dla kosmetologa
        </Label>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="min-h-20 rounded-xl border-border/60 bg-background px-4 py-3 leading-relaxed focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
      />
    </div>
  )
}

export function Subsection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
        {title}
        <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
      </h3>
      {children}
    </section>
  )
}

export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
}

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

export function TimePicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [hour = '', minute = ''] = value.split(':')
  const minuteOptions =
    minute && !MINUTES.includes(minute)
      ? [...MINUTES, minute].sort((a, b) => Number(a) - Number(b))
      : MINUTES

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <Select
          value={hour || undefined}
          onValueChange={(nextHour) => onChange(`${nextHour}:${minute || '00'}`)}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label={`${label} — godzina`}
            className="h-11 w-20 rounded-xl border-input bg-background px-3 text-base"
          >
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent className="max-h-72 rounded-xl">
            {HOURS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-lg text-muted-foreground">:</span>
        <Select
          value={minute || undefined}
          onValueChange={(nextMinute) => onChange(`${hour || '00'}:${nextMinute}`)}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label={`${label} — minuty`}
            className="h-11 w-20 rounded-xl border-input bg-background px-3 text-base"
          >
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent className="max-h-72 rounded-xl">
            {minuteOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Wyczyść godzinę"
            title="Wyczyść godzinę"
            className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function DateField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const date = value ? new Date(`${value}T00:00:00`) : undefined
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
        {label}
      </span>
      <DatePicker
        date={date && !Number.isNaN(date.getTime()) ? date : undefined}
        setDate={(next) => onChange(next ? format(next, 'yyyy-MM-dd') : '')}
        disabled={disabled}
        aria-label={label}
        className="h-11 rounded-xl"
      />
    </div>
  )
}

export function CurrencyQuestion({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? '0'}
          inputMode="decimal"
          className="min-h-11 rounded-xl border-border bg-background px-4 pr-12 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          PLN
        </span>
      </div>
    </div>
  )
}
