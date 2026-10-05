#!/usr/bin/env node
// ============================================================================
// db-clean.mjs — czyszczenie bazy do "clean state" przed importem.
//
// Zostawia wyłącznie salon docelowy (TARGET_SALON_ID) wraz z jego właścicielem.
// Usuwa pozostałe gabinety (kaskadowo ich dane) i czyści zawartość celu.
//
// Użycie:
//   node --env-file=.env.local scripts/db-clean.mjs            # DRY-RUN (raport)
//   node --env-file=.env.local scripts/db-clean.mjs --apply    # wykonuje zmiany
//   ... --apply --delete-users                                 # + usuwa konta auth
//                                                               poza właścicielem celu
// ============================================================================
import { createClient } from '@supabase/supabase-js'

const TARGET_SALON_ID = 'fd7b006e-7165-4ac8-bbf8-4029694d9790' // iliclinic
const TARGET_OWNER_EMAIL = 'kontakt@iliclinic.pl'

const APPLY = process.argv.includes('--apply')
const DELETE_USERS = process.argv.includes('--delete-users')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Brak VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w środowisku.')
  console.error('Uruchom: node --env-file=.env.local scripts/db-clean.mjs')
  process.exit(1)
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

// Tabele z kolumną salon_id (treatment_forms i beauty_plan_products kasują się
// kaskadowo przez forms/treatments/beauty_plans — nie mają własnego salon_id).
const SALON_LINKED_TABLES = [
  'clients',
  'appointments',
  'forms',
  'client_forms',
  'submissions',
  'treatments',
  'time_blocks',
  'staff_members',
  'beauty_plans',
  'chat_messages',
]

async function count(table, filters = []) {
  let q = sb.from(table).select('*', { count: 'exact', head: true })
  for (const [op, col, val] of filters) {
    if (op === 'eq') q = q.eq(col, val)
    if (op === 'in') q = q.in(col, val)
  }
  const { count: c, error } = await q
  if (error) return `err: ${error.message}`
  return c ?? 0
}

async function salonInventory(salonId) {
  const inv = {}
  for (const table of SALON_LINKED_TABLES) {
    inv[table] = await count(table, [['eq', 'salon_id', salonId]])
  }
  return inv
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('pl-PL') : String(n)
}

async function main() {
  console.log(
    APPLY ? '=== TRYB: APPLY (zmiany zostaną zapisane) ===' : '=== TRYB: DRY-RUN (bez zmian) ===',
  )
  console.log(`Cel: salon ${TARGET_SALON_ID} (właściciel ${TARGET_OWNER_EMAIL})\n`)

  const { data: salons, error: salonsError } = await sb
    .from('salons')
    .select('id, name, user_id, created_at')
    .order('created_at')
  if (salonsError) throw new Error(`salons: ${salonsError.message}`)

  const target = salons.find((s) => s.id === TARGET_SALON_ID)
  if (!target) {
    console.error(`BŁĄD: nie znaleziono salonu docelowego ${TARGET_SALON_ID}. Przerywam.`)
    process.exit(1)
  }

  console.log('SALONY DO USUNIĘCIA:')
  const toDelete = salons.filter((s) => s.id !== TARGET_SALON_ID)
  for (const s of toDelete) {
    const inv = await salonInventory(s.id)
    const parts = Object.entries(inv)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}=${fmt(v)}`)
    console.log(
      `  - ${s.name} (${s.id.slice(0, 8)}) ${parts.length ? `[${parts.join(', ')}]` : '[pusty]'}`,
    )
  }

  console.log(`\nSALON DOCELOWY: ${target.name} (${target.id})`)
  const targetInv = await salonInventory(TARGET_SALON_ID)
  for (const [k, v] of Object.entries(targetInv)) console.log(`  - ${k}: ${fmt(v)}`)

  const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const users = usersPage?.users ?? []
  const owner = users.find((u) => (u.email ?? '').toLowerCase() === TARGET_OWNER_EMAIL)
  console.log(`\nKONTA AUTH (${users.length}), właściciel celu: ${owner?.id ?? 'NIE ZNALEZIONO'}`)
  for (const u of users) {
    const isOwner = u.id === owner?.id
    const owns = salons.filter((s) => s.user_id === u.id).map((s) => s.name)
    console.log(
      `  - ${u.email ?? u.id}${isOwner ? ' [CEL]' : ''}${owns.length ? ` (salony: ${owns.join(', ')})` : ''}`,
    )
  }

  if (DELETE_USERS) {
    const toDeleteUsers = users.filter((u) => u.id !== owner?.id)
    console.log(`\n--delete-users: usuniętych zostanie ${toDeleteUsers.length} kont auth.`)
  }

  const cacheCount = await count('scraped_products_cache')
  console.log(`\nscraped_products_cache: ${fmt(cacheCount)} wierszy do wyczyszczenia`)

  if (!APPLY) {
    console.log('\nDRY-RUN zakończony. Aby wykonać: dodaj --apply')
    return
  }

  console.log('\n--- WYKONUJĘ ---')

  for (const s of toDelete) {
    console.log(`Usuwam salon: ${s.name} (${s.id.slice(0, 8)})...`)
    // 1) wizyty najpierw (treatments RESTRICT)
    const { error: aptError } = await sb.from('appointments').delete().eq('salon_id', s.id)
    if (aptError) console.error(`  appointments: ${aptError.message}`)
    // 2) reszta przez kaskadę z salonu
    const { error } = await sb.from('salons').delete().eq('id', s.id)
    if (error) {
      console.error(`  BŁĄD salonu ${s.name}: ${error.message}`)
    } else {
      console.log('  ok')
    }
  }

  console.log('Czyszczę salon docelowy...')
  const order = [
    'appointments',
    'submissions',
    'client_forms',
    'forms',
    'time_blocks',
    'beauty_plans',
    'chat_messages',
    'clients',
    'treatments',
    'staff_members',
  ]
  for (const table of order) {
    const { error } = await sb.from(table).delete().eq('salon_id', TARGET_SALON_ID)
    if (error) console.error(`  ${table}: ${error.message}`)
  }
  console.log('  ok')

  const { error: cacheError } = await sb.from('scraped_products_cache').delete().neq('url', '')
  if (cacheError) console.error(`  scraped_products_cache: ${cacheError.message}`)
  else console.log('Cache produktów wyczyszczony.')

  if (DELETE_USERS) {
    for (const u of users) {
      if (u.id === owner?.id) continue
      const { error } = await sb.auth.admin.deleteUser(u.id)
      if (error) console.error(`  auth ${u.email}: ${error.message}`)
      else console.log(`  auth usunięte: ${u.email}`)
    }
  }

  console.log('\nFinalna weryfikacja:')
  const { data: remainingSalons } = await sb.from('salons').select('id, name')
  console.log(`  salony w bazie: ${remainingSalons?.length ?? 0}`)
  for (const s of remainingSalons ?? []) console.log(`    - ${s.name} (${s.id.slice(0, 8)})`)
  const finalInv = await salonInventory(TARGET_SALON_ID)
  for (const [k, v] of Object.entries(finalInv)) console.log(`  - ${k}: ${fmt(v)}`)
}

main().catch((e) => {
  console.error('Błąd krytyczny:', e.message)
  process.exit(1)
})
