'use client'

import { useForm } from '@tanstack/react-form'
import SignaturePad from '@/components/ui/signature-pad'
import { DatePicker } from '@/components/ui/date-picker'
import type { Form, FormField } from '@/types/database'

interface FormRendererProps {
  form: Form
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  isSubmitting?: boolean
}

/** Build a flat default-values map from the form schema fields */
function buildDefaultValues(fields: FormField[]): Record<string, unknown> {
  return Object.fromEntries(
    fields.map((f) => {
      if (f.type === 'checkbox_group') return [f.name, [] as string[]]
      if (f.type === 'checkbox' || f.type === 'Checkbox') return [f.name, false]
      return [f.name, '']
    }),
  )
}

export function FormRenderer({ form, onSubmit, isSubmitting }: FormRendererProps) {
  const fields: FormField[] = (form.schema as any)?.fields || []
  const hasCustomSignatureField = fields.some(
    (f) => f.type === 'signature' || f.type === 'Signature',
  )

  const defaultValues: Record<string, unknown> = {
    ...buildDefaultValues(fields),
    ...(!hasCustomSignatureField ? { signature: '' } : {}),
  }

  const tsForm = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  const commonClasses =
    'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all'

  const renderField = (field: FormField) => {
    const required = field.required
    const requiredValidator = ({ value }: { value: unknown }) => {
      if (!required) return undefined
      if (value === '' || value === null || value === undefined) return 'To pole jest wymagane'
      if (Array.isArray(value) && value.length === 0) return 'To pole jest wymagane'
      return undefined
    }

    switch (field.type) {
      case 'Input':
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <tsForm.Field
            name={field.name}
            validators={{ onBlur: requiredValidator }}
          >
            {(f) => (
              <>
                <input
                  value={(f.state.value as string) ?? ''}
                  onChange={(e) => f.handleChange(e.target.value)}
                  onBlur={f.handleBlur}
                  type={field.type === 'Input' ? 'text' : field.type}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className={commonClasses}
                />
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )

      case 'Textarea':
      case 'textarea':
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <>
                <textarea
                  value={(f.state.value as string) ?? ''}
                  onChange={(e) => f.handleChange(e.target.value)}
                  onBlur={f.handleBlur}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  rows={4}
                  className={commonClasses}
                />
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )

      case 'Select':
      case 'select':
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <>
                <div className="relative">
                  <select
                    value={(f.state.value as string) ?? ''}
                    onChange={(e) => f.handleChange(e.target.value)}
                    onBlur={f.handleBlur}
                    disabled={field.disabled}
                    className={`${commonClasses} appearance-none`}
                  >
                    <option value="">{field.placeholder || 'Wybierz...'}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )

      case 'checkbox_group':
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <>
                <div className="space-y-2">
                  {field.options?.map((option) => {
                    const checked = Array.isArray(f.state.value)
                      ? (f.state.value as string[]).includes(option.value)
                      : false
                    return (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={field.disabled}
                          onChange={() => {
                            const current = Array.isArray(f.state.value)
                              ? (f.state.value as string[])
                              : []
                            f.handleChange(
                              checked
                                ? current.filter((v) => v !== option.value)
                                : [...current, option.value],
                            )
                          }}
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary/30 transition-all"
                        />
                        <span className="text-foreground group-hover:text-primary transition-colors">
                          {option.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )

      case 'Checkbox':
      case 'checkbox':
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!f.state.value}
                  disabled={field.disabled}
                  onChange={(e) => f.handleChange(e.target.checked)}
                  onBlur={f.handleBlur}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary/30 transition-all"
                />
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {field.label}
                </span>
              </label>
            )}
          </tsForm.Field>
        )

      case 'Radio':
      case 'radio':
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <>
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        value={option.value}
                        checked={f.state.value === option.value}
                        disabled={field.disabled}
                        onChange={() => f.handleChange(option.value)}
                        onBlur={f.handleBlur}
                        className="w-5 h-5 border-border text-primary focus:ring-primary/30 transition-all"
                      />
                      <span className="text-foreground group-hover:text-primary transition-colors">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )

      case 'Date':
      case 'date':
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <>
                <DatePicker
                  date={f.state.value ? new Date(f.state.value as string) : undefined}
                  setDate={(date) => f.handleChange(date ? date.toISOString() : '')}
                  placeholder={field.placeholder || 'Wybierz datę'}
                  disabled={field.disabled}
                />
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )

      case 'signature':
      case 'Signature':
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <>
                <SignaturePad
                  value={f.state.value as string}
                  onChange={f.handleChange}
                  disabled={field.disabled}
                />
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )

      case 'separator':
        return (
          <div className="p-4 rounded-xl border-l-4 border-primary bg-primary/5 prose dark:prose-invert max-w-none">
            <p className="text-foreground font-medium whitespace-pre-wrap text-base leading-relaxed m-0">
              {field.label}
            </p>
          </div>
        )

      default:
        return (
          <tsForm.Field name={field.name} validators={{ onBlur: requiredValidator }}>
            {(f) => (
              <>
                <input
                  value={(f.state.value as string) ?? ''}
                  onChange={(e) => f.handleChange(e.target.value)}
                  onBlur={f.handleBlur}
                  type="text"
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className={commonClasses}
                />
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        )
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void tsForm.handleSubmit()
      }}
      className="space-y-6"
    >
      {fields.map((field: FormField) => (
        <div key={field.name}>
          {field.type !== 'checkbox' && field.type !== 'Checkbox' && field.type !== 'separator' && (
            <label className="block text-sm font-medium text-foreground mb-2">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          {renderField(field)}
          {field.description && (
            <p className="mt-1 text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      ))}

      {!hasCustomSignatureField && (
        <div className="mt-8 pt-6 border-t border-border">
          <label className="block text-sm font-medium text-foreground mb-2">
            Podpis klienta
            <span className="text-destructive ml-1">*</span>
          </label>
          <tsForm.Field
            name="signature"
            validators={{
              onSubmit: ({ value }) =>
                !value ? 'Podpis przed przystąpieniem do zabiegu jest wymagany.' : undefined,
            }}
          >
            {(f) => (
              <>
                <SignaturePad
                  value={f.state.value as string}
                  onChange={f.handleChange}
                  disabled={isSubmitting}
                />
                {f.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-destructive">{f.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </tsForm.Field>
        </div>
      )}

      <tsForm.Subscribe selector={(state) => state.isSubmitting}>
        {(submitting) => (
          <button
            type="submit"
            disabled={isSubmitting || submitting}
            className="w-full py-4 px-6 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || submitting ? 'Wysyłanie...' : 'Wyślij formularz'}
          </button>
        )}
      </tsForm.Subscribe>
    </form>
  )
}
