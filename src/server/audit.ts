import { createHash } from 'node:crypto'

/**
 * Deterministyczna serializacja JSON (sortowanie kluczy obiektów) —
 * ten sam zestaw danych zawsze daje ten sam skrót SHA-256.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortValue(record[key])
    }
    return sorted
  }
  return value
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex')
}

export interface SubmissionAuditInput {
  formTitle: string | null
  schema: unknown
  answers: unknown
  signature: string | null
  signedAt: string
  filledBy: 'client' | 'staff'
}

/** Kanoniczny skrót treści podpisanej zgody (migawka + odpowiedzi + podpis). */
export function submissionContentHash(input: SubmissionAuditInput): string {
  return sha256Hex(stableStringify(input))
}
