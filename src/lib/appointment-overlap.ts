export type TimeInput = Date | string | number

export interface AppointmentLike {
  id: string
  start_time: string
  duration_minutes: number
  staff_id: string | null
}

export interface ConflictCandidate {
  start: TimeInput
  end: TimeInput
  staffId: string | null
}

export interface StaffLike {
  id: string
  name: string
}

export interface StaffGroup<T> {
  staffId: string | null
  staffName: string
  appointments: T[]
}

export const UNASSIGNED_STAFF_LABEL = 'Nieprzypisane'

function toMillis(value: TimeInput): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  return new Date(value).getTime()
}

export function intervalsOverlap(
  startA: TimeInput,
  endA: TimeInput,
  startB: TimeInput,
  endB: TimeInput,
): boolean {
  const aStart = toMillis(startA)
  const aEnd = toMillis(endA)
  const bStart = toMillis(startB)
  const bEnd = toMillis(endB)
  return aStart < bEnd && aEnd > bStart
}

export function staffConflict(
  existingStaffId: string | null | undefined,
  candidateStaffId: string | null | undefined,
): boolean {
  if (existingStaffId == null || candidateStaffId == null) return true
  return existingStaffId === candidateStaffId
}

export function findConflicts(params: {
  candidate: ConflictCandidate
  appointments: AppointmentLike[]
  excludeId?: string
}): string[] {
  const { candidate, appointments, excludeId } = params
  return appointments
    .filter((appointment) => {
      if (excludeId && appointment.id === excludeId) return false
      if (!staffConflict(appointment.staff_id, candidate.staffId)) return false
      const appointmentStart = new Date(appointment.start_time)
      const appointmentEnd = new Date(
        appointmentStart.getTime() + appointment.duration_minutes * 60_000,
      )
      return intervalsOverlap(candidate.start, candidate.end, appointmentStart, appointmentEnd)
    })
    .map((appointment) => appointment.id)
}

export function groupAppointmentsByStaff<T extends { staff_id: string | null }>(
  appointments: T[],
  staff: StaffLike[],
  options: { includeUnassigned?: boolean } = {},
): StaffGroup<T>[] {
  const { includeUnassigned = true } = options
  const buckets = new Map<string, T[]>()
  for (const member of staff) buckets.set(member.id, [])

  const unassigned: T[] = []
  for (const appointment of appointments) {
    const bucket = appointment.staff_id != null ? buckets.get(appointment.staff_id) : undefined
    if (bucket) bucket.push(appointment)
    else unassigned.push(appointment)
  }

  const groups: StaffGroup<T>[] = staff.map((member) => ({
    staffId: member.id,
    staffName: member.name,
    appointments: buckets.get(member.id) ?? [],
  }))

  if (includeUnassigned) {
    groups.push({
      staffId: null,
      staffName: UNASSIGNED_STAFF_LABEL,
      appointments: unassigned,
    })
  }

  return groups
}
