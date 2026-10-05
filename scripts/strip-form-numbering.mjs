#!/usr/bin/env node
/**
 * Usuwa ręczną numerację („1.”, „2)”) z etykiet pól we wszystkich formularzach.
 * Numeracja jest teraz nadawana automatycznie w UI (FormRenderer, podgląd, PDF).
 *
 * Użycie:
 *   node --env-file-if-exists=.env.local scripts/strip-form-numbering.mjs          # dry-run
 *   node --env-file-if-exists=.env.local scripts/strip-form-numbering.mjs --apply  # zapis
 */
import { createClient } from '@supabase/supabase-js'

const NUMBERING = /^\s*\d{1,2}\s*[.)]\s+/

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('Brak VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w środowisku.')
  process.exit(1)
}

const apply = process.argv.includes('--apply')
const supabase = createClient(supabaseUrl, serviceKey)

const { data: forms, error } = await supabase.from('forms').select('id, title, schema')
if (error) {
  console.error('Błąd odczytu formularzy:', error.message)
  process.exit(1)
}

let totalStripped = 0
let changedForms = 0
let skippedForms = 0

for (const form of forms ?? []) {
  const fields = form.schema?.fields
  if (!Array.isArray(fields)) continue

  let strippedInForm = 0
  const nextFields = fields.map((field) => {
    if (typeof field.label !== 'string' || !NUMBERING.test(field.label)) return field
    strippedInForm += 1
    return { ...field, label: field.label.replace(NUMBERING, '').trimStart() }
  })

  if (strippedInForm === 0) continue

  totalStripped += strippedInForm
  changedForms += 1
  console.log(
    `${apply ? 'Zapis' : 'Dry-run'}: ${form.title} — ${strippedInForm} etykiet`,
    `np. "${fields.find((f) => NUMBERING.test(f.label ?? ''))?.label?.slice(0, 50)}"`,
  )

  if (apply) {
    const { error: updateError } = await supabase
      .from('forms')
      .update({ schema: { ...form.schema, fields: nextFields } })
      .eq('id', form.id)
    if (updateError) {
      // Formularze z odpowiedziami są zablokowane strukturalnie — numerację
      // i tak zdejmuje warstwa wyświetlania (renderer/PDF).
      console.warn(`  Pominięto (${form.title}):`, updateError.message)
      skippedForms += 1
    }
  }
}

console.log(
  `\n${apply ? 'Zaktualizowano' : 'Do usunięcia'}: ${totalStripped} etykiet w ${changedForms} formularzach.`,
)
if (apply && skippedForms > 0) {
  console.log(
    `Pominięto ${skippedForms} formularzy z odpowiedziami (zablokowane) — ich etykiety są czyszczone przy wyświetlaniu.`,
  )
}
if (!apply) console.log('Uruchom ponownie z --apply, aby zapisać zmiany.')
