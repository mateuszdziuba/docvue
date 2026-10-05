import { z } from 'zod'
import type { FormField } from '@/types/database'

export const MAX_FIELD_TEXT_LENGTH = 5000
export const MAX_SIGNATURE_LENGTH = 500_000
export const MAX_OPTION_COUNT = 200
export const MAX_OPTION_LENGTH = 200

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type NormalizedFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox_group'
  | 'checkbox'
  | 'date'
  | 'email'
  | 'tel'
  | 'number'
  | 'signature'
  | 'separator'
  | 'info'

const TYPE_ALIASES: Record<string, string> = {
  Input: 'text',
  Textarea: 'textarea',
  Select: 'select',
  Radio: 'radio',
  Checkbox: 'checkbox',
  Date: 'date',
  Signature: 'signature',
}

const NORMALIZED_TYPES = new Set<string>([
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox_group',
  'checkbox',
  'date',
  'email',
  'tel',
  'number',
  'signature',
  'separator',
  'info',
])

export function normalizeFieldType(type: string): NormalizedFieldType {
  const mapped = TYPE_ALIASES[type] ?? type
  return (NORMALIZED_TYPES.has(mapped) ? mapped : 'text') as NormalizedFieldType
}

export function getRequiredMessage(field: FormField): string {
  switch (normalizeFieldType(field.type)) {
    case 'email':
      return 'Podaj adres e-mail, np. anna@przyklad.pl'
    case 'tel':
      return 'Podaj pełny numer telefonu, np. 500 123 456'
    case 'date':
      return 'Wybierz datę z kalendarza'
    case 'select':
      return 'Wybierz wartość z listy rozwijanej'
    case 'checkbox_group':
      return 'Zaznacz przynajmniej jedną opcję'
    case 'checkbox':
      return 'Zaznacz to pole, aby kontynuować'
    case 'radio':
      return 'Wybierz jedną z opcji'
    case 'signature':
      return 'Podpis przed przystąpieniem do zabiegu jest wymagany'
    default:
      return 'Uzupełnij to pole, aby kontynuować'
  }
}

export function getEmailFormatMessage(): string {
  return 'To nie wygląda na poprawny adres e-mail — sprawdź, czy nie brakuje np. znaku „@domena.pl"'
}

export function getTelFormatMessage(): string {
  return 'Podaj pełny numer telefonu, np. 500 123 456'
}

export function getNumberFormatMessage(): string {
  return 'Podaj wartość liczbową, np. 12'
}

export function slugifyOptionValue(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function uniqueOptionValue(
  label: string,
  options: Array<{ value: string }>,
  currentIndex: number,
  fallbackIndex: number,
): string {
  const base = slugifyOptionValue(label) || `option_${fallbackIndex + 1}`
  let candidate = base
  let suffix = 2
  while (options.some((option, index) => index !== currentIndex && option.value === candidate)) {
    candidate = `${base}_${suffix}`
    suffix += 1
  }
  return candidate
}

function requiredStringSchema(field: FormField, base: z.ZodTypeAny): z.ZodTypeAny {
  const withEmptyDefault = z.preprocess(
    (value) => (value === undefined || value === null ? '' : value),
    base,
  )
  if (!field.required) return withEmptyDefault.optional()
  return withEmptyDefault.superRefine((value, ctx) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: getRequiredMessage(field) })
    }
  })
}

export function buildFieldZodSchema(field: FormField): z.ZodTypeAny {
  const type = normalizeFieldType(field.type)
  const optionValues = (field.options ?? []).map((option) => option.value)

  switch (type) {
    case 'checkbox': {
      const schema = z.boolean()
      if (!field.required) return schema.optional()
      return z.preprocess(
        (value) => value ?? false,
        schema.refine((value) => value === true, {
          message: getRequiredMessage(field),
        }),
      )
    }

    case 'checkbox_group': {
      const listSchema = z.array(z.string().max(MAX_OPTION_LENGTH)).max(MAX_OPTION_COUNT)
      const withOptions =
        optionValues.length > 0
          ? listSchema.refine((values) => values.every((value) => optionValues.includes(value)), {
              message: 'Wybrano nieprawidłową opcję',
            })
          : listSchema
      if (!field.required) return withOptions.optional()
      return z.preprocess(
        (value) => value ?? [],
        withOptions.refine((values) => values.length > 0, {
          message: getRequiredMessage(field),
        }),
      )
    }

    case 'select':
    case 'radio': {
      const stringSchema = z.string().max(MAX_FIELD_TEXT_LENGTH, {
        message: `Maksymalna długość to ${MAX_FIELD_TEXT_LENGTH} znaków`,
      })
      const withOptions =
        optionValues.length > 0
          ? stringSchema.refine((value) => value === '' || optionValues.includes(value), {
              message: 'Wybrano nieprawidłową opcję',
            })
          : stringSchema
      return requiredStringSchema(field, withOptions)
    }

    case 'signature': {
      const schema = z.string().max(MAX_SIGNATURE_LENGTH, {
        message: 'Podpis jest zbyt duży',
      })
      return requiredStringSchema(field, schema)
    }

    default: {
      const schema = z
        .string()
        .max(MAX_FIELD_TEXT_LENGTH, {
          message: `Maksymalna długość to ${MAX_FIELD_TEXT_LENGTH} znaków`,
        })
        .superRefine((value, ctx) => {
          if (value.trim().length === 0) return
          if (type === 'email' && !EMAIL_PATTERN.test(value.trim())) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: getEmailFormatMessage() })
          }
          if (type === 'tel' && !/\d/.test(value)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: getTelFormatMessage() })
          }
          if (type === 'number' && !/^-?\d+([.,]\d+)?$/.test(value.trim())) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: getNumberFormatMessage() })
          }
        })
      return requiredStringSchema(field, schema)
    }
  }
}

export function buildFormValidationSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    if (normalizeFieldType(field.type) === 'separator' || normalizeFieldType(field.type) === 'info' || field.disabled) {
      shape[field.name] = z.unknown().optional()
      continue
    }
    shape[field.name] = buildFieldZodSchema(field)
  }
  return z.object(shape).strict()
}

export function validateFieldValue(field: FormField, value: unknown): string[] {
  const result = buildFieldZodSchema(field).safeParse(value)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.message)
}

export interface FormValidationResult {
  success: boolean
  data?: Record<string, unknown>
  errors: Record<string, string[]>
}

function issueMessage(issue: z.ZodIssue): string {
  if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    return 'Formularz zawiera nieznane pola'
  }
  return issue.message
}

export function validateFormSubmission(
  fields: FormField[],
  values: Record<string, unknown>,
): FormValidationResult {
  const result = buildFormValidationSchema(fields).safeParse(values)
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown>, errors: {} }
  }

  const errors: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form'
    if (!errors[key]) errors[key] = []
    errors[key].push(issueMessage(issue))
  }

  return { success: false, errors }
}

export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages = Object.values(errors).flat()
  if (messages.length === 0) return 'Formularz zawiera błędy. Popraw zaznaczone pola.'
  return `Popraw formularz: ${messages.slice(0, 4).join(' ')}`
}
