import { describe, expect, it } from 'vitest'
import { sha256Hex, stableStringify, submissionContentHash } from './audit'

describe('audit helpers', () => {
  it('stableStringify sortuje klucze niezależnie od kolejności', () => {
    const first = stableStringify({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })
    const second = stableStringify({ a: { c: [3, { e: 5, f: 4 }], d: 2 }, b: 1 })
    expect(first).toBe(second)
  })

  it('submissionContentHash jest deterministyczny i zależy od treści', () => {
    const base = {
      formTitle: 'Zgoda',
      schema: { fields: [{ name: 'q1', type: 'radio' }] },
      answers: { q1: 'Tak' },
      signature: 'data:image/png;base64,AAAA',
      signedAt: '2026-10-09T10:00:00.000Z',
      filledBy: 'client' as const,
    }
    const same = submissionContentHash({ ...base, answers: { q1: 'Tak' } })
    const different = submissionContentHash({ ...base, answers: { q1: 'Nie' } })

    expect(submissionContentHash(base)).toBe(same)
    expect(submissionContentHash(base)).not.toBe(different)
    expect(submissionContentHash(base)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('sha256Hex działa dla stringów i buforów', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256Hex(Buffer.from('abc'))).toBe(sha256Hex('abc'))
  })
})
