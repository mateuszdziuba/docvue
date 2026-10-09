'use client'

import { useForm } from '@tanstack/react-form'
import { AlertCircle, ChevronDown, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import SignaturePad from '@/components/ui/signature-pad'
import { normalizeFieldType, validateFieldValue } from '@/lib/form-validation'
import { type SalonContact, withSalonPlaceholders } from '@/lib/salon-placeholders'
import { cn } from '@/lib/utils'
import type { Form, FormField } from '@/types/database'

interface FormRendererProps {
  form: Form
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void
  isSubmitting?: boolean
  readOnly?: boolean
  salon?: SalonContact | null
}

const LABEL_CLASSES = 'block text-xs font-semibold uppercase tracking-[0.12em] text-foreground mb-2'

export function fieldDomId(name: string): string {
  return `field-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function errorMessages(errors: unknown[]): string[] {
  return errors.filter((error): error is string => typeof error === 'string' && error.length > 0)
}

function splitDescriptionLines(
  text: string,
): Array<{ key: string; text: string; isBullet: boolean }> {
  const seen = new Map<string, number>()
  const lines: Array<{ key: string; text: string; isBullet: boolean }> = []
  for (const rawLine of text.split('\n')) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue
    const occurrence = (seen.get(trimmed) ?? 0) + 1
    seen.set(trimmed, occurrence)
    lines.push({
      key: `${trimmed.slice(0, 32)}-${occurrence}`,
      text: trimmed,
      isBullet: /^[•·▪]/.test(trimmed),
    })
  }
  return lines
}

function errorNoun(count: number): string {
  if (count === 1) return 'błąd'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'błędy'
  return 'błędów'
}

/** Build a flat default-values map from the form schema fields */
function buildDefaultValues(fields: FormField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (normalizeFieldType(field.type) === 'separator') continue
    if (normalizeFieldType(field.type) === 'info') continue
    if (normalizeFieldType(field.type) === 'checkbox_group') {
      values[field.name] = [] as string[]
    } else if (normalizeFieldType(field.type) === 'checkbox') {
      values[field.name] = false
    } else {
      values[field.name] = ''
    }
  }
  return values
}

function isFieldFilled(field: FormField, values: Record<string, unknown>): boolean {
  const value = values[field.name]
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.trim().length > 0
  return value !== undefined && value !== null
}

function FieldError({ id, messages }: { id: string; messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <div id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <ul className="space-y-0.5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

export function FormRenderer({
  form,
  onSubmit,
  isSubmitting = false,
  readOnly = false,
  salon = null,
}: FormRendererProps) {
  const rawFields: FormField[] = ((form.schema as { fields?: FormField[] } | null)?.fields ??
    []) as FormField[]
  const fields: FormField[] = withSalonPlaceholders(rawFields, salon)
  const countableFields = fields.filter(
    (field) =>
      normalizeFieldType(field.type) !== 'separator' && normalizeFieldType(field.type) !== 'info',
  )
  // Pasek postępu liczy tylko pytania wymagane (fallback: wszystkie pytania).
  const requiredCountableFields = countableFields.filter((field) => field.required)
  const progressFields =
    requiredCountableFields.length > 0 ? requiredCountableFields : countableFields
  // Automatyczna numeracja pytań (stara numeracja w etykietach jest zdejmowana).
  const questionNumbers = new Map<string, number>()
  {
    let index = 0
    for (const field of fields) {
      const type = normalizeFieldType(field.type)
      if (type === 'separator' || type === 'info' || type === 'signature') continue
      index += 1
      questionNumbers.set(field.name, index)
    }
  }
  const fieldLabel = (field: FormField) => {
    const base = (field.label ?? '').replace(/^\s*\d{1,2}\s*[.)]\s+/, '').trimStart()
    const number = questionNumbers.get(field.name)
    return number ? `${number}. ${base}` : base
  }

  // Pytania tak/nie z pełnym zestawem odpowiedzi — dla przycisku „wszystkie na nie”.
  const yesNoFields = fields.filter((field) => {
    if (normalizeFieldType(field.type) !== 'radio') return false
    const options = field.options ?? []
    if (options.length !== 2) return false
    const labels = options.map((option) => option.label.trim().toLowerCase())
    return labels.includes('tak') && labels.includes('nie')
  })
  const noValueFor = (field: FormField) =>
    field.options?.find((option) => option.label.trim().toLowerCase() === 'nie')?.value
  const hasCustomSignatureField = fields.some(
    (field) => normalizeFieldType(field.type) === 'signature',
  )

  const allFields: FormField[] = hasCustomSignatureField
    ? fields
    : [...fields, { name: 'signature', label: 'Podpis klienta', type: 'signature', required: true }]

  const defaultValues: Record<string, unknown> = {
    ...buildDefaultValues(fields),
    ...(!hasCustomSignatureField ? { signature: '' } : {}),
  }

  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<Record<string, string[]>>({})
  const [announcement, setAnnouncement] = useState('')

  const tsForm = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  const inputClasses = (hasError: boolean) =>
    cn(
      'w-full min-h-11 rounded-xl border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:outline-none md:max-w-[65ch]',
      hasError
        ? 'border-destructive/60 focus:border-destructive focus:ring-destructive/20'
        : 'border-border focus:border-primary focus:ring-primary/30',
    )

  const validatorsFor = (field: FormField) => ({
    onBlur: ({ value }: { value: unknown }) => validateFieldValue(field, value)[0],
    onSubmit: ({ value }: { value: unknown }) => validateFieldValue(field, value)[0],
  })

  const focusField = (name: string) => {
    const wrapper = document.querySelector<HTMLElement>(`[data-field-name="${CSS.escape(name)}"]`)
    const byId = document.getElementById(fieldDomId(name))
    const scopes = [wrapper, byId].filter((element): element is HTMLElement => Boolean(element))

    for (const scope of scopes) {
      const candidates: HTMLElement[] = []
      if (scope.matches('input, select, textarea, button, canvas, [tabindex]')) {
        candidates.push(scope)
      }
      const inner = scope.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button, canvas, [tabindex]',
      )
      if (inner) candidates.push(inner)

      const target =
        candidates.find((element) => element.tabIndex >= 0) ??
        candidates.find((element) => element.tabIndex === -1) ??
        candidates[0]

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        window.setTimeout(() => {
          try {
            target.focus({ preventScroll: true })
          } catch {
            target.focus()
          }
        }, 90)
        return
      }

      scope.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
  }

  const markAllYesNoAsNo = () => {
    let count = 0
    for (const field of yesNoFields) {
      const value = noValueFor(field)
      if (value === undefined) continue
      tsForm.setFieldValue(field.name as never, value as never)
      count++
    }
    setSubmitErrors((previous) => {
      const next = { ...previous }
      for (const field of yesNoFields) delete next[field.name]
      return next
    })
    setAnnouncement(`Ustawiono odpowiedź „Nie” w ${count} pytaniach.`)
  }

  const resolveErrors = (name: string, metaErrors: unknown[]) =>
    submitErrors[name]?.length ? submitErrors[name] : errorMessages(metaErrors)

  const clearSubmitError = (target: EventTarget | null) => {
    const wrapper = (target as HTMLElement | null)?.closest?.('[data-field-name]')
    const name = wrapper?.getAttribute('data-field-name')
    if (!name) return
    setSubmitErrors((previous) => {
      if (!previous[name]) return previous
      const next = { ...previous }
      delete next[name]
      return next
    })
  }

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setSubmitAttempted(true)

    const values = tsForm.state.values as Record<string, unknown>
    const invalid: Array<{ field: FormField; messages: string[] }> = []

    for (const field of allFields) {
      const messages = validateFieldValue(field, values[field.name])
      if (messages.length > 0) {
        invalid.push({ field, messages })
        tsForm.setFieldMeta(field.name as never, (previous) => ({ ...previous, errors: messages }))
      }
    }

    if (invalid.length > 0) {
      setSubmitErrors(
        Object.fromEntries(invalid.map((entry) => [entry.field.name, entry.messages])),
      )
      setAnnouncement(
        `Formularz zawiera ${invalid.length} ${errorNoun(invalid.length)}. Przejdź do pierwszego błędu.`,
      )
      requestAnimationFrame(() => focusField(invalid[0].field.name))
      return
    }

    setSubmitErrors({})
    setAnnouncement('')
    try {
      await tsForm.handleSubmit()
    } catch {
      // The parent component surfaces submission errors.
    }
  }

  const renderField = (field: FormField) => {
    const fieldId = fieldDomId(field.name)
    const errorId = `${fieldId}-error`
    const descriptionId = field.description ? `${fieldId}-description` : undefined
    const validators = validatorsFor(field)
    const isDisabled = field.disabled || readOnly

    switch (normalizeFieldType(field.type)) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              const isEmail = normalizeFieldType(field.type) === 'email'
              const isTel = normalizeFieldType(field.type) === 'tel'
              const isNumber = normalizeFieldType(field.type) === 'number'
              return (
                <>
                  <input
                    id={fieldId}
                    value={(f.state.value as string) ?? ''}
                    onChange={(e) => f.handleChange(e.target.value)}
                    onBlur={f.handleBlur}
                    type={isNumber ? 'number' : isEmail ? 'email' : isTel ? 'tel' : 'text'}
                    inputMode={isTel ? 'tel' : isNumber ? 'numeric' : undefined}
                    autoComplete={isEmail ? 'email' : isTel ? 'tel' : undefined}
                    placeholder={field.placeholder}
                    disabled={isDisabled}
                    aria-invalid={hasError || undefined}
                    aria-required={field.required || undefined}
                    aria-describedby={describedBy}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className={inputClasses(hasError)}
                  />
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'textarea':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              return (
                <>
                  <textarea
                    id={fieldId}
                    value={(f.state.value as string) ?? ''}
                    onChange={(e) => f.handleChange(e.target.value)}
                    onBlur={f.handleBlur}
                    placeholder={field.placeholder}
                    disabled={isDisabled}
                    rows={4}
                    aria-invalid={hasError || undefined}
                    aria-required={field.required || undefined}
                    aria-describedby={describedBy}
                    className={inputClasses(hasError)}
                  />
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'select':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              return (
                <>
                  <div className="relative">
                    <select
                      id={fieldId}
                      value={(f.state.value as string) ?? ''}
                      onChange={(e) => f.handleChange(e.target.value)}
                      onBlur={f.handleBlur}
                      disabled={isDisabled}
                      aria-invalid={hasError || undefined}
                      aria-required={field.required || undefined}
                      aria-describedby={describedBy}
                      className={cn(inputClasses(hasError), 'appearance-none pr-10')}
                    >
                      <option value="">{field.placeholder || 'Wybierz...'}</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground">
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'checkbox_group':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              return (
                <>
                  <fieldset
                    id={fieldId}
                    tabIndex={-1}
                    aria-invalid={hasError || undefined}
                    aria-describedby={describedBy}
                    className="m-0 space-y-2 border-0 p-0"
                  >
                    <legend className={LABEL_CLASSES}>
                      {fieldLabel(field)}
                      {field.required && (
                        <span className="ml-1 text-destructive" aria-hidden="true">
                          *
                        </span>
                      )}
                    </legend>
                    {field.options?.map((option, index) => {
                      const optionId = `${fieldId}-${index}`
                      const checked = Array.isArray(f.state.value)
                        ? (f.state.value as string[]).includes(option.value)
                        : false
                      return (
                        <label
                          key={option.value}
                          htmlFor={optionId}
                          className="flex min-h-11 cursor-pointer items-center gap-3"
                        >
                          <input
                            id={optionId}
                            type="checkbox"
                            checked={checked}
                            disabled={isDisabled}
                            onBlur={f.handleBlur}
                            onChange={() => {
                              const current = Array.isArray(f.state.value)
                                ? (f.state.value as string[])
                                : []
                              f.handleChange(
                                checked
                                  ? current.filter((value) => value !== option.value)
                                  : [...current, option.value],
                              )
                            }}
                            className="h-6 w-6 rounded border-border accent-primary text-primary focus:ring-primary/30 transition-all"
                          />
                          <span className="text-foreground transition-colors">{option.label}</span>
                        </label>
                      )
                    })}
                  </fieldset>
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'checkbox':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              return (
                <>
                  <label
                    htmlFor={fieldId}
                    className="flex min-h-11 cursor-pointer items-center gap-3"
                  >
                    <input
                      id={fieldId}
                      type="checkbox"
                      checked={!!f.state.value}
                      disabled={isDisabled}
                      onChange={(e) => f.handleChange(e.target.checked)}
                      onBlur={f.handleBlur}
                      aria-invalid={hasError || undefined}
                      aria-required={field.required || undefined}
                      aria-describedby={describedBy}
                      className="h-6 w-6 rounded border-border accent-primary text-primary focus:ring-primary/30 transition-all"
                    />
                    <span className="text-foreground transition-colors">
                      {fieldLabel(field)}
                      {field.required && (
                        <span className="ml-1 text-destructive" aria-hidden="true">
                          *
                        </span>
                      )}
                    </span>
                  </label>
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'radio':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              return (
                <>
                  <div
                    id={fieldId}
                    role="radiogroup"
                    tabIndex={-1}
                    aria-invalid={hasError || undefined}
                    aria-required={field.required || undefined}
                    aria-describedby={describedBy}
                    aria-labelledby={`${fieldId}-legend`}
                    className="m-0 space-y-2"
                  >
                    <p id={`${fieldId}-legend`} className={LABEL_CLASSES}>
                      {fieldLabel(field)}
                      {field.required && (
                        <span className="ml-1 text-destructive" aria-hidden="true">
                          *
                        </span>
                      )}
                    </p>
                    {field.options?.map((option, index) => {
                      const optionId = `${fieldId}-${index}`
                      return (
                        <label
                          key={option.value}
                          htmlFor={optionId}
                          className="flex min-h-11 cursor-pointer items-center gap-3"
                        >
                          <input
                            id={optionId}
                            type="radio"
                            name={fieldId}
                            value={option.value}
                            checked={f.state.value === option.value}
                            disabled={isDisabled}
                            onChange={() => f.handleChange(option.value)}
                            onBlur={f.handleBlur}
                            className="h-6 w-6 border-border accent-primary text-primary focus:ring-primary/30 transition-all"
                          />
                          <span className="text-foreground transition-colors">{option.label}</span>
                        </label>
                      )
                    })}
                  </div>
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'date':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              return (
                <>
                  <DatePicker
                    id={fieldId}
                    date={f.state.value ? new Date(f.state.value as string) : undefined}
                    setDate={(date) => f.handleChange(date ? date.toISOString() : '')}
                    placeholder={field.placeholder || 'Wybierz datę'}
                    disabled={isDisabled}
                    aria-invalid={hasError || undefined}
                    aria-required={field.required || undefined}
                    aria-describedby={describedBy}
                    className={hasError ? 'border-destructive/60' : undefined}
                  />
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'signature':
        return (
          <tsForm.Field name={field.name} validators={validators}>
            {(f) => {
              const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
              const hasError = errors.length > 0
              const describedBy =
                [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined
              return (
                <>
                  <fieldset
                    id={fieldId}
                    tabIndex={-1}
                    aria-invalid={hasError || undefined}
                    aria-describedby={describedBy}
                    className="m-0 border-0 p-0"
                  >
                    <legend className={LABEL_CLASSES}>
                      {fieldLabel(field)}
                      {field.required && (
                        <span className="ml-1 text-destructive" aria-hidden="true">
                          *
                        </span>
                      )}
                    </legend>
                    <SignaturePad
                      value={f.state.value as string}
                      onChange={f.handleChange}
                      disabled={isDisabled}
                    />
                  </fieldset>
                  <FieldError id={errorId} messages={errors} />
                </>
              )
            }}
          </tsForm.Field>
        )

      case 'separator':
        return (
          <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-5">
            <p className="m-0 max-w-[65ch] whitespace-pre-wrap text-base font-medium leading-relaxed text-foreground">
              {field.label}
            </p>
          </div>
        )

      case 'info':
        return (
          <section className="rounded-xl bg-muted/60 p-5">
            {field.label && (
              <h3 className="mb-2 font-serif text-base text-foreground">{field.label}</h3>
            )}
            {field.description && (
              <div className="max-w-[65ch] space-y-1.5 text-sm leading-relaxed text-foreground/90">
                {splitDescriptionLines(field.description).map((line) => (
                  <p key={line.key} className={line.isBullet ? 'pl-4 -indent-4' : undefined}>
                    {line.text}
                  </p>
                ))}
              </div>
            )}
          </section>
        )

      default:
        return null
    }
  }

  const globalSignatureFields: FormField[] = hasCustomSignatureField
    ? []
    : [{ name: 'signature', label: 'Podpis klienta', type: 'signature', required: true }]

  return (
    <form
      noValidate
      onSubmit={handleFormSubmit}
      onChangeCapture={(event) => clearSubmitError(event.target)}
      onInputCapture={(event) => clearSubmitError(event.target)}
      className="space-y-6"
    >
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {submitAttempted && Object.keys(submitErrors).length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="font-semibold text-destructive">
            Formularz zawiera {Object.keys(submitErrors).length}{' '}
            {errorNoun(Object.keys(submitErrors).length)}. Popraw pola poniżej:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">
            {allFields
              .filter((field) => submitErrors[field.name]?.length)
              .map((field) => (
                <li key={field.name}>
                  <a
                    href={`#${fieldDomId(field.name)}`}
                    className="underline underline-offset-2"
                    onClick={(event) => {
                      event.preventDefault()
                      focusField(field.name)
                    }}
                  >
                    {fieldLabel(field) || field.name}: {submitErrors[field.name][0]}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

      {progressFields.length > 0 && (
        <tsForm.Subscribe selector={(state) => state.values}>
          {(values) => {
            const filledCount = progressFields.filter((field) =>
              isFieldFilled(field, values),
            ).length
            const progress = (filledCount / progressFields.length) * 100
            return (
              <div
                className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 space-y-2 border-b border-border/60 bg-background/95 px-6 pb-3 pt-6 backdrop-blur sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-8"
                role="progressbar"
                aria-label="Postęp formularza"
                aria-valuemin={0}
                aria-valuemax={progressFields.length}
                aria-valuenow={filledCount}
                aria-valuetext={`Wypełniono ${filledCount} z ${progressFields.length} wymaganych pól`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Postęp formularza
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary tabular-nums">
                    {filledCount} / {progressFields.length}
                  </p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          }}
        </tsForm.Subscribe>
      )}

      {fields.map((field) => {
        const type = normalizeFieldType(field.type)
        const fieldId = fieldDomId(field.name)
        const selfLabeled =
          type === 'checkbox' ||
          type === 'separator' ||
          type === 'info' ||
          type === 'radio' ||
          type === 'checkbox_group' ||
          type === 'signature'
        return (
          <div key={field.name} data-field-name={field.name} className="scroll-mt-28 space-y-1.5">
            {!selfLabeled && (
              <label htmlFor={fieldId} className={LABEL_CLASSES}>
                {fieldLabel(field)}
                {field.required && (
                  <span className="ml-1 text-destructive" aria-hidden="true">
                    *
                  </span>
                )}
              </label>
            )}
            {renderField(field)}
            {field.description && type !== 'separator' && type !== 'info' && (
              <p
                id={`${fieldId}-description`}
                className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground"
              >
                {field.description}
              </p>
            )}
          </div>
        )
      })}

      {globalSignatureFields.map((field) => {
        const fieldId = fieldDomId(field.name)
        const errorId = `${fieldId}-error`
        return (
          <div
            key={field.name}
            data-field-name={field.name}
            className="mt-8 scroll-mt-28 border-t border-border pt-6"
          >
            <tsForm.Field name={field.name} validators={validatorsFor(field)}>
              {(f) => {
                const errors = resolveErrors(field.name, f.state.meta.errors as unknown[])
                const hasError = errors.length > 0
                return (
                  <>
                    <fieldset
                      id={fieldId}
                      tabIndex={-1}
                      aria-invalid={hasError || undefined}
                      aria-describedby={hasError ? errorId : undefined}
                      className="m-0 border-0 p-0"
                    >
                      <legend className={LABEL_CLASSES}>
                        {field.label}
                        <span className="ml-1 text-destructive" aria-hidden="true">
                          *
                        </span>
                      </legend>
                      <SignaturePad
                        value={f.state.value as string}
                        onChange={f.handleChange}
                        disabled={isSubmitting || readOnly}
                      />
                    </fieldset>
                    <FieldError id={errorId} messages={errors} />
                  </>
                )
              }}
            </tsForm.Field>
          </div>
        )
      })}

      {!readOnly && yesNoFields.length >= 5 && (
        <div className="pointer-events-none sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-end print-hidden">
          <Button
            type="button"
            size="lg"
            onClick={markAllYesNoAsNo}
            className="pointer-events-auto min-h-12 gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.08em] shadow-[0_8px_24px_rgb(111_89_87/0.35)]"
            aria-label={`Zaznacz wszystkie ${yesNoFields.length} pytań tak/nie na „Nie”`}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Wszystkie na nie
          </Button>
        </div>
      )}

      {!readOnly && (
        <tsForm.Subscribe
          selector={(state) => ({ values: state.values, isSubmitting: state.isSubmitting })}
        >
          {({ values, isSubmitting: formSubmitting }) => {
            const busy = isSubmitting || formSubmitting
            const requiredFields = allFields.filter(
              (field) =>
                field.required &&
                normalizeFieldType(field.type) !== 'separator' &&
                normalizeFieldType(field.type) !== 'info',
            )
            const missingRequired = requiredFields.filter(
              (field) => !isFieldFilled(field, values),
            ).length
            const canSubmit = missingRequired === 0

            return (
              <>
                <Button
                  type="submit"
                  disabled={busy || !canSubmit}
                  size="lg"
                  className="mt-2 w-full min-h-12 gap-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  aria-describedby={!canSubmit ? 'form-submit-hint' : undefined}
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {busy ? 'Wysyłanie...' : 'Wyślij formularz'}
                </Button>
                {!canSubmit && (
                  <p
                    id="form-submit-hint"
                    role="status"
                    className="text-center text-xs leading-relaxed text-muted-foreground"
                  >
                    Uzupełnij wszystkie wymagane pola oraz podpis, aby wysłać formularz.
                  </p>
                )}
              </>
            )
          }}
        </tsForm.Subscribe>
      )}
    </form>
  )
}
