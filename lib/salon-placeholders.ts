import type { FormField } from '@/types/database'

export interface SalonContact {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  social_media?: string | null
  city?: string | null
}

const FALLBACK = '—'

export const SALON_TOKENS: { token: string; label: string }[] = [
  { token: '[PEŁNA NAZWA GABINETU]', label: 'Nazwa gabinetu' },
  { token: '[ADRES]', label: 'Adres' },
  { token: '[MIASTO]', label: 'Miasto' },
  { token: '[TELEFON]', label: 'Telefon' },
  { token: '[E-MAIL GABINETU]', label: 'E-mail' },
  { token: '[ADRES STRONY]', label: 'Strona internetowa' },
  { token: '[PORTALE SPOŁECZNOŚCIOWE]', label: 'Portale społecznościowe' },
]

const TOKEN_MAP: Array<{ token: RegExp; key: keyof SalonContact }> = [
  { token: /\[PEŁNA NAZWA GABINETU\]/gi, key: 'name' },
  { token: /\[NAZWA GABINETU\]/gi, key: 'name' },
  { token: /\[PEŁNY ADRES\]/gi, key: 'address' },
  { token: /\[ADRES\]/gi, key: 'address' },
  { token: /\[MIASTO\]/gi, key: 'city' },
  { token: /\[TELEFON\]/gi, key: 'phone' },
  { token: /\[E-MAIL GABINETU\]/gi, key: 'email' },
  { token: /\[EMAIL\]/gi, key: 'email' },
  { token: /\[ADRES STRONY\]/gi, key: 'website' },
  { token: /\[STRONA WWW\]/gi, key: 'website' },
  { token: /\[PORTALE SPOŁECZNOŚCIOWE\]/gi, key: 'social_media' },
]

export function applySalonPlaceholders(
  text: string | null | undefined,
  salon?: SalonContact | null,
): string {
  if (!text) return ''
  let output = text
  for (const { token, key } of TOKEN_MAP) {
    const value = (salon?.[key] as string | null | undefined)?.trim() || FALLBACK
    output = output.replace(token, value)
  }
  return output
}

export function withSalonPlaceholders(
  fields: FormField[],
  salon?: SalonContact | null,
): FormField[] {
  return fields.map((field) => ({
    ...field,
    label: applySalonPlaceholders(field.label, salon),
    description: field.description
      ? applySalonPlaceholders(field.description, salon)
      : field.description,
    placeholder: field.placeholder
      ? applySalonPlaceholders(field.placeholder, salon)
      : field.placeholder,
    options: field.options?.map((option) => ({
      ...option,
      label: applySalonPlaceholders(option.label, salon),
    })),
  }))
}
