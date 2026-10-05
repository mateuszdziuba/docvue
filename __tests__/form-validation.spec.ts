import { describe, expect, it } from 'vitest'
import {
  buildFieldZodSchema,
  formatValidationErrors,
  normalizeFieldType,
  slugifyOptionValue,
  uniqueOptionValue,
  validateFieldValue,
  validateFormSubmission,
} from '../lib/form-validation'
import type { FormField } from '../types/database'

function field(partial: Partial<FormField> & { name: string; type: string }): FormField {
  return { label: partial.name, required: false, ...partial }
}

describe('normalizeFieldType', () => {
  it('maps legacy capitalized types to normalized types', () => {
    expect(normalizeFieldType('Input')).toBe('text')
    expect(normalizeFieldType('Textarea')).toBe('textarea')
    expect(normalizeFieldType('Select')).toBe('select')
    expect(normalizeFieldType('Radio')).toBe('radio')
    expect(normalizeFieldType('Checkbox')).toBe('checkbox')
    expect(normalizeFieldType('Date')).toBe('date')
    expect(normalizeFieldType('Signature')).toBe('signature')
  })

  it('falls back to text for unknown types', () => {
    expect(normalizeFieldType('mystery')).toBe('text')
  })
})

describe('buildFieldZodSchema', () => {
  it('rejects empty required text', () => {
    const result = buildFieldZodSchema(
      field({ name: 'imie', type: 'text', required: true }),
    ).safeParse('')
    expect(result.success).toBe(false)
  })

  it('accepts optional empty text', () => {
    const result = buildFieldZodSchema(field({ name: 'imie', type: 'text' })).safeParse('')
    expect(result.success).toBe(true)
  })

  it('validates email format', () => {
    const schema = buildFieldZodSchema(field({ name: 'email', type: 'email', required: true }))
    expect(schema.safeParse('anna@przyklad.pl').success).toBe(true)
    expect(schema.safeParse('anna[at]przyklad.pl').success).toBe(false)
    const missing = schema.safeParse('')
    expect(missing.success).toBe(false)
    if (!missing.success) {
      expect(missing.error.issues[0].message).toContain('adres e-mail')
    }
  })

  it('requires at least one digit for tel', () => {
    const schema = buildFieldZodSchema(field({ name: 'tel', type: 'tel', required: true }))
    expect(schema.safeParse('500 123 456').success).toBe(true)
    expect(schema.safeParse('brak numeru').success).toBe(false)
  })

  it('enforces max text length', () => {
    const schema = buildFieldZodSchema(field({ name: 'opis', type: 'textarea' }))
    expect(schema.safeParse('a'.repeat(5000)).success).toBe(true)
    expect(schema.safeParse('a'.repeat(5001)).success).toBe(false)
  })

  it('requires a checkbox to be checked', () => {
    const schema = buildFieldZodSchema(field({ name: 'zgoda', type: 'checkbox', required: true }))
    expect(schema.safeParse(false).success).toBe(false)
    expect(schema.safeParse(true).success).toBe(true)
  })

  it('requires at least one option for checkbox_group', () => {
    const schema = buildFieldZodSchema(
      field({
        name: 'zabiegi',
        type: 'checkbox_group',
        required: true,
        options: [
          { label: 'Peeling', value: 'peeling' },
          { label: 'Masaż', value: 'masaz' },
        ],
      }),
    )
    expect(schema.safeParse([]).success).toBe(false)
    expect(schema.safeParse(['peeling']).success).toBe(true)
    expect(schema.safeParse(['nieznana']).success).toBe(false)
  })

  it('rejects select values outside the option list', () => {
    const schema = buildFieldZodSchema(
      field({
        name: 'wybor',
        type: 'select',
        required: true,
        options: [{ label: 'Tak', value: 'tak' }],
      }),
    )
    expect(schema.safeParse('tak').success).toBe(true)
    expect(schema.safeParse('nie').success).toBe(false)
    expect(schema.safeParse('').success).toBe(false)
  })

  it('accepts a typed signature but not an empty required one', () => {
    const schema = buildFieldZodSchema(
      field({ name: 'signature', type: 'signature', required: true }),
    )
    expect(schema.safeParse('Anna Kowalska').success).toBe(true)
    expect(schema.safeParse('').success).toBe(false)
  })
})

describe('validateFormSubmission', () => {
  const fields: FormField[] = [
    field({ name: 'imie', type: 'text', required: true }),
    field({ name: 'email', type: 'email', required: true }),
    field({ name: 'tel', type: 'tel' }),
    field({
      name: 'zgody',
      type: 'checkbox_group',
      required: true,
      options: [{ label: 'RODO', value: 'rodo' }],
    }),
  ]

  it('accepts valid data', () => {
    const result = validateFormSubmission(fields, {
      imie: 'Anna',
      email: 'anna@przyklad.pl',
      tel: '500123456',
      zgody: ['rodo'],
    })
    expect(result.success).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('reports missing required fields', () => {
    const result = validateFormSubmission(fields, {
      email: 'anna@przyklad.pl',
      zgody: ['rodo'],
    })
    expect(result.success).toBe(false)
    expect(result.errors.imie?.[0]).toContain('Uzupełnij')
  })

  it('reports invalid email', () => {
    const result = validateFormSubmission(fields, {
      imie: 'Anna',
      email: 'zly-email',
      zgody: ['rodo'],
    })
    expect(result.success).toBe(false)
    expect(result.errors.email?.[0]).toContain('adres e-mail')
  })

  it('rejects unknown keys', () => {
    const result = validateFormSubmission(fields, {
      imie: 'Anna',
      email: 'anna@przyklad.pl',
      zgody: ['rodo'],
      hacked: 'value',
    })
    expect(result.success).toBe(false)
    expect(result.errors._form?.[0]).toContain('nieznane pola')
  })

  it('ignores separator fields', () => {
    const withSeparator = [...fields, field({ name: 'sep', type: 'separator' })]
    const result = validateFormSubmission(withSeparator, {
      imie: 'Anna',
      email: 'anna@przyklad.pl',
      zgody: ['rodo'],
      sep: '',
    })
    expect(result.success).toBe(true)
  })

  it('strips unknown keys when strict schema is bypassed', () => {
    const result = formatValidationErrors({ imie: ['Uzupełnij to pole'] })
    expect(result).toContain('Uzupełnij to pole')
  })
})

describe('validateFieldValue', () => {
  it('returns all messages for a field', () => {
    const messages = validateFieldValue(field({ name: 'email', type: 'email', required: true }), '')
    expect(messages.length).toBeGreaterThan(0)
  })

  it('returns no messages for a valid value', () => {
    expect(
      validateFieldValue(field({ name: 'imie', type: 'text', required: true }), 'Anna'),
    ).toEqual([])
  })
})

describe('option value helpers', () => {
  it('slugifies Polish labels', () => {
    expect(slugifyOptionValue('Opcja Żółć')).toBe('opcja_zolc')
  })

  it('avoids collisions with other option values', () => {
    const options = [{ value: 'tak' }, { value: 'custom' }]
    expect(uniqueOptionValue('Tak', options, 1, 1)).toBe('tak_2')
  })

  it('allows an option to keep its own value', () => {
    const options = [{ value: 'custom_value' }]
    expect(uniqueOptionValue('Custom Value', options, 0, 0)).toBe('custom_value')
  })

  it('falls back to an indexed value for empty labels', () => {
    expect(uniqueOptionValue('   ', [], 0, 2)).toBe('option_3')
  })
})
