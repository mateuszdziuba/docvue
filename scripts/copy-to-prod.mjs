#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
// ============================================================================
// copy-to-prod.mjs — kopiuje dane gabinetu ze środowiska źródłowego (.env.local)
// do produkcyjnego projektu Supabase (np. na Vercel).
//
// Kopiowane: salon (z właścicielem auth), pracownicy, zabiegi, klienci,
// formularze, treatment_forms, client_forms, submissions, appointments,
// time_blocks, beauty_plans + produkty, chat_messages.
// Pomijane: scraped_products_cache (cache), pliki Storage (zdjęcia/avatary).
//
// Użycie:
//   # 1) Utwórz .env.production.local z:
//   #    VITE_SUPABASE_URL=..., SUPABASE_SERVICE_ROLE_KEY=..., VITE_SUPABASE_ANON_KEY=..., VITE_SITE_URL=https://twoja-domena
//   # 2) Wklej supabase/prod-setup.sql w nowym projekcie (SQL Editor)
//   node --env-file=.env.local scripts/copy-to-prod.mjs            # DRY-RUN
//   node --env-file=.env.local scripts/copy-to-prod.mjs --apply    # ZAPIS
//
// Opcje:
//   --target-env=.env.production.local     plik z env produkcji
//   --target-url=... --target-key=...      zamiast pliku
//   --salon-id=...                         który salon skopiować (domyślnie pierwszy)
//   --prod-url=https://...                 URL produkcji do linku ustawienia hasła
// ============================================================================
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const arg = (name, def = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  return readFileSync(path, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) acc[m[1]] = m[2].trim().replace(/^"|"$/g, '')
      return acc
    }, {})
}

const sourceEnv = {
  url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
}
const targetEnvFile = arg('target-env', '.env.production.local')
const targetFileEnv = parseEnvFile(targetEnvFile)
const targetEnv = {
  url: arg('target-url') || targetFileEnv.VITE_SUPABASE_URL || process.env.TARGET_SUPABASE_URL,
  key:
    arg('target-key') ||
    targetFileEnv.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.TARGET_SERVICE_ROLE_KEY,
}
const prodUrl = (arg('prod-url') || targetFileEnv.VITE_SITE_URL || '').replace(/\/$/, '')

if (!sourceEnv.url || !sourceEnv.key) {
  console.error('Brak VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY źródła (.env.local).')
  process.exit(1)
}
if (!targetEnv.url || !targetEnv.key) {
  console.error(`Brak danych produkcji. Uzupełnij ${targetEnvFile}:
  VITE_SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  VITE_SUPABASE_ANON_KEY=...
  VITE_SITE_URL=https://twoja-domena`)
  process.exit(1)
}
const hostOf = (u) => new URL(u).host
if (hostOf(sourceEnv.url) === hostOf(targetEnv.url)) {
  console.error('Źródło i cel to ten sam projekt Supabase — przerywam.')
  process.exit(1)
}

const src = createClient(sourceEnv.url, sourceEnv.key, { auth: { persistSession: false } })
const dst = createClient(targetEnv.url, targetEnv.key, { auth: { persistSession: false } })

const SCOPED = [
  ['staff_members', 'id'],
  ['treatments', 'id'],
  ['clients', 'id'],
  ['forms', 'id'],
  ['beauty_plans', 'id'],
  ['client_forms', 'id'],
  ['submissions', 'id'],
  ['appointments', 'id'],
  ['time_blocks', 'id'],
  ['chat_messages', 'id'],
]

async function fetchAll(client, table, filters = []) {
  const rows = []
  const page = 1000
  for (let from = 0; ; from += page) {
    let q = client
      .from(table)
      .select('*')
      .range(from, from + page - 1)
    for (const [op, col, val] of filters) {
      if (op === 'eq') q = q.eq(col, val)
      if (op === 'in') q = q.in(col, val)
    }
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < page) break
  }
  return rows
}

async function upsertChunks(table, rows, onConflict) {
  const size = 500
  for (let i = 0; i < rows.length; i += size) {
    const part = rows.slice(i, i + size)
    const { error } = await dst.from(table).upsert(part, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

async function ensureOwner(email) {
  const { data: page, error } = await dst.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`auth.listUsers: ${error.message}`)
  const existing = page.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
  if (existing) return { id: existing.id, created: false, link: null }

  const { data, error: createError } = await dst.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomUUID(),
  })
  if (createError) throw new Error(`createUser: ${createError.message}`)
  let link = null
  if (prodUrl) {
    const { data: linkData } = await dst.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${prodUrl}/accept-invite` },
    })
    link = linkData?.properties?.action_link ?? null
  }
  return { id: data.user.id, created: true, link }
}

async function main() {
  console.log(APPLY ? '=== TRYB: APPLY ===' : '=== TRYB: DRY-RUN ===')
  console.log(`Źródło: ${hostOf(sourceEnv.url)}`)
  console.log(`Cel:    ${hostOf(targetEnv.url)}`)

  // Sanity: schemat produkcji
  const { error: schemaError } = await dst.from('salons').select('id').limit(1)
  if (schemaError) {
    console.error(
      `\nBŁĄD: produkcja nie ma schematu (${schemaError.message}).\nNajpierw wklej supabase/prod-setup.sql w nowym projekcie Supabase.`,
    )
    process.exit(1)
  }

  // Salon źródłowy
  const salonId = arg('salon-id')
  const { data: salons, error: salonError } = salonId
    ? await src.from('salons').select('*').eq('id', salonId)
    : await src.from('salons').select('*').limit(2)
  if (salonError || !salons?.length) {
    console.error('Nie znaleziono salonu źródłowego.')
    process.exit(1)
  }
  if (salons.length > 1) {
    console.error(`W bazie jest ${salons.length} salonów — podaj --salon-id=...`)
    process.exit(1)
  }
  const salon = salons[0]
  const { data: ownerData } = await src.auth.admin.getUserById(salon.user_id)
  const ownerEmail = ownerData?.user?.email
  if (!ownerEmail) {
    console.error('Nie znaleziono e-maila właściciela salonu w źródle.')
    process.exit(1)
  }
  console.log(`Salon: ${salon.name} (${salon.id}) | właściciel: ${ownerEmail}\n`)

  const data = {}
  for (const [table] of SCOPED) {
    data[table] = await fetchAll(src, table, [['eq', 'salon_id', salon.id]])
  }
  const treatmentIds = data.treatments.map((t) => t.id)
  data.treatment_forms = treatmentIds.length
    ? await fetchAll(src, 'treatment_forms', [['in', 'treatment_id', treatmentIds]])
    : []
  const planIds = data.beauty_plans.map((p) => p.id)
  data.beauty_plan_products = planIds.length
    ? await fetchAll(src, 'beauty_plan_products', [['in', 'plan_id', planIds]])
    : []

  console.log('Dane źródłowe:')
  for (const [table, rows] of Object.entries(data)) console.log(`  ${table}: ${rows.length}`)

  if (!APPLY) {
    console.log('\nDRY-RUN zakończony. Zapis: dodaj --apply')
    return
  }

  console.log('\n--- KOPIOWANIE ---')
  const owner = await ensureOwner(ownerEmail)
  console.log(
    owner.created
      ? `Utworzono konto właściciela: ${ownerEmail} (ustaw hasło linkiem poniżej)`
      : `Właściciel już istnieje w produkcji: ${ownerEmail}`,
  )

  const salonRow = { ...salon, user_id: owner.id }
  await upsertChunks('salons', [salonRow], 'id')
  console.log('  salons: 1')

  for (const [table, conflict] of SCOPED) {
    const rows = data[table]
    if (!rows.length) continue
    await upsertChunks(table, rows, conflict)
    console.log(`  ${table}: ${rows.length}`)
  }
  if (data.treatment_forms.length) {
    await upsertChunks('treatment_forms', data.treatment_forms, 'treatment_id,form_id')
    console.log(`  treatment_forms: ${data.treatment_forms.length}`)
  }
  if (data.beauty_plan_products.length) {
    await upsertChunks('beauty_plan_products', data.beauty_plan_products, 'id')
    console.log(`  beauty_plan_products: ${data.beauty_plan_products.length}`)
  }

  console.log('\n--- WERYFIKACJA ---')
  for (const [table] of [['clients'], ['treatments'], ['forms'], ['staff_members']]) {
    const t = table[0]
    const { count } = await dst
      .from(t)
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salon.id)
    console.log(`  ${t}: ${count} (źródło: ${data[t].length})`)
  }

  if (owner.created && owner.link) {
    console.log(`\nLINK DO USTAWIENIA HASŁA WŁAŚCICIELA (jednorazowy):\n${owner.link}`)
  } else if (owner.created) {
    console.log(
      '\nWłaściciel utworzony — wyślij reset hasła z panelu Supabase lub dodaj --prod-url.',
    )
  }
  console.log('\nGotowe. Ustaw zmienne środowiskowe w Vercel i zrób redeploy.')
}

main().catch((e) => {
  console.error('Błąd krytyczny:', e.message)
  process.exit(1)
})
