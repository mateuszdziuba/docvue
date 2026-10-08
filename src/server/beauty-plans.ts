import { createServerFn } from '@tanstack/react-start'
import { consumeRateLimit, rateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '../../lib/supabase/admin'
import { diffProducts, type IncomingBeautyPlanProduct } from '../lib/beauty-plan-diff'
import { getSupabaseServerClient } from '../utils/supabase'
import { getVerifiedUser } from './_auth'
import { getCallerSalonId } from './_salon-resolver'

export type BeautyPlanProduct = {
  id: string
  plan_id: string
  time_of_day: 'morning' | 'evening'
  name: string
  url: string | null
  image_url: string | null
  price: number | null
  usage_description: string | null
  created_at: string
  updated_at: string
}

export type BeautyPlan = {
  id: string
  client_id: string
  salon_id: string
  morning_description: string | null
  evening_description: string | null
  created_at: string
  updated_at: string
}

type ServerSupabase = ReturnType<typeof getSupabaseServerClient>

type SaveBeautyPlanInput = {
  clientId: string
  morningDescription?: string | null
  eveningDescription?: string | null
  products: IncomingBeautyPlanProduct[]
}

const MAX_PRODUCTS = 50
const SCRAPE_TIMEOUT_MS = 6000
const MAX_HTML_LENGTH = 1_500_000

async function fetchPlanWithProducts(supabase: ServerSupabase, clientId: string) {
  const { data: plan, error } = await supabase
    .from('beauty_plans')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !plan) return { plan: null, products: [] as BeautyPlanProduct[] }

  const { data: products } = await supabase
    .from('beauty_plan_products')
    .select('*')
    .eq('plan_id', plan.id)
    .order('time_of_day', { ascending: true })
    .order('created_at', { ascending: true })

  return { plan: plan as BeautyPlan, products: (products ?? []) as BeautyPlanProduct[] }
}

function validateProducts(
  products: IncomingBeautyPlanProduct[],
): { products: IncomingBeautyPlanProduct[] } | { error: string } {
  if (!Array.isArray(products)) return { error: 'Nieprawidłowe dane produktów' }
  if (products.length > MAX_PRODUCTS) {
    return { error: `Maksymalnie ${MAX_PRODUCTS} produktów w planie pielęgnacyjnym` }
  }

  const normalized: IncomingBeautyPlanProduct[] = []

  for (const product of products) {
    if (product.timeOfDay !== 'morning' && product.timeOfDay !== 'evening') {
      return { error: 'Nieprawidłowa pora stosowania produktu' }
    }

    const name = (product.name ?? '').trim()
    if (!name) return { error: 'Nazwa produktu jest wymagana' }
    if (name.length > 200) return { error: 'Nazwa produktu może mieć maksymalnie 200 znaków' }

    const url = product.url?.trim() || null
    if (url && !/^https?:\/\//i.test(url)) {
      return { error: 'Adres URL produktu musi zaczynać się od http:// lub https://' }
    }

    const price = product.price ?? null
    if (price !== null && (typeof price !== 'number' || !Number.isFinite(price) || price < 0)) {
      return { error: 'Cena produktu musi być liczbą większą lub równą 0' }
    }

    normalized.push({
      id: product.id,
      timeOfDay: product.timeOfDay,
      name,
      url,
      imageUrl: product.imageUrl?.trim() || null,
      price,
      usageDescription: product.usageDescription?.trim() || null,
    })
  }

  return { products: normalized }
}

function toProductRow(product: IncomingBeautyPlanProduct) {
  return {
    time_of_day: product.timeOfDay,
    name: product.name.trim(),
    url: product.url?.trim() || null,
    image_url: product.imageUrl?.trim() || null,
    price: product.price ?? null,
    usage_description: product.usageDescription?.trim() || null,
  }
}

export const getBeautyPlanFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { plan: null, products: [], error: 'Nie jesteś zalogowany' }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.clientId)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!client) return { plan: null, products: [], error: 'Brak dostępu do tego klienta' }

    return await fetchPlanWithProducts(supabase, data.clientId)
  })

export const saveBeautyPlanFn = createServerFn({ method: 'POST' })
  .inputValidator((d: SaveBeautyPlanInput) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.clientId)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!client) return { error: 'Brak dostępu do tego klienta' }

    const validated = validateProducts(data.products)
    if ('error' in validated) return validated

    const { data: plan, error: planError } = await supabase
      .from('beauty_plans')
      .upsert(
        {
          client_id: data.clientId,
          salon_id: caller.salonId,
          morning_description: data.morningDescription?.trim() || null,
          evening_description: data.eveningDescription?.trim() || null,
        },
        { onConflict: 'client_id' },
      )
      .select('id')
      .single()

    if (planError || !plan) return { error: planError?.message ?? 'Nie udało się zapisać planu' }

    const { data: existing } = await supabase
      .from('beauty_plan_products')
      .select('id')
      .eq('plan_id', plan.id)

    const { toUpdate, toInsert, toDeleteIds } = diffProducts(existing ?? [], validated.products)

    for (const item of toUpdate) {
      const { error } = await supabase
        .from('beauty_plan_products')
        .update(toProductRow(item.product))
        .eq('id', item.id)
        .eq('plan_id', plan.id)
      if (error) return { error: error.message }
    }

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('beauty_plan_products')
        .insert(toInsert.map((product) => ({ plan_id: plan.id, ...toProductRow(product) })))
      if (error) return { error: error.message }
    }

    if (toDeleteIds.length > 0) {
      const { error } = await supabase
        .from('beauty_plan_products')
        .delete()
        .eq('plan_id', plan.id)
        .in('id', toDeleteIds)
      if (error) return { error: error.message }
    }

    return { success: true, planId: plan.id as string }
  })

export const deleteBeautyPlanFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', data.clientId)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!client) return { error: 'Brak dostępu do tego klienta' }

    const { error } = await supabase.from('beauty_plans').delete().eq('client_id', data.clientId)
    if (error) return { error: error.message }
    return { success: true }
  })

export const getMyBeautyPlanFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const user = await getVerifiedUser(supabase)
  if (!user) return { plan: null, products: [], error: 'not_authenticated' }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!client) return { plan: null, products: [] }

  return await fetchPlanWithProducts(supabase, client.id)
})

export const getPublicBeautyPlanFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { planId: string }) => d)
  .handler(async ({ data }) => {
    // Publiczny link współdzielony po nieguessowalnym UUID — czytamy klientem
    // administracyjnym po walidacji formatu, bez publicznej polityki RLS
    // (koniec możliwości listowania planów całej bazy).
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.planId)) {
      return { plan: null, products: [], salonName: null, clientFirstName: null }
    }

    const admin = await createAdminClient()
    const { data: plan } = await admin
      .from('beauty_plans')
      .select(
        'id, client_id, salon_id, morning_description, evening_description, created_at, updated_at',
      )
      .eq('id', data.planId)
      .maybeSingle()

    if (!plan) return { plan: null, products: [], salonName: null, clientFirstName: null }

    const { data: products } = await admin
      .from('beauty_plan_products')
      .select('*')
      .eq('plan_id', plan.id)
      .order('time_of_day', { ascending: true })
      .order('created_at', { ascending: true })

    let salonName: string | null = null
    let clientFirstName: string | null = null

    try {
      const [{ data: salon }, { data: client }] = await Promise.all([
        admin.from('salons').select('name').eq('id', plan.salon_id).maybeSingle(),
        admin.from('clients').select('name').eq('id', plan.client_id).maybeSingle(),
      ])
      salonName = salon?.name ?? null
      clientFirstName = client?.name?.trim().split(/\s+/)[0] ?? null
    } catch {
      salonName = null
    }

    return {
      plan: plan as BeautyPlan,
      products: (products ?? []) as BeautyPlanProduct[],
      salonName,
      clientFirstName,
    }
  })

function normalizeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.port && url.port !== '80' && url.port !== '443') return null
    return url.toString()
  } catch {
    return null
  }
}

function isBlockedHost(url: URL): boolean {
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

function parsePrice(raw: string | null | undefined): number | null {
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

export const scrapeProductFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const user = await getVerifiedUser(supabase)
    if (!user) return { error: 'Nie jesteś zalogowany' }

    const limit = consumeRateLimit(`scrape:${user.id}`, 20, 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const url = normalizeHttpUrl(data.url ?? '')
    if (!url) return { error: 'Nieprawidłowy adres URL produktu' }
    if (isBlockedHost(new URL(url))) {
      return { error: 'Nie można pobrać danych z tego adresu' }
    }

    const admin = await createAdminClient()
    const { data: cached } = await admin
      .from('scraped_products_cache')
      .select('name, price, image_url')
      .eq('url', url)
      .maybeSingle()

    if (cached && (cached.name || cached.image_url || cached.price !== null)) {
      return {
        name: cached.name ?? null,
        imageUrl: cached.image_url ?? null,
        price: parsePrice(cached.price === null ? null : String(cached.price)),
      }
    }

    const html = await fetchHtml(url)
    if (!html) {
      return {
        error:
          'Nie udało się pobrać strony produktu. Automatyczne pobieranie działa dla linków z Rossmann — wpisz dane ręcznie.',
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
          'Nie znaleziono danych produktu. Automatyczne pobieranie działa dla linków z Rossmann — wpisz dane ręcznie.',
      }
    }

    await admin.from('scraped_products_cache').upsert(
      {
        url,
        name,
        image_url: imageUrl,
        price,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'url' },
    )

    return { name, imageUrl, price }
  })

// Legacy aliases
export const getBeautyPlan = (clientId: string) => getBeautyPlanFn({ data: { clientId } })
export const saveBeautyPlan = (data: SaveBeautyPlanInput) => saveBeautyPlanFn({ data })
export const deleteBeautyPlan = (clientId: string) => deleteBeautyPlanFn({ data: { clientId } })
export const getPublicBeautyPlan = (planId: string) => getPublicBeautyPlanFn({ data: { planId } })
export const scrapeProduct = (url: string) => scrapeProductFn({ data: { url } })
