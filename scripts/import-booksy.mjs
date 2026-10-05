#!/usr/bin/env node
// ============================================================================
// import-booksy.mjs — import klientów i zabiegów z eksportów Booksy (.xlsx).
//
// Użycie:
//   node --env-file=.env.local scripts/import-booksy.mjs           # DRY-RUN
//   node --env-file=.env.local scripts/import-booksy.mjs --apply   # zapis
//
// Opcje:
//   --clients-file=sciezka.xlsx      (domyślnie 20261005-klienci.xlsx)
//   --treatments-file=sciezka.xlsx   (domyślnie 20261004-treatments.xlsx)
//   --staff-domain=iliclinic.pl      (domena e-maili pracowników)
//
// Wymaga wcześniejszego zastosowania migracji 20261005_import_fields.sql.
// Idempotentny: upsert po (salon_id, external_code); duplikaty telefonu scalane.
// ============================================================================
import { createClient } from '@supabase/supabase-js'
import { readXlsx } from './lib/xlsx.mjs'

const TARGET_OWNER_EMAIL = 'kontakt@iliclinic.pl'
const TARGET_SALON_ID = 'fd7b006e-7165-4ac8-bbf8-4029694d9790'

const APPLY = process.argv.includes('--apply')
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const CLIENTS_FILE = arg('clients-file', '20261005-klienci.xlsx')
const TREATMENTS_FILE = arg('treatments-file', '20261004-treatments.xlsx')
const STAFF_DOMAIN = arg('staff-domain', 'iliclinic.pl')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Brak VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w środowisku.')
  console.error('Uruchom: node --env-file=.env.local scripts/import-booksy.mjs')
  process.exit(1)
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

// ------------------------------- helpers ------------------------------------
const POLISH_MAP = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => POLISH_MAP[c] ?? c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function cell(row, headers, name, fallbackIdx) {
  let idx = headers.indexOf(name)
  if (idx === -1) idx = fallbackIdx
  return (row[idx] ?? '').trim()
}

function parseTs(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec((s || '').trim())
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
}

function parseBirth(dayMonth, year) {
  const m = /^(\d{1,2})[.\-/](\d{1,2})$/.exec((dayMonth || '').trim())
  const y = Number.parseInt((year || '').trim(), 10)
  if (!m || !y || y < 1900 || y > 2100) return null
  const iso = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
  const dt = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(dt.getTime()) ? null : iso
}

function normalizePhone(raw) {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return { phone: '', key: '', note: 'brak' }
  if (d.startsWith('0048')) d = d.slice(4)
  if (d.length === 9) return { phone: `+48${d}`, key: d, note: null }
  if (d.length === 11 && d.startsWith('48')) return { phone: `+${d}`, key: d.slice(2), note: null }
  if (d.length === 12 && d.startsWith('48'))
    return { phone: `+48${d.slice(2)}`, key: d.slice(2), note: '12-cyfrowy' }
  return { phone: `+${d}`, key: d, note: 'zagraniczny' }
}

const TAK = (v) => (v || '').trim().toUpperCase() === 'TAK'

function cleanDescription(s) {
  return (s || '')
    .replace(/\r\n/g, '\n')
    .replace(/\\-/g, '-')
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('pl-PL') : String(n)
}

// ------------------------------ load target ---------------------------------
async function resolveTargetSalon() {
  const { data: usersPage, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`auth.listUsers: ${error.message}`)
  const owner = usersPage.users.find((u) => (u.email ?? '').toLowerCase() === TARGET_OWNER_EMAIL)
  if (!owner) throw new Error(`Nie znaleziono użytkownika ${TARGET_OWNER_EMAIL}`)
  const { data: salons, error: sErr } = await sb
    .from('salons')
    .select('id, name, user_id')
    .eq('user_id', owner.id)
  if (sErr) throw new Error(`salons: ${sErr.message}`)
  if (!salons?.length) throw new Error(`Użytkownik ${TARGET_OWNER_EMAIL} nie ma salonu`)
  if (salons.length > 1)
    console.warn(`UWAGA: ${salons.length} salony tego użytkownika — używam pierwszego`)
  const salon = salons[0]
  if (salon.id !== TARGET_SALON_ID) {
    console.warn(`UWAGA: id salonu (${salon.id}) różni się od oczekiwanego (${TARGET_SALON_ID})`)
  }
  return { owner, salon }
}

// ------------------------------ parse files ---------------------------------
function parseTreatments(path) {
  const { headers, rows } = readXlsx(path)
  const items = []
  const warnings = []
  for (const [i, row] of rows.entries()) {
    const name = cell(row, headers, 'Nazwa', 2)
    if (!name) {
      warnings.push(`zabieg wiersz ${i + 2}: brak nazwy — pominięto`)
      continue
    }
    const durationRaw = Number.parseInt(cell(row, headers, 'Czas (min)', 3), 10)
    const priceRaw = cell(row, headers, 'Cena', 4)
    const priceMaxRaw = cell(row, headers, 'Cena max', 5)
    const price = priceRaw && !Number.isNaN(Number(priceRaw)) ? Number(priceRaw) : null
    const priceMax = priceMaxRaw && !Number.isNaN(Number(priceMaxRaw)) ? Number(priceMaxRaw) : null
    if (price === null) warnings.push(`zabieg "${name}": brak ceny`)
    items.push({
      external_code: cell(row, headers, 'Kod', 0) || null,
      category: cell(row, headers, 'Kategoria', 1) || null,
      name,
      duration_minutes: Number.isNaN(durationRaw) ? 60 : durationRaw,
      price,
      price_max: priceMax,
      online_booking: TAK(cell(row, headers, 'Rezerwacja online', 7)),
      single_service_only: TAK(cell(row, headers, 'Tylko jedna usługa w tym samym czasie', 6)),
      description: cleanDescription(cell(row, headers, 'Notatka', 9)) || null,
    })
  }
  return { items, warnings }
}

function parseClients(path) {
  const { headers, rows } = readXlsx(path)
  const warnings = []
  const seen = new Map()
  let skippedNoName = 0
  let merged = 0
  let noPhone = 0
  const foreignPhones = []

  for (const row of rows) {
    const name = cell(row, headers, 'Imię i nazwisko', 2).replace(/\s+/g, ' ')
    if (!name) {
      skippedNoName++
      continue
    }
    const { phone, key, note } = normalizePhone(cell(row, headers, 'Telefon komórkowy', 4))
    if (!phone) noPhone++
    if (note === 'zagraniczny') foreignPhones.push(`${name}: ${phone}`)

    const rec = {
      external_code: cell(row, headers, 'Kod klienta', 0) || null,
      name,
      phone,
      email: cell(row, headers, 'Email', 5) || null,
      notes: cell(row, headers, 'Notatka', 19) || null,
      important_info: cell(row, headers, 'Ważna informacja', 18) || null,
      gender: cell(row, headers, 'Płeć', 3) || null,
      referral_source: cell(row, headers, 'Skąd klient wie o salonie', 7) || null,
      referred_by: cell(row, headers, 'Osoba polecająca', 25) || null,
      birth_date: parseBirth(
        cell(row, headers, 'Dzień i miesiąc urodzin', 8),
        cell(row, headers, 'Rok urodzin', 9),
      ),
      consent_notifications_sms: TAK(cell(row, headers, 'Zgoda na powiadomienia SMS', 11)),
      consent_notifications_email: TAK(cell(row, headers, 'Zgoda na powiadomienia email', 12)),
      consent_marketing_sms: TAK(cell(row, headers, 'Zgoda na reklamę SMS', 13)),
      consent_marketing_email: TAK(cell(row, headers, 'Zgoda na reklamę email', 14)),
      discount_services: Number.parseInt(cell(row, headers, 'Rabat na usługi (%)', 15), 10) || 0,
      discount_products: Number.parseInt(cell(row, headers, 'Rabat na produkty (%)', 16), 10) || 0,
      address: cell(row, headers, 'Adres', 20) || null,
      postal_code: cell(row, headers, 'Kod pocztowy', 21) || null,
      city: cell(row, headers, 'Miejscowość', 22) || null,
      last_visit_at: parseTs(cell(row, headers, 'Data ostatniej wizyty', 23)),
      next_visit_at: parseTs(cell(row, headers, 'Data kolejnej wizyty', 26)),
      created_at: parseTs(cell(row, headers, 'Data dodania', 1)),
      _staffName: cell(row, headers, 'Pracownik ostatniej wizyty', 24) || null,
    }

    const dedupeKey = phone ? `p:${key}` : `n:${name.toLowerCase()}`
    const prev = seen.get(dedupeKey)
    if (!prev) {
      seen.set(dedupeKey, rec)
      continue
    }
    merged++
    // scalanie: uzupełnij puste pola z duplikatu, dopisz notatki
    for (const f of [
      'email',
      'important_info',
      'notes',
      'gender',
      'referral_source',
      'birth_date',
      'address',
      'postal_code',
      'city',
    ]) {
      if (!prev[f] && rec[f]) prev[f] = rec[f]
    }
    if (!prev.last_visit_at && rec.last_visit_at) prev.last_visit_at = rec.last_visit_at
    if (!prev.external_code && rec.external_code) prev.external_code = rec.external_code
    if (rec.notes && prev.notes && !prev.notes.includes(rec.notes)) {
      prev.notes = `${prev.notes}\n${rec.notes}`
    }
  }

  return {
    items: [...seen.values()],
    warnings,
    stats: { input: rows.length, skippedNoName, merged, noPhone, foreignPhones },
  }
}

function collectStaff(clientsResult) {
  const names = new Map()
  for (const c of clientsResult.items) {
    if (c._staffName) {
      const key = slug(c._staffName)
      if (!names.has(key)) {
        names.set(key, {
          name: c._staffName,
          email: `${slug(c._staffName)}@${STAFF_DOMAIN}`,
        })
      }
    }
  }
  return [...names.values()]
}

// ------------------------------- DB checks ----------------------------------
async function migrationApplied() {
  const { error: tErr } = await sb.from('treatments').select('external_code').limit(1)
  const { error: cErr } = await sb.from('clients').select('external_code, important_info').limit(1)
  const err = tErr || cErr
  return { ok: !err, message: err?.message }
}

async function existingExternalCodes(table) {
  const codes = new Set()
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from(table)
      .select('external_code')
      .not('external_code', 'is', null)
      .range(from, from + page - 1)
    if (error) return { codes, available: false, message: error.message }
    for (const r of data ?? []) codes.add(r.external_code)
    if (!data || data.length < page) break
  }
  return { codes, available: true }
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// --------------------------------- main -------------------------------------
async function main() {
  console.log(APPLY ? '=== TRYB: APPLY ===' : '=== TRYB: DRY-RUN ===')

  const { salon, owner } = await resolveTargetSalon()
  console.log(`Cel: ${salon.name} (${salon.id}) — owner ${owner.email}\n`)

  const mig = await migrationApplied()
  if (!mig.ok) console.log(`UWAGA: migracja pól importu NIE jest zastosowana (${mig.message})\n`)

  const treatments = parseTreatments(TREATMENTS_FILE)
  const clients = parseClients(CLIENTS_FILE)
  const staff = collectStaff(clients)

  console.log('--- ZABIEGI ---')
  console.log(`Plik: ${TREATMENTS_FILE}`)
  console.log(`  do importu:        ${fmt(treatments.items.length)}`)
  console.log(`  kategorie:         ${fmt(new Set(treatments.items.map((t) => t.category)).size)}`)
  console.log(
    `  bez ceny:          ${fmt(treatments.items.filter((t) => t.price === null).length)}`,
  )
  console.log(
    `  rezerwacja online: ${fmt(treatments.items.filter((t) => t.online_booking).length)}`,
  )

  console.log('\n--- KLIENCI ---')
  console.log(`Plik: ${CLIENTS_FILE}`)
  console.log(`  wiersze wejściowe: ${fmt(clients.stats.input)}`)
  console.log(`  do importu:        ${fmt(clients.items.length)}`)
  console.log(`  scalone duplikaty: ${fmt(clients.stats.merged)}`)
  console.log(`  bez nazwy (skip):  ${fmt(clients.stats.skippedNoName)}`)
  console.log(`  bez telefonu:      ${fmt(clients.stats.noPhone)}`)
  console.log(`  telefony zagr.:    ${fmt(clients.stats.foreignPhones.length)}`)

  console.log('\n--- PRACOWNICY (z kolumny "Pracownik ostatniej wizyty") ---')
  for (const s of staff) console.log(`  - ${s.name} <${s.email}>`)

  if (mig.ok) {
    const [tCodes, cCodes] = await Promise.all([
      existingExternalCodes('treatments'),
      existingExternalCodes('clients'),
    ])
    const tUpd = treatments.items.filter(
      (t) => t.external_code && tCodes.codes.has(t.external_code),
    ).length
    const cUpd = clients.items.filter(
      (c) => c.external_code && cCodes.codes.has(c.external_code),
    ).length
    console.log('\n--- W BAZIE (po external_code) ---')
    console.log(`  zabiegi: ${fmt(tUpd)} update / ${fmt(treatments.items.length - tUpd)} insert`)
    console.log(`  klienci: ${fmt(cUpd)} update / ${fmt(clients.items.length - cUpd)} insert`)
  }

  const warnings = [...treatments.warnings, ...clients.warnings]
  if (warnings.length) {
    console.log(`\n--- OSTRZEŻENIA (${warnings.length}) ---`)
    for (const w of warnings.slice(0, 15)) console.log(`  - ${w}`)
    if (warnings.length > 15) console.log(`  ... i ${warnings.length - 15} więcej`)
  }

  if (!APPLY) {
    console.log('\nDRY-RUN zakończony. Zapisz dane: dodaj --apply')
    return
  }

  if (!mig.ok) {
    console.error('\nBŁĄD: najpierw zastosuj migrację 20261005_import_fields.sql w Supabase.')
    process.exit(1)
  }

  console.log('\n--- ZAPIS ---')

  // 1) pracownicy
  const staffingRows = staff.map((s) => ({
    salon_id: salon.id,
    name: s.name,
    email: s.email,
    role: 'staff',
    is_active: true,
  }))
  const { data: savedStaff, error: staffError } = await sb
    .from('staff_members')
    .upsert(staffingRows, { onConflict: 'salon_id,email' })
    .select('id, email')
  if (staffError) throw new Error(`staff_members: ${staffError.message}`)
  const staffByEmail = new Map((savedStaff ?? []).map((s) => [s.email, s.id]))
  console.log(`  pracownicy: ${savedStaff?.length ?? 0}`)

  // 2) zabiegi
  const treatmentRows = treatments.items.map(({ ...t }) => ({ ...t, salon_id: salon.id }))
  let tDone = 0
  for (const part of chunk(treatmentRows, 500)) {
    const { error } = await sb
      .from('treatments')
      .upsert(part, { onConflict: 'salon_id,external_code' })
    if (error) throw new Error(`treatments: ${error.message}`)
    tDone += part.length
    console.log(`  zabiegi: ${tDone}/${treatmentRows.length}`)
  }

  // 3) klienci
  const clientRows = clients.items.map(({ _staffName, ...c }) => ({
    ...c,
    salon_id: salon.id,
    last_visit_staff_id: _staffName
      ? (staffByEmail.get(`${slug(_staffName)}@${STAFF_DOMAIN}`) ?? null)
      : null,
  }))
  let cDone = 0
  for (const part of chunk(clientRows, 500)) {
    const { error } = await sb
      .from('clients')
      .upsert(part, { onConflict: 'salon_id,external_code' })
    if (error) throw new Error(`clients: ${error.message}`)
    cDone += part.length
    console.log(`  klienci: ${cDone}/${clientRows.length}`)
  }

  // 4) weryfikacja
  const { count: cTreat } = await sb
    .from('treatments')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon.id)
  const { count: cClients } = await sb
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon.id)
  const { count: cStaff } = await sb
    .from('staff_members')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon.id)
  console.log('\nStan po imporcie:')
  console.log(`  zabiegi: ${fmt(cTreat)}`)
  console.log(`  klienci: ${fmt(cClients)}`)
  console.log(`  pracownicy: ${fmt(cStaff)}`)
}

main().catch((e) => {
  console.error('Błąd krytyczny:', e.message)
  process.exit(1)
})
