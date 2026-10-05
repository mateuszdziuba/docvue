#!/usr/bin/env node
// ============================================================================
// import-csv-clients.mjs — import klientów z pliku CSV (klienci.csv).
//
// Dodaje tylko klientów, których nie ma już w bazie (dopasowanie: telefon →
// e-mail → pełne imię i nazwisko). Dla dopasowanych uzupełnia puste pola
// adresowe oraz pole `location` (miejscowość). Nazwisko nadpisuje tylko, gdy
// zgadza się pierwsze imię; konflikt imienia trafia do raportu (bez zmian).
//
// Użycie:
//   node --env-file=.env.local scripts/import-csv-clients.mjs             # DRY-RUN
//   node --env-file=.env.local scripts/import-csv-clients.mjs --apply     # zapis
//
// Opcje:
//   --file=klienci.csv   (domyślnie klienci.csv)
//
// Wymaga wcześniejszego zastosowania migracji 20261006_add_client_location.sql.
// Idempotentny: kolejne uruchomienia nie dublują klientów.
// ============================================================================
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const TARGET_OWNER_EMAIL = 'kontakt@iliclinic.pl'
const APPLY = process.argv.includes('--apply')
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const CSV_FILE = arg('file', 'klienci.csv')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Brak VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w środowisku.')
  console.error('Uruchom: node --env-file=.env.local scripts/import-csv-clients.mjs')
  process.exit(1)
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

// ------------------------------- CSV parser ---------------------------------
function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const rows = []
  for (const line of lines) {
    if (!line.trim()) continue
    const cells = []
    let cur = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"'
          i++
        } else if (ch === '"') {
          quoted = false
        } else {
          cur += ch
        }
      } else if (ch === '"') {
        quoted = true
      } else if (ch === ',') {
        cells.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

// ------------------------------- helpers ------------------------------------
function normPhone(raw, dialCode = '+48') {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return { phone: '', key: '' }
  if (d.startsWith('0048')) d = d.slice(4)
  if (d.length === 11 && d.startsWith('48')) d = d.slice(2)
  const dial = (dialCode || '+48').replace(/\D/g, '') || '48'
  return { phone: `+${dial}${d}`, key: d }
}

function buildAddress(row) {
  const street = (row.street || '').trim()
  const building = (row.building_number || '').trim()
  const local = (row.local_number || '').trim()
  if (!street && !building) return null
  let addr = street
  if (building && !new RegExp(`(^|[\\s/])${building}$`).test(street)) {
    addr = addr ? `${addr} ${building}` : building
  }
  if (local) addr = addr ? `${addr}/${local}` : local
  return addr || null
}

const emptyToNull = (v) => {
  const t = (v || '').trim()
  return t || null
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('pl-PL') : String(n)
}

// ------------------------------ load target ---------------------------------
async function resolveTargetSalon() {
  const { data: usersPage, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`auth.listUsers: ${error.message}`)
  const owner = usersPage.users.find(
    (u) => (u.email ?? '').toLowerCase() === TARGET_OWNER_EMAIL,
  )
  if (!owner) throw new Error(`Nie znaleziono użytkownika ${TARGET_OWNER_EMAIL}`)
  const { data: salons, error: sErr } = await sb
    .from('salons')
    .select('id, name')
    .eq('user_id', owner.id)
  if (sErr) throw new Error(`salons: ${sErr.message}`)
  if (!salons?.length) throw new Error(`Użytkownik ${TARGET_OWNER_EMAIL} nie ma salonu`)
  return salons[0]
}

async function migrationApplied() {
  const { error } = await sb.from('clients').select('location').limit(1)
  return { ok: !error, message: error?.message }
}

// --------------------------------- main -------------------------------------
async function main() {
  console.log(APPLY ? '=== TRYB: APPLY ===' : '=== TRYB: DRY-RUN ===')

  const salon = await resolveTargetSalon()
  console.log(`Cel: ${salon.name} (${salon.id})\n`)

  const mig = await migrationApplied()
  if (!mig.ok) console.log(`UWAGA: migracja location nie jest zastosowana (${mig.message})\n`)

  const raw = readFileSync(CSV_FILE, 'utf8')
  const rows = parseCsv(raw)
  const header = rows[0].map((h) => h.trim())
  const data = rows
    .slice(1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])))
    .filter((r) => r.first_name || r.last_name)

  console.log(`Plik: ${CSV_FILE}`)
  console.log(`  wiersze: ${fmt(data.length)}`)

  // 1) dedupe wewnętrzny po telefonie (ostatnia niepusta miejscowość wygrywa)
  const merged = new Map()
  const internalNotes = []
  let internalDup = 0
  for (const row of data) {
    const { phone, key } = normPhone(row.phone, row.dial_code)
    const dkey = key ? `p:${key}` : `n:${row.first_name} ${row.last_name}`.toLowerCase()
    const record = {
      first_name: row.first_name,
      last_name: row.last_name,
      email: emptyToNull(row.email),
      phone,
      phoneKey: key,
      city: emptyToNull(row.city),
      postal_code: emptyToNull(row.postal_code),
      address: buildAddress(row),
    }
    const prev = merged.get(dkey)
    if (!prev) {
      merged.set(dkey, record)
      continue
    }
    internalDup++
    if (prev.city && record.city && prev.city !== record.city) {
      internalNotes.push(`${record.first_name} ${record.last_name}: miasto „${prev.city}” → „${record.city}”`)
    }
    if (record.email && !prev.email) prev.email = record.email
    if (record.postal_code && !prev.postal_code) prev.postal_code = record.postal_code
    if (record.address && !prev.address) prev.address = record.address
    if (record.city) prev.city = record.city
    if (record.first_name) prev.first_name = record.first_name
    if (record.last_name) prev.last_name = record.last_name
  }
  const unique = [...merged.values()]
  console.log(`  wewnętrzne duplikaty scalone: ${fmt(internalDup)}`)
  console.log(`  unikalnych osób: ${fmt(unique.length)}\n`)

  // 2) istniejący klienci salonu
  const { data: dbClients, error: cErr } = await sb
    .from('clients')
    .select('*')
    .eq('salon_id', salon.id)
  if (cErr) throw new Error(`clients: ${cErr.message}`)

  const byPhone = new Map()
  const byEmail = new Map()
  const byName = new Map()
  for (const c of dbClients) {
    const { key } = normPhone(c.phone)
    if (key) byPhone.set(key, c)
    const e = (c.email || '').toLowerCase()
    if (e) byEmail.set(e, c)
    byName.set((c.name || '').trim().toLowerCase(), c)
  }

  const inserts = []
  const updates = []
  const conflicts = []

  for (const person of unique) {
    const fullName = `${person.first_name} ${person.last_name}`.trim()
    const email = person.email?.toLowerCase()
    let match = person.phoneKey ? byPhone.get(person.phoneKey) : undefined
    if (!match && email) match = byEmail.get(email)
    if (!match) match = byName.get(fullName.toLowerCase())

    if (!match) {
      inserts.push({
        salon_id: salon.id,
        name: fullName,
        email: person.email,
        phone: person.phone || '',
        address: person.address,
        postal_code: person.postal_code,
        city: person.city,
        location: person.city,
      })
      continue
    }

    const dbFirst = (match.name || '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
    const csvFirst = person.first_name.toLowerCase()
    const dbFull = (match.name || '').trim().toLowerCase()
    const csvFull = fullName.toLowerCase()

    if (dbFull === csvFull) {
      // ta sama osoba — uzupełnij puste pola
      const patch = {}
      if (!match.location && person.city) patch.location = person.city
      if (!match.city && person.city) patch.city = person.city
      if (!match.postal_code && person.postal_code) patch.postal_code = person.postal_code
      if (!match.address && person.address) patch.address = person.address
      if (Object.keys(patch).length) updates.push({ id: match.id, name: match.name, patch, reason: 'uzupełnienie' })
    } else if (dbFirst === csvFirst) {
      // to samo imię, inne/niepełne nazwisko → nadpisz pełne imię i nazwisko
      const patch = { name: fullName }
      if (!match.location && person.city) patch.location = person.city
      if (!match.city && person.city) patch.city = person.city
      if (!match.postal_code && person.postal_code) patch.postal_code = person.postal_code
      if (!match.address && person.address) patch.address = person.address
      updates.push({ id: match.id, name: match.name, patch, reason: `nazwisko: „${match.name}” → „${fullName}”` })
    } else {
      conflicts.push({ csv: fullName, db: match.name, phone: person.phone })
    }
  }

  console.log('--- WYNIK ---')
  console.log(`  nowi klienci (insert):     ${fmt(inserts.length)}`)
  console.log(`  dopasowani (aktualizacja): ${fmt(updates.length)}`)
  console.log(`  konflikty (pominięci):     ${fmt(conflicts.length)}`)
  if (internalNotes.length) {
    console.log('\n  scalone duplikaty z różnymi miejscowościami:')
    for (const n of internalNotes) console.log(`   - ${n}`)
  }
  if (updates.length) {
    console.log('\n  aktualizacje:')
    for (const u of updates) console.log(`   - ${u.name} — ${u.reason}`)
  }
  if (conflicts.length) {
    console.log('\n  konflikty (ten sam telefon, inne imię — pominięte):')
    for (const c of conflicts) console.log(`   - CSV: ${c.csv} vs DB: ${c.db} (${c.phone})`)
  }

  if (!APPLY) {
    console.log('\nDRY-RUN zakończony. Zapisz dane: dodaj --apply')
    return
  }

  if (!mig.ok) {
    console.error('\nBŁĄD: najpierw zastosuj migrację 20261006_add_client_location.sql w Supabase.')
    process.exit(1)
  }

  console.log('\n--- ZAPIS ---')
  let inserted = 0
  for (let i = 0; i < inserts.length; i += 500) {
    const part = inserts.slice(i, i + 500)
    const { error } = await sb.from('clients').insert(part)
    if (error) throw new Error(`insert klientów: ${error.message}`)
    inserted += part.length
    console.log(`  klienci: ${inserted}/${inserts.length}`)
  }

  for (const u of updates) {
    const { error } = await sb.from('clients').update(u.patch).eq('id', u.id)
    if (error) console.error(`  update ${u.name}: ${error.message}`)
  }

  const { count } = await sb
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon.id)
  const { count: withLocation } = await sb
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon.id)
    .not('location', 'is', null)
  console.log(`\nStan po imporcie: ${fmt(count)} klientów (${fmt(withLocation)} z lokalizacją)`)
}

main().catch((e) => {
  console.error('Błąd krytyczny:', e.message)
  process.exit(1)
})
