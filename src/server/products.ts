import { createServerFn } from '@tanstack/react-start'
import { consumeRateLimit, rateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '../../lib/supabase/admin'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'
import { isBlockedHost, normalizeHttpUrl, scrapeProductData } from './product-scraper'

export interface CatalogProduct {
  id: string
  salon_id: string
  name: string
  url: string | null
  image_url: string | null
  price: number | null
  usage_description: string | null
  available_in_salon: boolean
  source: 'url' | 'custom'
  last_refreshed_at: string | null
  created_at: string
  updated_at: string
}

const CATALOG_MIGRATION_ERROR =
  'Baza kosmetyków wymaga migracji 20261013_product_catalog.sql — wklej ją w Supabase i spróbuj ponownie.'

function isMissingCatalogTable(message: string | undefined): boolean {
  return Boolean(
    message &&
      /products|schema cache|does not exist|catalog_product_id/i.test(message) &&
      /relation|column|schema cache|does not exist/i.test(message),
  )
}

export const getCatalogProductsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { products: [] as CatalogProduct[], error: 'Nie jesteś zalogowany' }

    let query = supabase
      .from('products')
      .select('*')
      .eq('salon_id', caller.salonId)
      .order('updated_at', { ascending: false })
      .limit(Math.min(Math.max(data.limit ?? 50, 1), 200))

    const search = data.query?.trim()
    if (search) {
      query = query.or(`name.ilike.%${search}%,url.ilike.%${search}%`)
    }

    const { data: products, error } = await query
    if (error) {
      if (isMissingCatalogTable(error.message)) {
        return { products: [] as CatalogProduct[], error: CATALOG_MIGRATION_ERROR }
      }
      return { products: [] as CatalogProduct[], error: error.message }
    }
    return { products: (products ?? []) as CatalogProduct[] }
  })

export const addProductFromUrlFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const limit = consumeRateLimit(`scrape:${caller.userId}`, 20, 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const url = normalizeHttpUrl(data.url ?? '')
    if (!url) return { error: 'Nieprawidłowy adres URL produktu' }
    if (isBlockedHost(new URL(url))) return { error: 'Nie można pobrać danych z tego adresu' }

    // Sprawdź, czy produkt już jest w bazie (po URL)
    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('*')
      .eq('salon_id', caller.salonId)
      .eq('url', url)
      .maybeSingle()
    if (existingError && isMissingCatalogTable(existingError.message)) {
      return { error: CATALOG_MIGRATION_ERROR }
    }
    if (existing) return { product: existing as CatalogProduct, existed: true }

    const scraped = await scrapeProductData(url)
    if ('error' in scraped) return { error: scraped.error }

    const { data: product, error } = await supabase
      .from('products')
      .upsert(
        {
          salon_id: caller.salonId,
          name: scraped.name ?? 'Kosmetyk',
          url,
          image_url: scraped.imageUrl,
          price: scraped.price,
          source: 'url',
          last_refreshed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'salon_id,url' },
      )
      .select()
      .single()
    if (error) {
      if (isMissingCatalogTable(error.message)) return { error: CATALOG_MIGRATION_ERROR }
      return { error: error.message }
    }

    // Cache scrapowania (współdzielony z scrapeProductFn)
    const admin = await createAdminClient()
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

    return { product: product as CatalogProduct }
  })

export const refreshCatalogProductFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const limit = consumeRateLimit(`scrape:${caller.userId}`, 20, 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!product) return { error: 'Nie znaleziono kosmetyku w bazie' }
    if (!product.url) return { error: 'Ten kosmetyk nie ma linku do odświeżenia' }
    if (isBlockedHost(new URL(product.url)))
      return { error: 'Nie można pobrać danych z tego adresu' }

    const scraped = await scrapeProductData(product.url)
    if ('error' in scraped) return { error: scraped.error }

    const { data: updated, error } = await supabase
      .from('products')
      .update({
        name: scraped.name ?? product.name,
        image_url: scraped.imageUrl ?? product.image_url,
        price: scraped.price ?? product.price,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .select()
      .single()
    if (error) {
      if (isMissingCatalogTable(error.message)) return { error: CATALOG_MIGRATION_ERROR }
      return { error: error.message }
    }
    return { product: updated as CatalogProduct }
  })

export const createCustomProductFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      name: string
      price?: number | null
      usageDescription?: string | null
      availableInSalon?: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const name = (data.name ?? '').trim()
    if (!name) return { error: 'Nazwa kosmetyku jest wymagana' }
    if (name.length > 200) return { error: 'Nazwa może mieć maksymalnie 200 znaków' }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        salon_id: caller.salonId,
        name,
        url: null,
        price: data.price ?? null,
        usage_description: data.usageDescription?.trim() || null,
        available_in_salon: Boolean(data.availableInSalon),
        source: 'custom',
      })
      .select()
      .single()
    if (error) {
      if (isMissingCatalogTable(error.message)) return { error: CATALOG_MIGRATION_ERROR }
      return { error: error.message }
    }
    return { product: product as CatalogProduct }
  })

export const updateCatalogProductFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      name?: string
      url?: string | null
      price?: number | null
      usageDescription?: string | null
      availableInSalon?: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) {
      const name = data.name.trim()
      if (!name) return { error: 'Nazwa kosmetyku jest wymagana' }
      if (name.length > 200) return { error: 'Nazwa może mieć maksymalnie 200 znaków' }
      updates.name = name
    }
    if (data.url !== undefined) {
      if (data.url) {
        const url = normalizeHttpUrl(data.url)
        if (!url) return { error: 'Nieprawidłowy adres URL produktu' }
        if (isBlockedHost(new URL(url))) return { error: 'Nie można użyć tego adresu' }
        updates.url = url
      } else {
        updates.url = null
      }
    }
    if (data.price !== undefined) updates.price = data.price
    if (data.usageDescription !== undefined) {
      updates.usage_description = data.usageDescription?.trim() || null
    }
    if (data.availableInSalon !== undefined) updates.available_in_salon = data.availableInSalon

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .select()
      .single()
    if (error) {
      if (isMissingCatalogTable(error.message)) return { error: CATALOG_MIGRATION_ERROR }
      if (/duplicate key/i.test(error.message)) {
        return { error: 'Kosmetyk z tym linkiem już istnieje w bazie' }
      }
      return { error: error.message }
    }
    return { product: product as CatalogProduct }
  })

export const createProductImageUploadFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { productId: string; contentType: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensions[data.contentType]
    if (!extension) return { error: 'Dozwolone formaty zdjęć: JPG, PNG lub WEBP' }

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', data.productId)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!product) return { error: 'Nie znaleziono kosmetyku w bazie' }

    const path = `${caller.salonId}/${data.productId}-${Date.now()}.${extension}`
    const admin = await createAdminClient()
    const { data: signed, error } = await admin.storage
      .from('product-images')
      .createSignedUploadUrl(path)
    if (error || !signed) return { error: 'Nie udało się przygotować wysyłki zdjęcia' }
    return { path: signed.path, token: signed.token }
  })

export const setProductImageFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; path: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (data.path.split('/')[0] !== caller.salonId)
      return { error: 'Nieprawidłowa ścieżka zdjęcia' }

    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_URL ??
      ''
    if (!supabaseUrl) return { error: 'Brak konfiguracji Supabase' }

    const imageUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/product-images/${data.path}`

    const { data: product, error } = await supabase
      .from('products')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .select()
      .single()
    if (error) {
      if (isMissingCatalogTable(error.message)) return { error: CATALOG_MIGRATION_ERROR }
      return { error: error.message }
    }
    return { product: product as CatalogProduct }
  })

export const deleteCatalogProductFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) {
      if (isMissingCatalogTable(error.message)) return { error: CATALOG_MIGRATION_ERROR }
      return { error: error.message }
    }
    return { success: true }
  })
