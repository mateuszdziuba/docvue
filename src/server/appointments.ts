import { createServerFn } from '@tanstack/react-start'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { consumeRateLimit, rateLimitError } from '@/lib/rate-limit'
import { generateSecureToken } from '@/lib/secure-token'
import { createAdminClient } from '../../lib/supabase/admin'
import {
  type AppointmentLike,
  findConflicts,
  intervalsOverlap,
  staffConflict,
} from '../lib/appointment-overlap'
import { getSupabaseServerClient } from '../utils/supabase'
import { getVerifiedUser } from './_auth'
import { getCallerSalonId } from './_salon-resolver'

interface StaffNameRow {
  name: string | null
}

type AppointmentConflictRow = AppointmentLike & {
  staff_members?: StaffNameRow | StaffNameRow[] | null
}

function staffNameOf(row: AppointmentConflictRow): string | null {
  const staff = row.staff_members
  if (!staff) return null
  const entry = Array.isArray(staff) ? staff[0] : staff
  return entry?.name ?? null
}

function conflictErrorMessage(params: {
  rows: AppointmentConflictRow[]
  conflictingIds: string[]
  candidateStaffId: string | null
  candidateStaffName: string | null
}): string {
  const { rows, conflictingIds, candidateStaffId, candidateStaffName } = params
  const conflicting = rows.filter((row) => conflictingIds.includes(row.id))
  const otherNames = [
    ...new Set(
      conflicting.map((row) => staffNameOf(row)).filter((name): name is string => Boolean(name)),
    ),
  ]

  if (candidateStaffId == null) {
    return otherNames.length > 0
      ? `Wybrany termin jest już zajęty (${otherNames.join(', ')}). Wybierz inny.`
      : 'Wybrany termin jest już zajęty. Wybierz inny.'
  }

  if (conflicting.some((row) => row.staff_id == null)) {
    return 'Wybrany termin koliduje z nieprzypisaną wizytą, która blokuje cały gabinet. Wybierz inny.'
  }

  return `Pracownik ${candidateStaffName ?? ''} ma już wizytę w tym czasie. Wybierz inny termin.`.trim()
}

function generateToken(length = 32): string {
  return generateSecureToken(length)
}

export interface CalendarAppointment {
  id: string
  salon_id: string
  client_id: string
  treatment_id: string
  start_time: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending_forms'
  notes: string | null
  staff_id: string | null
  staff_member: { id: string; name: string } | null
  client: { id: string; name: string; phone: string | null }
  treatment: { id: string; name: string; duration_minutes: number; price: number | null }
}

async function getSalonId(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const caller = await getCallerSalonId(supabase)
  return caller?.salonId ?? null
}

export const getCalendarAppointmentsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { salonId: string; from: string; to: string }) => d)
  .handler(
    async ({ data }): Promise<{ appointments: CalendarAppointment[]; error: string | null }> => {
      const supabase = getSupabaseServerClient()
      const { data: rows, error } = await supabase
        .from('appointments')
        .select(`
        id, salon_id, client_id, treatment_id, start_time, duration_minutes, status, notes, staff_id,
        clients (id, name, phone),
        treatments (id, name, duration_minutes, price),
        staff_members (id, name)
      `)
        .eq('salon_id', data.salonId)
        .gte('start_time', data.from)
        .lt('start_time', data.to)
        .order('start_time', { ascending: true })

      if (error) return { appointments: [], error: error.message }
      if (!rows) return { appointments: [], error: null }

      const appointments = rows.map((apt) => {
        const treatment = apt.treatments as unknown as {
          id: string
          name: string
          duration_minutes: number
          price: number | null
        } | null
        const customDuration = (apt as Record<string, unknown>).duration_minutes as
          | number
          | undefined
          | null
        return {
          id: apt.id,
          salon_id: apt.salon_id,
          client_id: apt.client_id,
          treatment_id: apt.treatment_id,
          start_time: apt.start_time,
          duration_minutes: customDuration ?? treatment?.duration_minutes ?? 60,
          status: apt.status as CalendarAppointment['status'],
          notes: apt.notes,
          staff_id: ((apt as Record<string, unknown>).staff_id as string | null) ?? null,
          staff_member:
            ((apt as Record<string, unknown>).staff_members as {
              id: string
              name: string
            } | null) ?? null,
          client: apt.clients as unknown as { id: string; name: string; phone: string | null },
          treatment: treatment ?? {
            id: '',
            name: 'Brak zabiegu',
            duration_minutes: 60,
            price: null,
          },
        }
      })

      return { appointments, error: null }
    },
  )

export const createAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      clientId: string
      treatmentId: string
      startTime: string
      durationMinutes?: number
      notes?: string
      staffId?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const salonId = caller.salonId

    const [{ data: clientRow }, { data: treatmentRow }] = await Promise.all([
      supabase
        .from('clients')
        .select('id')
        .eq('id', data.clientId)
        .or(`salon_id.eq.${salonId},salon_id.is.null`)
        .maybeSingle(),
      supabase
        .from('treatments')
        .select('id')
        .eq('id', data.treatmentId)
        .eq('salon_id', salonId)
        .maybeSingle(),
    ])
    if (!clientRow) return { error: 'Nie znaleziono klienta' }
    if (!treatmentRow) return { error: 'Nie znaleziono zabiegu' }

    const startTime = new Date(data.startTime)
    const duration = data.durationMinutes || 60
    const endTime = new Date(startTime.getTime() + duration * 60000)

    let staffName: string | null = null
    if (data.staffId) {
      const { data: staffRow } = await supabase
        .from('staff_members')
        .select('id, name')
        .eq('id', data.staffId)
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .maybeSingle()
      if (!staffRow) return { error: 'Wybrany pracownik nie należy do tego gabinetu' }
      staffName = staffRow.name
    }

    const dayStart = new Date(startTime)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(startTime)
    dayEnd.setHours(23, 59, 59, 999)

    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('id, start_time, duration_minutes, staff_id, staff_members (name)')
      .eq('salon_id', salonId)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .neq('status', 'cancelled')

    const rows = (existingAppts ?? []) as unknown as AppointmentConflictRow[]
    const conflictingIds = findConflicts({
      candidate: { start: startTime, end: endTime, staffId: data.staffId ?? null },
      appointments: rows,
    })

    if (conflictingIds.length > 0) {
      return {
        error: conflictErrorMessage({
          rows,
          conflictingIds,
          candidateStaffId: data.staffId ?? null,
          candidateStaffName: staffName,
        }),
      }
    }

    // Check for overlapping time blocks (blokady per pracownik lub całego salonu)
    const { data: timeBlockOverlap } = await supabase
      .from('time_blocks')
      .select('id, staff_id')
      .eq('salon_id', salonId)
      .lt('start_time', endTime.toISOString())
      .gt('end_time', startTime.toISOString())

    const blockedByTimeBlock = (timeBlockOverlap ?? []).some((block) =>
      staffConflict(block.staff_id as string | null, data.staffId ?? null),
    )

    if (blockedByTimeBlock) {
      return { error: 'Wybrany termin jest zablokowany. Wybierz inny.' }
    }

    const { data: requiredForms } = await supabase
      .from('treatment_forms')
      .select('form_id')
      .eq('treatment_id', data.treatmentId)
    const requiredFormIds = requiredForms?.map((r) => r.form_id) ?? []
    let status: 'scheduled' | 'pending_forms' = 'scheduled'

    if (requiredFormIds.length > 0) {
      const { data: clientSubmissions } = await supabase
        .from('submissions')
        .select('form_id')
        .eq('client_id', data.clientId)
        .in('form_id', requiredFormIds)
      const submittedSet = new Set(clientSubmissions?.map((s) => s.form_id) ?? [])
      if (!requiredFormIds.every((id) => submittedSet.has(id))) status = 'pending_forms'
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        salon_id: salonId,
        client_id: data.clientId,
        treatment_id: data.treatmentId,
        start_time: data.startTime,
        duration_minutes: data.durationMinutes,
        notes: data.notes || null,
        staff_id: data.staffId || null,
        status,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { appointment }
  })

const UPDATABLE_APPOINTMENT_FIELDS = [
  'status',
  'notes',
  'before_photo_path',
  'after_photo_path',
  'start_time',
  'duration_minutes',
  'staff_id',
] as const

const APPOINTMENT_STATUSES = ['scheduled', 'pending_forms', 'completed', 'cancelled'] as const

export const updateAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      id: string
      status?: string
      notes?: string | null
      before_photo_path?: string | null
      after_photo_path?: string | null
      start_time?: string
      duration_minutes?: number
      staff_id?: string | null
    }) => d,
  )
  .handler(async ({ data: { id, ...updates } }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Brak uprawnień' }

    const { data: current } = await supabase
      .from('appointments')
      .select('id, salon_id, start_time, duration_minutes, staff_id')
      .eq('id', id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()

    if (!current) return { error: 'Nie znaleziono wizyty' }

    const allowed: Record<string, unknown> = {}
    for (const field of UPDATABLE_APPOINTMENT_FIELDS) {
      if (field in updates) allowed[field] = updates[field]
    }

    if (
      allowed.status != null &&
      !APPOINTMENT_STATUSES.includes(
        String(allowed.status) as (typeof APPOINTMENT_STATUSES)[number],
      )
    ) {
      return { error: 'Nieprawidłowy status wizyty' }
    }

    // Nie pozwalamy oznaczyć wizyty jako „zaplanowana”, gdy brakuje wymaganych formularzy.
    if (allowed.status === 'scheduled') {
      const { data: formState } = await supabase
        .from('appointments')
        .select('treatments (treatment_forms (form_id)), submissions (form_id)')
        .eq('id', id)
        .maybeSingle()
      const requiredIds = (((formState as any)?.treatments?.treatment_forms ?? []) as any[])
        .map((tf) => tf.form_id)
        .filter((formId): formId is string => Boolean(formId))
      const submittedIds = new Set(
        (((formState as any)?.submissions ?? []) as any[]).map((submission) => submission.form_id),
      )
      if (requiredIds.some((formId) => !submittedIds.has(formId))) {
        allowed.status = 'pending_forms'
      }
    }

    const nextStart =
      allowed.start_time != null
        ? new Date(String(allowed.start_time))
        : new Date(current.start_time)
    const nextDuration =
      allowed.duration_minutes != null ? Number(allowed.duration_minutes) : current.duration_minutes
    const nextStaffId =
      'staff_id' in allowed ? ((allowed.staff_id as string | null) ?? null) : current.staff_id

    if (!Number.isFinite(nextStart.getTime())) return { error: 'Nieprawidłowa data wizyty' }
    if (!Number.isFinite(nextDuration) || nextDuration < 5) {
      return { error: 'Nieprawidłowy czas trwania wizyty' }
    }
    const nextEnd = new Date(nextStart.getTime() + nextDuration * 60000)

    let nextStaffName: string | null = null
    if (nextStaffId) {
      const { data: staffRow } = await supabase
        .from('staff_members')
        .select('id, name')
        .eq('id', nextStaffId)
        .eq('salon_id', caller.salonId)
        .eq('is_active', true)
        .maybeSingle()
      if (!staffRow) return { error: 'Wybrany pracownik nie należy do tego gabinetu' }
      nextStaffName = staffRow.name
    }

    const timingChanged =
      nextStart.getTime() !== new Date(current.start_time).getTime() ||
      nextDuration !== current.duration_minutes ||
      nextStaffId !== current.staff_id

    if (timingChanged) {
      const dayStart = new Date(nextStart)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(nextStart)
      dayEnd.setHours(23, 59, 59, 999)

      const { data: existingAppts } = await supabase
        .from('appointments')
        .select('id, start_time, duration_minutes, staff_id, staff_members (name)')
        .eq('salon_id', caller.salonId)
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString())
        .neq('status', 'cancelled')

      const rows = (existingAppts ?? []) as unknown as AppointmentConflictRow[]
      const conflictingIds = findConflicts({
        candidate: { start: nextStart, end: nextEnd, staffId: nextStaffId },
        appointments: rows,
        excludeId: id,
      })

      if (conflictingIds.length > 0) {
        return {
          error: conflictErrorMessage({
            rows,
            conflictingIds,
            candidateStaffId: nextStaffId,
            candidateStaffName: nextStaffName,
          }),
        }
      }

      const { data: blockOverlap } = await supabase
        .from('time_blocks')
        .select('id, staff_id')
        .eq('salon_id', caller.salonId)
        .lt('start_time', nextEnd.toISOString())
        .gt('end_time', nextStart.toISOString())

      const blockedByTimeBlock = (blockOverlap ?? []).some((block) =>
        staffConflict(block.staff_id as string | null, nextStaffId),
      )

      if (blockedByTimeBlock) {
        return { error: 'Wybrany termin jest zablokowany. Wybierz inny.' }
      }
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(allowed)
      .eq('id', id)
      .eq('salon_id', caller.salonId)
      .select()
      .single()
    if (error) return { error: error.message }
    return { appointment }
  })

const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const createVisitPhotoUploadFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; kind: 'before' | 'after'; contentType: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const extension = PHOTO_EXTENSIONS[data.contentType]
    if (!extension) return { error: 'Dozwolone formaty zdjęć: JPG, PNG lub WEBP' }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!appointment) return { error: 'Wizyta nie istnieje' }

    const path = `${caller.salonId}/${data.id}/${data.kind}-${Date.now()}.${extension}`
    const admin = await createAdminClient()
    const { data: signed, error } = await admin.storage
      .from('visit-photos')
      .createSignedUploadUrl(path)
    if (error || !signed) return { error: 'Nie udało się przygotować wysyłki zdjęcia' }
    return { path: signed.path, token: signed.token }
  })

export const setVisitPhotoFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; kind: 'before' | 'after'; path: string | null }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (data.path && data.path.split('/')[0] !== caller.salonId) {
      return { error: 'Nieprawidłowa ścieżka zdjęcia' }
    }

    const { data: existing } = await supabase
      .from('appointments')
      .select('before_photo_path, after_photo_path')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!existing) return { error: 'Wizyta nie istnieje' }

    const column = data.kind === 'before' ? 'before_photo_path' : 'after_photo_path'
    const { error } = await supabase
      .from('appointments')
      .update({ [column]: data.path })
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: 'Nie udało się zapisać zdjęcia' }

    const previous = data.kind === 'before' ? existing.before_photo_path : existing.after_photo_path
    if (previous && previous !== data.path) {
      const admin = await createAdminClient()
      await admin.storage.from('visit-photos').remove([previous])
    }
    return { success: true }
  })

export const getVisitPhotoUrlFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (data.path.split('/')[0] !== caller.salonId) return { error: 'Brak dostępu do zdjęcia' }

    const admin = await createAdminClient()
    const { data: signed, error } = await admin.storage
      .from('visit-photos')
      .createSignedUrl(data.path, 3600)
    if (error || !signed) return { error: 'Nie udało się pobrać zdjęcia' }
    return { url: signed.signedUrl }
  })

export const deleteAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

export const getAppointmentsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; status?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const salonId = await getSalonId(supabase)
    if (!salonId) return { appointments: [] }

    let q = supabase
      .from('appointments')
      .select('*, clients (id, name, phone), treatments (id, name, duration_minutes, price)')
      .eq('salon_id', salonId)
      .order('start_time', { ascending: false })

    if (data.status) q = q.eq('status', data.status)

    const { data: rows } = await q
    return { appointments: rows || [] }
  })

export const getAppointmentFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(
        '*, clients (id, name, phone, email, birth_date, notes), treatments (*, treatment_forms (form_id, forms (id, title))), submissions (*)',
      )
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (error || !appointment) return { error: 'Wizyta nie istnieje' }

    // Wymagane formularze zabiegu + status wypełnienia przez klienta.
    const treatmentForms = ((appointment.treatments as any)?.treatment_forms ?? []) as any[]
    const requiredFormIds = treatmentForms
      .map((tf) => tf.form_id ?? tf.forms?.id)
      .filter((formId): formId is string => Boolean(formId))
    const submittedFormIds = new Set(
      ((appointment.submissions as any[]) ?? []).map((submission) => submission.form_id),
    )

    let requiredForms: Array<{
      id: string
      title: string
      token: string | null
      submitted: boolean
    }> = []

    if (requiredFormIds.length > 0) {
      const { data: clientForms } = await supabase
        .from('client_forms')
        .select('form_id, token')
        .eq('client_id', appointment.client_id)
        .in('form_id', requiredFormIds)
      const tokenByForm = new Map(
        ((clientForms as any[]) ?? []).map((clientForm) => [clientForm.form_id, clientForm.token]),
      )
      requiredForms = treatmentForms
        .map((tf) => {
          const formId = tf.form_id ?? tf.forms?.id
          if (!formId) return null
          return {
            id: formId as string,
            title: (tf.forms?.title as string | undefined) ?? 'Formularz',
            token: (tokenByForm.get(formId) as string | undefined) ?? null,
            submitted: submittedFormIds.has(formId),
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    }

    // Status wizyty pilnuje wymaganych formularzy: brak = „czeka na formularz”.
    const hasPendingForms = requiredForms.some((form) => !form.submitted)
    if (hasPendingForms && appointment.status === 'scheduled') {
      await supabase
        .from('appointments')
        .update({ status: 'pending_forms' })
        .eq('id', appointment.id)
      appointment.status = 'pending_forms'
    } else if (
      !hasPendingForms &&
      requiredForms.length > 0 &&
      appointment.status === 'pending_forms'
    ) {
      await supabase.from('appointments').update({ status: 'scheduled' }).eq('id', appointment.id)
      appointment.status = 'scheduled'
    }

    return { appointment, requiredForms }
  })

// Legacy function aliases for component compatibility
export const getCalendarAppointments = async (
  salonId: string,
  from: Date | string,
  to: Date | string,
) => {
  const result = await getCalendarAppointmentsFn({
    data: {
      salonId,
      from: from instanceof Date ? from.toISOString() : from,
      to: to instanceof Date ? to.toISOString() : to,
    },
  })
  if (result.error) throw new Error(result.error)
  return result.appointments
}

export const updateAppointmentTiming = async (
  id: string,
  startTime?: string,
  durationMinutes?: number,
  staffId?: string | null,
) => {
  return updateAppointmentFn({
    data: {
      id,
      start_time: startTime,
      duration_minutes: durationMinutes,
      ...(staffId !== undefined ? { staff_id: staffId } : {}),
    },
  })
}

export const updateCalendarAppointmentStatus = async (id: string, status: string) => {
  return updateAppointmentFn({ data: { id, status } })
}
export const deleteCalendarAppointment = (id: string) => deleteAppointmentFn({ data: { id } })
export const createCalendarAppointment = (data: {
  clientId: string
  treatmentId: string
  startTime: string
  durationMinutes?: number
  notes?: string
  staffId?: string
  salonId?: string
}) => {
  const { salonId: _salonId, ...appointmentData } = data
  return createAppointmentFn({ data: appointmentData })
}

// Client-facing booking — uses auth context to find client
export const bookAsClientFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { treatmentId: string; startTime: string; salonId?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const user = await getVerifiedUser(supabase)
    if (!user) return { error: 'Musisz być zalogowany' }

    const { data: client } = await supabase
      .from('clients')
      .select('id, salon_id')
      .eq('user_id', user.id)
      .single()

    if (!client) return { error: 'Nie znaleziono profilu klienta' }

    const limit = consumeRateLimit(`book:${user.id}`, 8, 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const admin = await createAdminClient()

    // Klient przypisany do salonu może rezerwować wyłącznie w swoim salonie;
    // klient bez przypisania wybiera salon jednorazowo (potem następuje auto-przypisanie).
    if (client.salon_id && data.salonId && data.salonId !== client.salon_id) {
      return { error: 'Możesz rezerwować wizyty wyłącznie w swoim gabinecie.' }
    }

    const targetSalonId = client.salon_id ?? data.salonId
    if (!targetSalonId)
      return { error: 'Nie określono gabinetu. Wybierz gabinet przed rezerwacją.' }

    const treatment = await admin
      .from('treatments')
      .select('duration_minutes, salon_id')
      .eq('id', data.treatmentId)
      .eq('salon_id', targetSalonId)
      .maybeSingle()

    if (!treatment.data) {
      return { error: 'Nie znaleziono zabiegu w wybranym gabinecie.' }
    }

    const durationMinutes = treatment.data.duration_minutes || 60

    // Check overlap
    const startTime = new Date(data.startTime)
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000)

    const dayStart = new Date(startTime)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(startTime)
    dayEnd.setHours(23, 59, 59, 999)

    if (new Date(data.startTime).getTime() <= Date.now()) {
      return {
        error:
          'Nie można umówić wizyty w przeszłości. Sprawdź dostępne terminy narzędziem findAvailableSlots.',
      }
    }

    const { data: blocks } = await admin
      .from('time_blocks')
      .select('start_time, end_time')
      .eq('salon_id', targetSalonId)
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString())

    const hasBlockOverlap = (blocks || []).some((block) =>
      intervalsOverlap(startTime, endTime, block.start_time, block.end_time),
    )

    if (hasBlockOverlap) {
      return {
        error:
          'Ten termin jest niedostępny. Sprawdź dostępne terminy narzędziem findAvailableSlots.',
      }
    }

    const { data: existing } = await admin
      .from('appointments')
      .select('id, start_time, duration_minutes, staff_id')
      .eq('salon_id', targetSalonId)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .neq('status', 'cancelled')

    const conflictingIds = findConflicts({
      candidate: { start: startTime, end: endTime, staffId: null },
      appointments: (existing ?? []) as AppointmentLike[],
    })

    if (conflictingIds.length > 0) return { error: 'Termin jest już zajęty.' }

    // Check required forms
    const { data: requiredForms } = await admin
      .from('treatment_forms')
      .select('form_id')
      .eq('treatment_id', data.treatmentId)

    const requiredFormIds = requiredForms?.map((r) => r.form_id) ?? []
    let status: 'scheduled' | 'pending_forms' = 'scheduled'
    const submittedSet = new Set<string>()

    if (requiredFormIds.length > 0) {
      const { data: clientSubmissions } = await admin
        .from('submissions')
        .select('form_id')
        .eq('client_id', client.id)
        .in('form_id', requiredFormIds)
      for (const s of clientSubmissions ?? []) submittedSet.add(s.form_id)
      if (!requiredFormIds.every((id) => submittedSet.has(id))) status = 'pending_forms'
    }

    const { data: appointment, error } = await admin
      .from('appointments')
      .insert({
        salon_id: targetSalonId,
        client_id: client.id,
        treatment_id: data.treatmentId,
        start_time: data.startTime,
        duration_minutes: durationMinutes,
        status,
      })
      .select('*, treatments (name, duration_minutes, price)')
      .single()

    if (error) {
      console.error('Booking insert error:', error.message)
      return { error: 'Nie udało się zarezerwować terminu. Spróbuj ponownie.' }
    }

    const { data: racedAppointments, error: raceQueryError } = await admin
      .from('appointments')
      .select('id, created_at, start_time, duration_minutes')
      .eq('salon_id', targetSalonId)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .neq('status', 'cancelled')

    if (!raceQueryError && racedAppointments) {
      const overlapping = racedAppointments.filter((apt) => {
        const aptStart = new Date(apt.start_time)
        const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000)
        return intervalsOverlap(startTime, endTime, aptStart, aptEnd)
      })

      if (overlapping.length > 1) {
        overlapping.sort((a, b) => {
          const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          if (diff !== 0) return diff
          return a.id < b.id ? -1 : 1
        })
        const keeper = overlapping[0]
        const losers = overlapping.slice(1)
        const { error: dedupError } = await admin
          .from('appointments')
          .delete()
          .in(
            'id',
            losers.map((l) => l.id),
          )
        if (dedupError) console.error('Appointment dedup delete error:', dedupError.message)
        if (keeper.id !== appointment.id) return { error: 'Termin jest już zajęty.' }
      }
    }

    const { data: survivingAppointment } = await admin
      .from('appointments')
      .select('id')
      .eq('id', appointment.id)
      .maybeSingle()

    if (!survivingAppointment) return { error: 'Termin jest już zajęty.' }

    // Auto-assign client to salon after first booking (if not already assigned)
    if (!client.salon_id && targetSalonId) {
      await admin.from('clients').update({ salon_id: targetSalonId }).eq('id', client.id)
    }

    // Ensure a pending client_forms assignment exists for every unfilled required form
    const requiredFormsWithTokens: Array<{
      id: string
      title: string
      token: string
      fillUrl: string
      filled: boolean
    }> = []

    if (status === 'pending_forms') {
      const unfilledIds = requiredFormIds.filter((id) => !submittedSet.has(id))

      const { data: pendingAssignments } = await admin
        .from('client_forms')
        .select('form_id, token')
        .eq('client_id', client.id)
        .in('form_id', unfilledIds)
        .eq('status', 'pending')

      const pendingMap = new Map(
        (pendingAssignments ?? []).map((cf) => [cf.form_id, cf.token as string]),
      )
      const assignments: Array<{ form_id: string; token: string }> = []

      for (const formId of unfilledIds) {
        const existingToken = pendingMap.get(formId)
        if (existingToken) {
          assignments.push({ form_id: formId, token: existingToken })
          continue
        }

        const token = generateToken()
        const { error: assignError } = await admin.from('client_forms').insert({
          salon_id: targetSalonId,
          client_id: client.id,
          form_id: formId,
          token,
          status: 'pending',
          filled_by: 'client',
        })

        if (!assignError) assignments.push({ form_id: formId, token })
      }

      if (assignments.length > 0) {
        const { data: forms } = await admin
          .from('forms')
          .select('id, title')
          .in(
            'id',
            assignments.map((a) => a.form_id),
          )
        const titleMap = new Map((forms ?? []).map((f) => [f.id, f.title]))
        requiredFormsWithTokens.push(
          ...assignments.map((a) => ({
            id: a.form_id,
            title: titleMap.get(a.form_id) ?? '',
            token: a.token,
            fillUrl: `/f/${a.token}`,
            filled: false,
          })),
        )
      }

      // Deduplicate client_forms — keep one pending row per (client_id, form_id)
      const { data: pendingForms, error: pendingFormsError } = await admin
        .from('client_forms')
        .select('id, form_id, token, created_at')
        .eq('client_id', client.id)
        .in('form_id', unfilledIds)
        .eq('status', 'pending')

      if (!pendingFormsError && pendingForms) {
        const formIds = [...new Set(pendingForms.map((r) => r.form_id))]
        const keptTokens = new Map<string, string>()
        const duplicateIds: string[] = []
        for (const formId of formIds) {
          const rows = pendingForms
            .filter((r) => r.form_id === formId)
            .sort((a, b) => {
              const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              if (diff !== 0) return diff
              return a.id < b.id ? -1 : 1
            })
          keptTokens.set(formId, rows[0].token as string)
          duplicateIds.push(...rows.slice(1).map((r) => r.id))
        }

        if (duplicateIds.length > 0) {
          const { error: dedupError } = await admin
            .from('client_forms')
            .delete()
            .in('id', duplicateIds)
          if (dedupError) console.error('Client forms dedup delete error:', dedupError.message)
        }

        const keptFormIds = [...keptTokens.keys()]
        requiredFormsWithTokens.length = 0
        if (keptFormIds.length > 0) {
          const { data: keptForms } = await admin
            .from('forms')
            .select('id, title')
            .in('id', keptFormIds)
          const keptTitleMap = new Map((keptForms ?? []).map((f) => [f.id, f.title]))
          requiredFormsWithTokens.push(
            ...keptFormIds.map((formId) => ({
              id: formId,
              title: keptTitleMap.get(formId) ?? '',
              token: keptTokens.get(formId) ?? '',
              fillUrl: `/f/${keptTokens.get(formId) ?? ''}`,
              filled: false,
            })),
          )
        }
      }
    }

    const start = new Date(data.startTime)
    const dateLabel = format(start, 'EEEE, d MMMM yyyy', { locale: pl })
    const timeLabel = format(start, 'HH:mm')
    const treatmentRow = appointment.treatments as unknown as { name: string } | null
    const content =
      `Wizyta została umówiona na ${treatmentRow?.name ?? ''} — ${dateLabel}, godz. ${timeLabel}.` +
      (status === 'pending_forms'
        ? ' Do pełnego potwierdzenia wizyty wymagane jest wypełnienie formularzy.'
        : '')

    const { error: messageError } = await admin.from('chat_messages').insert({
      salon_id: targetSalonId,
      client_id: client.id,
      role: 'assistant',
      content,
      tool_calls: [
        {
          name: 'bookingResult',
          result: { status, forms: requiredFormsWithTokens },
        },
      ],
    })
    if (messageError) {
      console.error('Save booking confirmation message error:', messageError.message)
    }

    return { appointment, status, requiredForms: requiredFormsWithTokens }
  })
