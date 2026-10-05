import { normalizeFieldType } from '@/lib/form-validation'
import type { SalonContact } from '@/lib/salon-placeholders'
import type { FormField } from '@/types/database'

export function formatFieldValue(field: FormField, value: unknown): string | null {
  const type = normalizeFieldType(field.type)
  if (type === 'separator' || type === 'info' || type === 'signature') return null
  if (value === undefined || value === null || value === '') return null
  if (type === 'checkbox') return value === true ? 'Tak' : 'Nie'
  if (Array.isArray(value)) {
    return value
      .map((item) => field.options?.find((option) => option.value === item)?.label ?? String(item))
      .join(', ')
  }
  if (type === 'select' || type === 'radio') {
    return field.options?.find((option) => option.value === value)?.label ?? String(value)
  }
  return String(value)
}

export function isImageSignature(signature: string): boolean {
  // Renderujemy wyłącznie osadzone obrazy (data URL). Zewnętrzne adresy
  // mogłyby służyć jako tracking pixel w panelu administratora.
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(signature)
}

export function resolveSalonCity(salon: SalonContact | null): string {
  if (!salon) return ''
  const explicit = salon.city?.trim()
  if (explicit) return explicit
  const address = salon.address?.trim()
  if (!address) return ''
  const lastPart = address.split(',').pop()?.trim() ?? ''
  const withPostal = /^\d{2}-?\d{3}\s+(.+)$/.exec(lastPart)
  if (withPostal) return withPostal[1].trim()
  if (/\d/.test(lastPart)) return ''
  return lastPart
}
