import { describe, expect, it } from 'vitest'
import {
  type AppointmentLike,
  findConflicts,
  groupAppointmentsByStaff,
  intervalsOverlap,
  staffConflict,
} from '../src/lib/appointment-overlap'

const apt = (
  id: string,
  start: string,
  duration: number,
  staffId: string | null,
): AppointmentLike => ({
  id,
  start_time: start,
  duration_minutes: duration,
  staff_id: staffId,
})

describe('intervalsOverlap', () => {
  it('returns true when intervals overlap', () => {
    expect(
      intervalsOverlap(
        '2026-01-01T10:00:00',
        '2026-01-01T11:00:00',
        '2026-01-01T10:30:00',
        '2026-01-01T11:30:00',
      ),
    ).toBe(true)
  })

  it('returns true when one interval contains the other', () => {
    expect(
      intervalsOverlap(
        '2026-01-01T09:00:00',
        '2026-01-01T12:00:00',
        '2026-01-01T10:00:00',
        '2026-01-01T11:00:00',
      ),
    ).toBe(true)
  })

  it('returns false when intervals touch at the boundary', () => {
    expect(
      intervalsOverlap(
        '2026-01-01T10:00:00',
        '2026-01-01T11:00:00',
        '2026-01-01T11:00:00',
        '2026-01-01T12:00:00',
      ),
    ).toBe(false)
  })

  it('returns false when intervals are disjoint', () => {
    expect(
      intervalsOverlap(
        '2026-01-01T08:00:00',
        '2026-01-01T09:00:00',
        '2026-01-01T10:00:00',
        '2026-01-01T11:00:00',
      ),
    ).toBe(false)
  })

  it('accepts Date objects', () => {
    expect(
      intervalsOverlap(
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T11:00:00Z'),
        new Date('2026-01-01T10:59:00Z'),
        new Date('2026-01-01T12:00:00Z'),
      ),
    ).toBe(true)
  })
})

describe('staffConflict', () => {
  it('treats unassigned existing appointment as blocking everyone', () => {
    expect(staffConflict(null, 'staff-1')).toBe(true)
  })

  it('treats unassigned candidate as blocking everyone', () => {
    expect(staffConflict('staff-1', null)).toBe(true)
  })

  it('treats two unassigned appointments as conflicting', () => {
    expect(staffConflict(null, null)).toBe(true)
  })

  it('returns true for the same staff member', () => {
    expect(staffConflict('staff-1', 'staff-1')).toBe(true)
  })

  it('returns false for different staff members', () => {
    expect(staffConflict('staff-1', 'staff-2')).toBe(false)
  })
})

describe('findConflicts', () => {
  const appointments = [
    apt('a1', '2026-01-01T10:00:00', 60, 'staff-1'),
    apt('a2', '2026-01-01T10:30:00', 60, 'staff-2'),
    apt('a3', '2026-01-01T14:00:00', 60, null),
  ]

  it('finds overlapping appointments for the same staff', () => {
    const conflicts = findConflicts({
      candidate: {
        start: '2026-01-01T09:30:00',
        end: '2026-01-01T10:30:00',
        staffId: 'staff-1',
      },
      appointments,
    })
    expect(conflicts).toEqual(['a1'])
  })

  it('ignores overlaps of a different staff member', () => {
    const conflicts = findConflicts({
      candidate: {
        start: '2026-01-01T10:30:00',
        end: '2026-01-01T11:00:00',
        staffId: 'staff-1',
      },
      appointments: [appointments[1]],
    })
    expect(conflicts).toEqual([])
  })

  it('blocks a candidate without staff against any appointment', () => {
    const conflicts = findConflicts({
      candidate: {
        start: '2026-01-01T10:15:00',
        end: '2026-01-01T10:45:00',
        staffId: null,
      },
      appointments,
    })
    expect(conflicts).toEqual(['a1', 'a2'])
  })

  it('blocks any staff against an unassigned appointment', () => {
    const conflicts = findConflicts({
      candidate: {
        start: '2026-01-01T14:15:00',
        end: '2026-01-01T15:00:00',
        staffId: 'staff-1',
      },
      appointments,
    })
    expect(conflicts).toEqual(['a3'])
  })

  it('does not report the excluded appointment', () => {
    const conflicts = findConflicts({
      candidate: {
        start: '2026-01-01T10:00:00',
        end: '2026-01-01T11:00:00',
        staffId: 'staff-1',
      },
      appointments,
      excludeId: 'a1',
    })
    expect(conflicts).toEqual([])
  })

  it('uses duration_minutes to compute the appointment end', () => {
    const conflicts = findConflicts({
      candidate: {
        start: '2026-01-01T10:45:00',
        end: '2026-01-01T11:15:00',
        staffId: 'staff-1',
      },
      appointments: [apt('long', '2026-01-01T10:00:00', 90, 'staff-1')],
    })
    expect(conflicts).toEqual(['long'])
  })
})

describe('groupAppointmentsByStaff', () => {
  const staff = [
    { id: 'staff-1', name: 'Anna Kowalska' },
    { id: 'staff-2', name: 'Marta Nowak' },
  ]

  it('groups appointments per staff member in the given order', () => {
    const appointments = [
      apt('a1', '2026-01-01T10:00:00', 60, 'staff-2'),
      apt('a2', '2026-01-01T11:00:00', 60, 'staff-1'),
    ]
    const groups = groupAppointmentsByStaff(appointments, staff)
    expect(groups.map((group) => group.staffId)).toEqual(['staff-1', 'staff-2', null])
    expect(groups[0].appointments.map((a) => a.id)).toEqual(['a2'])
    expect(groups[1].appointments.map((a) => a.id)).toEqual(['a1'])
    expect(groups[2].appointments).toEqual([])
  })

  it('routes unknown staff ids into Nieprzypisane', () => {
    const groups = groupAppointmentsByStaff(
      [apt('a1', '2026-01-01T10:00:00', 60, 'unknown-staff')],
      staff,
    )
    const unassigned = groups.find((group) => group.staffId === null)
    expect(unassigned?.staffName).toBe('Nieprzypisane')
    expect(unassigned?.appointments.map((a) => a.id)).toEqual(['a1'])
    expect(groups[0].appointments).toEqual([])
    expect(groups[1].appointments).toEqual([])
  })

  it('routes null staff into Nieprzypisane', () => {
    const groups = groupAppointmentsByStaff([apt('a1', '2026-01-01T10:00:00', 60, null)], staff)
    expect(groups[2].appointments.map((a) => a.id)).toEqual(['a1'])
  })

  it('omits the unassigned column when disabled', () => {
    const groups = groupAppointmentsByStaff([], staff, { includeUnassigned: false })
    expect(groups).toHaveLength(2)
    expect(groups.some((group) => group.staffId === null)).toBe(false)
  })
})
