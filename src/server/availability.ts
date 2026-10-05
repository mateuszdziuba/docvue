import { createServerFn } from '@tanstack/react-start'
import { intervalsOverlap } from '../lib/appointment-overlap'
import { getSupabaseServerClient } from '../utils/supabase'

export interface AvailableSlot {
  start: string
  end: string
}

interface Appointment {
  start_time: string
  duration_minutes: number
}

interface TimeBlock {
  start_time: string
  end_time: string
}

const WORK_START_HOUR = 8
const WORK_END_HOUR = 18
const SLOT_INTERVAL_MINUTES = 15

export function findAvailableSlots(params: {
  appointments: Appointment[]
  timeBlocks: TimeBlock[]
  date: string
  durationMinutes: number
}): AvailableSlot[] {
  const { appointments, timeBlocks, date, durationMinutes } = params

  const slots: AvailableSlot[] = []
  const dayStart = new Date(`${date}T${String(WORK_START_HOUR).padStart(2, '0')}:00:00`)
  const dayEnd = new Date(`${date}T${String(WORK_END_HOUR).padStart(2, '0')}:00:00`)

  const occupiedIntervals: Array<{ start: Date; end: Date }> = []

  for (const apt of appointments) {
    const start = new Date(apt.start_time)
    const end = new Date(start.getTime() + apt.duration_minutes * 60000)
    occupiedIntervals.push({ start, end })
  }

  for (const block of timeBlocks) {
    const start = new Date(block.start_time)
    const end = new Date(block.end_time)
    occupiedIntervals.push({ start, end })
  }

  let currentSlotStart = new Date(dayStart)

  while (currentSlotStart.getTime() + durationMinutes * 60000 <= dayEnd.getTime()) {
    const slotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60000)
    let isFree = true

    for (const occ of occupiedIntervals) {
      if (intervalsOverlap(currentSlotStart, slotEnd, occ.start, occ.end)) {
        isFree = false
        break
      }
    }

    if (isFree) {
      slots.push({
        start: currentSlotStart.toISOString(),
        end: slotEnd.toISOString(),
      })
    }

    currentSlotStart = new Date(currentSlotStart.getTime() + SLOT_INTERVAL_MINUTES * 60000)
  }

  return slots
}

export const findAvailableSlotsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { salonId: string; date: string; durationMinutes: number; treatmentId?: string }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let salonId = data.salonId
    if (!salonId && user) {
      // Try to find salon from client context
      const { data: client } = await supabase
        .from('clients')
        .select('salon_id')
        .eq('user_id', user.id)
        .single()
      if (client) salonId = client.salon_id
    }

    if (!salonId) return { slots: [] }

    const dayStart = `${data.date}T00:00:00`
    const dayEnd = `${data.date}T23:59:59`

    const [aptResult, blockResult] = await Promise.all([
      supabase
        .from('appointments')
        .select('start_time, duration_minutes')
        .eq('salon_id', salonId)
        .gte('start_time', dayStart)
        .lt('start_time', dayEnd)
        .neq('status', 'cancelled'),
      supabase
        .from('time_blocks')
        .select('start_time, end_time')
        .eq('salon_id', salonId)
        .lt('start_time', dayEnd)
        .gt('end_time', dayStart),
    ])

    const slots = findAvailableSlots({
      appointments: (aptResult.data || []) as Appointment[],
      timeBlocks: (blockResult.data || []) as TimeBlock[],
      date: data.date,
      durationMinutes: data.durationMinutes,
    })

    return { slots }
  })
