import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { FormSchema } from '@/types/database'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

const formFieldInputSchema = z
  .object({
    name: z.string().min(1, 'Każde pole musi mieć nazwę').max(120, 'Nazwa pola jest zbyt długa'),
    label: z.string().max(500, 'Etykieta może mieć maksymalnie 500 znaków'),
    type: z.string().min(1, 'Każde pole musi mieć typ').max(40),
    variant: z.string().max(40).optional(),
    placeholder: z.string().max(500, 'Podpowiedź może mieć maksymalnie 500 znaków').optional(),
    description: z.string().max(2000, 'Opis pola jest zbyt długi').optional(),
    required: z.boolean().optional(),
    disabled: z.boolean().optional(),
    options: z
      .array(
        z.object({
          label: z.string().max(500, 'Etykieta opcji jest zbyt długa'),
          value: z.string().min(1, 'Opcja musi mieć wartość').max(200),
        }),
      )
      .max(200, 'Maksymalna liczba opcji to 200')
      .optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  })
  .passthrough()

const formSchemaInputSchema = z.object({
  fields: z.array(formFieldInputSchema).max(200, 'Formularz może mieć maksymalnie 200 pól'),
})

const formTitleSchema = z
  .string()
  .trim()
  .min(1, 'Podaj tytuł formularza')
  .max(200, 'Tytuł może mieć maksymalnie 200 znaków')

const formDescriptionSchema = z
  .string()
  .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
  .optional()

const createFormInputSchema = z.object({
  title: formTitleSchema,
  description: formDescriptionSchema,
  schema: formSchemaInputSchema,
})

const updateFormInputSchema = z.object({
  id: z.string().min(1, 'Brak identyfikatora formularza'),
  title: formTitleSchema.optional(),
  description: formDescriptionSchema,
  schema: formSchemaInputSchema.optional(),
  is_active: z.boolean().optional(),
})

function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback
}

export const createFormFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { title: string; description?: string; schema: FormSchema }) => d)
  .handler(async ({ data }) => {
    const parsed = createFormInputSchema.safeParse(data)
    if (!parsed.success) {
      return { error: firstIssueMessage(parsed.error, 'Nieprawidłowe dane formularza') }
    }

    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (!caller.isOwner) return { error: 'Brak uprawnień' }
    const { salonId } = caller

    const { data: form, error } = await supabase
      .from('forms')
      .insert({
        salon_id: salonId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        schema: parsed.data.schema,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { form }
  })

export const updateFormFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      title?: string
      description?: string
      schema?: FormSchema
      is_active?: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    const parsed = updateFormInputSchema.safeParse(data)
    if (!parsed.success) {
      return { error: firstIssueMessage(parsed.error, 'Nieprawidłowe dane formularza') }
    }

    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }

    const updates: {
      title?: string
      description?: string | null
      schema?: FormSchema
      is_active?: boolean
    } = {}
    if (parsed.data.title !== undefined) updates.title = parsed.data.title
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.schema !== undefined) updates.schema = parsed.data.schema
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active

    if (Object.keys(updates).length === 0) {
      return { error: 'Brak zmian do zapisania' }
    }

    const { data: form, error } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', parsed.data.id)
      .eq('salon_id', caller.salonId)
      .select()
      .single()
    if (error) return { error: error.message }
    return { form }
  })

export const deleteFormFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

export const toggleFormActiveFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase
      .from('forms')
      .update({ is_active: data.is_active })
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

export const getFormsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const caller = await getCallerSalonId(supabase)
  if (!caller) return { forms: [] }
  const { data: forms } = await supabase
    .from('forms')
    .select('*')
    .eq('salon_id', caller.salonId)
    .order('created_at', { ascending: false })
  return { forms: forms || [] }
})

export const getFormFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (error || !form) return { error: 'Formularz nie istnieje' }
    return { form }
  })

// Legacy aliases
export const toggleFormActive = (id: string, is_active: boolean) =>
  toggleFormActiveFn({ data: { id, is_active } })
export const deleteForm = (id: string) => deleteFormFn({ data: { id } })
export const updateForm = (
  id: string,
  updates: { title?: string; description?: string; schema?: FormSchema; is_active?: boolean },
) => updateFormFn({ data: { id, ...updates } })
export const createForm = (data: { title: string; description?: string; schema: FormSchema }) =>
  createFormFn({ data })
