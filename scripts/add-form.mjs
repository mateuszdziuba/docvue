#!/usr/bin/env node
// ============================================================================
// add-form.mjs — dodaje formularz(e) do salonu iliclinic z definicji JSON.
//
// Użycie:
//   node --env-file=.env.local scripts/add-form.mjs --file=formularz.json        # DRY-RUN
//   node --env-file=.env.local scripts/add-form.mjs --file=formularz.json --apply
//   cat formularz.json | node --env-file=.env.local scripts/add-form.mjs         # stdin
//
// Format JSON (pojedynczy formularz lub tablica):
// {
//   "title": "Zgoda na zabieg",
//   "description": "Opcjonalny opis",
//   "fields": [
//     { "type": "text", "label": "Imię i nazwisko", "required": true },
//     { "type": "date", "label": "Data urodzenia" },
//     { "type": "radio", "label": "Czy przyjmujesz leki?", "options": ["Tak", "Nie"] },
//     { "type": "checkbox", "label": "Oświadczam, że..." },
//     { "type": "separator", "label": "Dane kontaktowe" }
//   ]
// }
//
// Typy: text, textarea, select, radio, checkbox_group, checkbox, date, email,
//        tel, number, signature, separator.
// Opcje mogą być stringami albo { "label": "...", "value": "...", "description": "..." }.
// Idempotentny: formularz o tym samym tytule jest aktualizowany (o ile nie ma
// jeszcze odpowiedzi — wtedy skrypt odmawia zmiany schematu).
// ============================================================================
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const TARGET_OWNER_EMAIL = 'kontakt@iliclinic.pl'
const APPLY = process.argv.includes('--apply')
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const FILE = arg('file', null)

const ALLOWED_TYPES = new Set([
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox_group',
  'checkbox',
  'date',
  'email',
  'tel',
  'number',
  'signature',
  'separator',
  'info',
])

const TYPE_ALIASES = {
  input: 'text',
  textarea: 'textarea',
  select: 'select',
  radio: 'radio',
  checkbox: 'checkbox',
  date: 'date',
  signature: 'signature',
  number: 'number',
  email: 'email',
  tel: 'tel',
}

const OPTION_TYPES = new Set(['select', 'radio', 'checkbox_group'])

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Brak VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w środowisku.')
  console.error('Uruchom: node --env-file=.env.local scripts/add-form.mjs --file=formularz.json')
  process.exit(1)
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

// ------------------------------- helpers ------------------------------------
function slugify(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

function uniqueName(base, used) {
  let name = base || 'pole'
  let i = 2
  while (used.has(name)) {
    name = `${base}_${i}`
    i++
  }
  used.add(name)
  return name
}

function normalizeOptions(raw, _fieldLabel) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const used = new Set()
  return raw.map((opt, idx) => {
    if (typeof opt === 'string') {
      const label = opt.trim()
      let value = slugify(label) || `opcja_${idx + 1}`
      while (used.has(value)) value = `${value}_${idx + 1}`
      used.add(value)
      return { label, value }
    }
    const label = (opt.label ?? '').trim()
    let value = (opt.value ?? slugify(label) ?? `opcja_${idx + 1}`).trim()
    while (used.has(value)) value = `${value}_${idx + 1}`
    used.add(value)
    const out = { label, value }
    if (opt.description) out.description = String(opt.description)
    return out
  })
}

function normalizeForm(raw, indexLabel) {
  const errors = []
  if (!raw || typeof raw !== 'object') return { errors: [`${indexLabel}: nie jest obiektem JSON`] }
  const title = String(raw.title ?? '').trim()
  if (!title) errors.push(`${indexLabel}: brak "title"`)
  if (title.length > 200) errors.push(`${indexLabel}: "title" dłuższy niż 200 znaków`)
  const description = raw.description ? String(raw.description).trim() : null
  const rawFields = Array.isArray(raw.fields) ? raw.fields : []
  if (rawFields.length === 0) errors.push(`${indexLabel}: brak pól ("fields")`)

  const usedNames = new Set()
  const fields = []
  for (const [i, f] of rawFields.entries()) {
    const where = `${indexLabel}, pole #${i + 1}`
    const rawType = String(f?.type ?? 'text').trim()
    const type = TYPE_ALIASES[rawType.toLowerCase()] ?? rawType.toLowerCase()
    if (!ALLOWED_TYPES.has(type)) {
      errors.push(
        `${where}: nieznany typ "${rawType}" (dozwolone: ${[...ALLOWED_TYPES].join(', ')})`,
      )
      continue
    }
    const label = String(f?.label ?? '').trim()
    if (!label) errors.push(`${where}: brak "label"`)
    const options = OPTION_TYPES.has(type) ? normalizeOptions(f?.options, label) : undefined
    if (OPTION_TYPES.has(type) && options.length === 0) {
      errors.push(`${where}: typ "${type}" wymaga niepustych "options"`)
    }
    const generated = uniqueName(slugify(f?.name || label), usedNames)
    const fieldName = type === 'separator' ? generated : generated || `pole_${i + 1}`
    const field = { name: fieldName, label, type }
    if (f?.required) field.required = true
    if (f?.placeholder) field.placeholder = String(f.placeholder)
    if (f?.description) field.description = String(f.description)
    if (options) field.options = options
    if (type === 'number') {
      for (const key of ['min', 'max', 'step']) {
        if (f?.[key] !== undefined && f?.[key] !== null && Number.isFinite(Number(f[key]))) {
          field[key] = Number(f[key])
        }
      }
    }
    fields.push(field)
  }

  return {
    errors,
    form: errors.length
      ? null
      : {
          title,
          description,
          schema: { fields },
        },
  }
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('pl-PL') : String(n)
}

function typeSummary(fields) {
  const counts = new Map()
  for (const f of fields) counts.set(f.type, (counts.get(f.type) ?? 0) + 1)
  return [...counts.entries()].map(([t, c]) => `${t}×${c}`).join(', ')
}

// --------------------------------- main -------------------------------------
async function loadInput() {
  const text = FILE ? readFileSync(FILE, 'utf8') : await readStdin()
  const parsed = JSON.parse(text)
  return Array.isArray(parsed) ? parsed : [parsed]
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

async function resolveTargetSalon() {
  const { data: usersPage, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`auth.listUsers: ${error.message}`)
  const owner = usersPage.users.find((u) => (u.email ?? '').toLowerCase() === TARGET_OWNER_EMAIL)
  if (!owner) throw new Error(`Nie znaleziono użytkownika ${TARGET_OWNER_EMAIL}`)
  const { data: salons, error: sErr } = await sb
    .from('salons')
    .select('id, name')
    .eq('user_id', owner.id)
  if (sErr) throw new Error(`salons: ${sErr.message}`)
  if (!salons?.length) throw new Error(`Użytkownik ${TARGET_OWNER_EMAIL} nie ma salonu`)
  return salons[0]
}

async function main() {
  console.log(APPLY ? '=== TRYB: APPLY ===' : '=== TRYB: DRY-RUN ===')
  const salon = await resolveTargetSalon()
  console.log(`Cel: ${salon.name} (${salon.id})\n`)

  const inputs = await loadInput()
  const normalized = inputs.map((raw, i) => normalizeForm(raw, `formularz #${i + 1}`))
  const errors = normalized.flatMap((n) => n.errors)
  if (errors.length) {
    console.error('Błędy walidacji:')
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  const forms = normalized.map((n) => n.form)

  for (const form of forms) {
    console.log(`Formularz: „${form.title}”`)
    console.log(`  pól: ${form.schema.fields.length} (${typeSummary(form.schema.fields)})`)
    for (const f of form.schema.fields) {
      const req = f.required ? ' [wymagane]' : ''
      const opts = f.options ? ` — opcje: ${f.options.map((o) => o.label).join(' / ')}` : ''
      console.log(`    • ${f.label} (${f.type})${req}${opts}`)
    }

    const { data: existing } = await sb
      .from('forms')
      .select('id, title, schema')
      .eq('salon_id', salon.id)
      .eq('title', form.title)
      .maybeSingle()

    if (!existing) {
      console.log('  → nowy formularz (insert)')
      if (APPLY) {
        const { error } = await sb.from('forms').insert({
          salon_id: salon.id,
          title: form.title,
          description: form.description,
          schema: form.schema,
          is_active: true,
          is_public: false,
        })
        if (error) throw new Error(`insert formularza: ${error.message}`)
        console.log('  → zapisano')
      }
      continue
    }

    const { count: submissions } = await sb
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', existing.id)
    console.log(`  → istnieje (${fmt(submissions ?? 0)} odpowiedzi)`)
    if ((submissions ?? 0) > 0) {
      console.log('  → POMINIĘTO zmianę schematu (formularz ma odpowiedzi; trigger blokuje edycję)')
      continue
    }
    if (APPLY) {
      const { error } = await sb
        .from('forms')
        .update({
          description: form.description,
          schema: form.schema,
        })
        .eq('id', existing.id)
      if (error) throw new Error(`update formularza: ${error.message}`)
      console.log('  → zaktualizowano')
    }
  }

  if (!APPLY) console.log('\nDRY-RUN zakończony. Zapisz: dodaj --apply')
}

main().catch((e) => {
  console.error('Błąd krytyczny:', e.message)
  process.exit(1)
})
