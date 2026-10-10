/**
 * Wspólny scraper danych produktu (używany przez scrapeProductFn i katalog kosmetyków).
 * Zawiera walidację URL (anty-SSRF), pobieranie HTML i ekstrakcję meta/JSON-LD.
 */

const SCRAPE_TIMEOUT_MS = 6000
const MAX_HTML_LENGTH = 1_500_000

export function normalizeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.port && url.port !== '80' && url.port !== '443') return null
    return url.toString()
  } catch {
    return null
  }
}

export function isBlockedHost(url: URL): boolean {
  let hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  // IPv4-mapped IPv6 (np. ::ffff:127.0.0.1) — sprowadź do IPv4
  const mapped = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) hostname = mapped[1]
  if (!hostname.includes('.') && hostname !== '::1') return true
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return true
  }
  if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) {
    return true
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true
  // CGNAT 100.64.0.0/10
  if (/^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./.test(hostname)) return true
  if (/^(0|169\.254)\./.test(hostname)) return true
  if (hostname === '::1' || /^f[cd]/.test(hostname) || /^fe80:/.test(hostname)) return true
  return false
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function extractMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
        'i',
      ),
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]) return decodeEntities(match[1])
    }
  }
  return null
}

export function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null
  const normalized = String(raw)
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '')
  const match = normalized.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) && value >= 0 ? value : null
}

function extractMetaPrice(html: string): number | null {
  return parsePrice(extractMeta(html, ['og:price:amount', 'product:price:amount', 'twitter:data1']))
}

function extractItempropPrice(html: string): number | null {
  const patterns = [
    /<[^>]+itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /<[^>]+content=["']([^"']+)["'][^>]*itemprop=["']price["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    const price = parsePrice(match?.[1])
    if (price !== null) return price
  }
  return null
}

type JsonLdProduct = {
  name: string | null
  image: string | null
  price: number | null
}

function findProductNode(node: unknown): JsonLdProduct | null {
  if (!node || typeof node !== 'object') return null

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProductNode(item)
      if (found) return found
    }
    return null
  }

  const record = node as Record<string, unknown>

  if (record['@graph']) {
    const found = findProductNode(record['@graph'])
    if (found) return found
  }

  const type = record['@type']
  const types = Array.isArray(type) ? type : [type]
  if (types.includes('Product')) {
    const offers = Array.isArray(record.offers) ? record.offers[0] : record.offers
    const offerRecord = (offers ?? {}) as Record<string, unknown>
    const image = Array.isArray(record.image) ? record.image[0] : record.image
    return {
      name: typeof record.name === 'string' ? record.name : null,
      image: typeof image === 'string' ? image : null,
      price: parsePrice(String(offerRecord.price ?? offerRecord.lowPrice ?? record.price ?? '')),
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const found = findProductNode(value)
      if (found) return found
    }
  }

  return null
}

function extractJsonLd(html: string): JsonLdProduct | null {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null = scriptPattern.exec(html)
  while (match) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const found = findProductNode(parsed)
      if (found) return found
    } catch {
      // ignore malformed JSON-LD blocks
    }
    match = scriptPattern.exec(html)
  }
  return null
}

function normalizeImageUrl(raw: string | null, baseUrl: string): string | null {
  if (!raw) return null
  try {
    const resolved = new URL(raw, baseUrl)
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null
    return resolved.toString()
  } catch {
    return null
  }
}

const MAX_REDIRECTS = 3

async function fetchHtml(url: string): Promise<string | null> {
  let current: URL
  try {
    current = new URL(url)
  } catch {
    return null
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    // Walidacja każdego hopu — chroni przed SSRF przez redirect na adresy wewnętrzne.
    if (isBlockedHost(current)) return null

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS)
    try {
      const response = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (compatible; docvue/1.0)',
        },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) return null
        current = new URL(location, current)
        continue
      }

      if (!response.ok) return null
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html') && !contentType.includes('xhtml')) return null
      const declaredLength = Number(response.headers.get('content-length') ?? '0')
      if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_LENGTH) return null
      const text = await response.text()
      return text.slice(0, MAX_HTML_LENGTH)
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}

export interface ScrapedProductData {
  name: string | null
  imageUrl: string | null
  price: number | null
}

export type ScrapeProductResult = ScrapedProductData | { error: string }

/** Pobiera i parsuje dane produktu ze strony sklepu (bez cache). */
export async function scrapeProductData(url: string): Promise<ScrapeProductResult> {
  const html = await fetchHtml(url)
  if (!html) {
    return {
      error:
        'Nie udało się pobrać strony produktu. Automatyczne pobieranie działa dla większości sklepów — w razie problemu wpisz dane ręcznie.',
    }
  }

  const jsonLd = extractJsonLd(html)
  const name = extractMeta(html, ['og:title', 'twitter:title']) ?? jsonLd?.name ?? null
  const imageUrl =
    normalizeImageUrl(
      extractMeta(html, ['og:image', 'og:image:secure_url', 'twitter:image']),
      url,
    ) ?? normalizeImageUrl(jsonLd?.image ?? null, url)
  const price = extractMetaPrice(html) ?? extractItempropPrice(html) ?? jsonLd?.price ?? null

  if (!name && !imageUrl && price === null) {
    return {
      error:
        'Nie znaleziono danych produktu. Automatyczne pobieranie działa dla większości sklepów — w razie problemu wpisz dane ręcznie.',
    }
  }

  return { name, imageUrl, price }
}
