const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Kryptograficznie bezpieczny token (CSPRNG, rejection sampling).
 * Używany dla linków do formularzy i innych publicznych capability URL-i.
 */
export function generateSecureToken(length = 32): string {
  const max = 256 - (256 % TOKEN_ALPHABET.length)
  const chars: string[] = []
  while (chars.length < length) {
    const bytes = new Uint8Array(length - chars.length)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      if (byte < max && chars.length < length) {
        chars.push(TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length])
      }
    }
  }
  return chars.join('')
}

export const FORM_TOKEN_PATTERN = /^[A-Za-z0-9]{32}$/

export function isValidFormToken(token: unknown): token is string {
  return typeof token === 'string' && FORM_TOKEN_PATTERN.test(token)
}
