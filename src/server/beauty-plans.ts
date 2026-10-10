import { createServerFn } from '@tanstack/react-start'
import { consumeRateLimit, rateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '../../lib/supabase/admin'
import { diffProducts, type IncomingBeautyPlanProduct } from '../lib/beauty-plan-diff'
import { getSupabaseServerClient } from '../utils/supabase'
import { getVerifiedUser } from './_auth'
import { getCallerSalonId } from './_salon-resolver'
import { resolveSiteUrl } from './_site-url'
import { escapeHtml, sendEmail } from './email'
import { isBlockedHost, normalizeHttpUrl, parsePrice, scrapeProductData } from './product-scraper'

export type BeautyPlanProduct = {
  id: string
  plan_id: string
  time_of_day: 'morning' | 'evening'
  name: string
  url: string | null
  image_url: string | null
  price: number | null
  usage_description: string | null
  available_in_salon: boolean
  position: number | null
  catalog_product_id: string | null
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

async function fetchPlanWithProducts(supabase: ServerSupabase, clientId: string) {
  const { data: plan, error } = await supabase
    .from('beauty_plans')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !plan) return { plan: null, products: [] as BeautyPlanProduct[] }

  let { data: products, error: productsError } = await supabase
    .from('beauty_plan_products')
    .select('*')
    .eq('plan_id', plan.id)
    .order('time_of_day', { ascending: true })
    .order('position', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  // Migracja 20261012 może nie być jeszcze zastosowana.
  if (productsError && /position|column|schema cache/i.test(productsError.message)) {
    const fallback = await supabase
      .from('beauty_plan_products')
      .select('*')
      .eq('plan_id', plan.id)
      .order('time_of_day', { ascending: true })
      .order('created_at', { ascending: true })
    products = fallback.data
  }

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

    const position =
      typeof product.position === 'number' && Number.isFinite(product.position)
        ? Math.max(0, Math.trunc(product.position))
        : null

    normalized.push({
      id: product.id,
      availableInSalon: Boolean(product.availableInSalon),
      position,
      catalogProductId:
        typeof product.catalogProductId === 'string' && product.catalogProductId
          ? product.catalogProductId
          : null,
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
    available_in_salon: product.availableInSalon ?? false,
    position: product.position ?? null,
    catalog_product_id: product.catalogProductId ?? null,
  }
}

const OPTIONAL_PRODUCT_COLUMNS = ['available_in_salon', 'position', 'catalog_product_id'] as const

function isMissingBeautyPlanColumn(message: string | undefined): boolean {
  return Boolean(
    message && /available_in_salon|position|catalog_product_id|column|schema cache/i.test(message),
  )
}

/** Usuwa z wiersza tylko tę kolumnę, której brakuje w bazie (migracja niewklejona). */
function stripMissingColumn(row: Record<string, unknown>, message: string | undefined): boolean {
  if (!message) return false
  for (const column of OPTIONAL_PRODUCT_COLUMNS) {
    if (message.includes(column) && column in row) {
      delete row[column]
      return true
    }
  }
  return false
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
      const row: Record<string, unknown> = { ...toProductRow(item.product) }
      let lastError: string | null = null
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { error } = await supabase
          .from('beauty_plan_products')
          .update(row)
          .eq('id', item.id)
          .eq('plan_id', plan.id)
        if (!error) {
          lastError = null
          break
        }
        lastError = error.message
        if (!isMissingBeautyPlanColumn(error.message)) break
        if (!stripMissingColumn(row, error.message)) break
      }
      if (lastError) return { error: lastError }
    }

    if (toInsert.length > 0) {
      const rows: Array<Record<string, unknown>> = toInsert.map((product) => ({
        plan_id: plan.id,
        ...toProductRow(product),
      }))
      let lastError: string | null = null
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { error } = await supabase.from('beauty_plan_products').insert(rows)
        if (!error) {
          lastError = null
          break
        }
        lastError = error.message
        if (!isMissingBeautyPlanColumn(error.message)) break
        let stripped = false
        for (const row of rows) {
          if (stripMissingColumn(row, error.message)) stripped = true
        }
        if (!stripped) break
      }
      if (lastError) return { error: lastError }
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

    let { data: products, error: productsError } = await admin
      .from('beauty_plan_products')
      .select('*')
      .eq('plan_id', plan.id)
      .order('time_of_day', { ascending: true })
      .order('position', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })

    if (productsError && /position|column|schema cache/i.test(productsError.message)) {
      const fallback = await admin
        .from('beauty_plan_products')
        .select('*')
        .eq('plan_id', plan.id)
        .order('time_of_day', { ascending: true })
        .order('created_at', { ascending: true })
      products = fallback.data
    }

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

    const scraped = await scrapeProductData(url)
    if ('error' in scraped) return { error: scraped.error }

    await admin.from('scraped_products_cache').upsert(
      {
        url,
        name: scraped.name,
        image_url: scraped.imageUrl,
        price: scraped.price,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'url' },
    )

    return scraped
  })

function renderPlanEmailHtml(params: {
  salonName: string | null
  clientName: string | null
  planId: string
  morningDescription: string | null
  eveningDescription: string | null
  products: BeautyPlanProduct[]
}): string {
  const link = `${resolveSiteUrl()}/share/beauty-plan/${params.planId}`
  const priceFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })

  const renderProducts = (time: 'morning' | 'evening') => {
    const items = params.products.filter((product) => product.time_of_day === time)
    if (items.length === 0) return '<p style="color:#8f7c7a;font-size:13px">Brak produktów.</p>'
    return `<ul style="padding-left:18px;margin:8px 0 0">${items
      .map((product) => {
        const name = escapeHtml(product.name)
        const title = product.url
          ? `<a href="${escapeHtml(product.url)}" style="color:#6f5957;font-weight:600">${name}</a>`
          : `<span style="font-weight:600;color:#1b1c1c">${name}</span>`
        const price = product.price !== null ? ` — ${priceFormatter.format(product.price)}` : ''
        const salon = product.available_in_salon
          ? ' <span style="color:#2f6b3a;font-size:12px">· dostępne w gabinecie</span>'
          : ''
        const usage = product.usage_description
          ? `<div style="color:#6f5957;font-size:13px;margin-top:2px">${escapeHtml(product.usage_description)}</div>`
          : ''
        return `<li style="margin-bottom:10px">${title}${price}${salon}${usage}</li>`
      })
      .join('')}</ul>`
  }

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1b1c1c">
    <h1 style="font-size:20px;margin:0 0 4px">Plan pielęgnacyjny</h1>
    <p style="color:#6f5957;font-size:13px;margin:0 0 20px">
      ${params.clientName ? `Dla: ${escapeHtml(params.clientName)} · ` : ''}${escapeHtml(params.salonName ?? 'Twój gabinet')}
    </p>
    <h2 style="font-size:15px;color:#8a6d1f;margin:0 0 6px">Rano</h2>
    ${params.morningDescription ? `<p style="font-size:13px;white-space:pre-line;margin:0">${escapeHtml(params.morningDescription)}</p>` : ''}
    ${renderProducts('morning')}
    <h2 style="font-size:15px;color:#2f4d8a;margin:24px 0 6px">Wieczorem</h2>
    ${params.eveningDescription ? `<p style="font-size:13px;white-space:pre-line;margin:0">${escapeHtml(params.eveningDescription)}</p>` : ''}
    ${renderProducts('evening')}
    <p style="margin:28px 0 0">
      <a href="${link}" style="display:inline-block;background:#6f5957;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px">
        Zobacz plan online
      </a>
    </p>
    <p style="color:#8f7c7a;font-size:12px;margin-top:20px">
      Link jest prywatny — nie udostępniaj go osobom trzecim.
    </p>
  </div>`
}

export const sendBeautyPlanEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { clientId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', data.clientId)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!client) return { error: 'Nie znaleziono klienta' }
    if (!client.email) return { error: 'Klient nie ma adresu e-mail' }

    const { plan, products } = await fetchPlanWithProducts(supabase, data.clientId)
    if (!plan) return { error: 'Brak planu pielęgnacyjnego do wysłania' }

    const { data: salon } = await supabase
      .from('salons')
      .select('name')
      .eq('id', caller.salonId)
      .maybeSingle()

    const html = renderPlanEmailHtml({
      salonName: salon?.name ?? null,
      clientName: client.name ?? null,
      planId: plan.id,
      morningDescription: plan.morning_description,
      eveningDescription: plan.evening_description,
      products,
    })

    const result = await sendEmail({
      to: client.email,
      subject: `Plan pielęgnacyjny${salon?.name ? ` — ${salon.name}` : ''}`,
      html,
    })
    if (!result.ok) return { error: result.error }
    return { success: true }
  })

// Legacy aliases
export const getBeautyPlan = (clientId: string) => getBeautyPlanFn({ data: { clientId } })
export const saveBeautyPlan = (data: SaveBeautyPlanInput) => saveBeautyPlanFn({ data })
export const deleteBeautyPlan = (clientId: string) => deleteBeautyPlanFn({ data: { clientId } })
export const getPublicBeautyPlan = (planId: string) => getPublicBeautyPlanFn({ data: { planId } })
export const scrapeProduct = (url: string) => scrapeProductFn({ data: { url } })
