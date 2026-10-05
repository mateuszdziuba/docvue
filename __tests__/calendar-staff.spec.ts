import { describe, expect, it } from 'vitest'
import {
  staffColor,
  staffInitials,
  UNASSIGNED_STAFF_COLOR,
} from '../components/admin/calendar/staff-colors'
import { groupAppointmentsByStaff } from '../src/lib/appointment-overlap'

describe('staffInitials', () => {
  it('returns first letters of the first two words', () => {
    expect(staffInitials('Anna Kowalska')).toBe('AK')
  })

  it('returns two letters for a single-word name', () => {
    expect(staffInitials('Beauty')).toBe('BE')
  })

  it('handles extra whitespace', () => {
    expect(staffInitials('  Marta   Nowak  ')).toBe('MN')
  })

  it('falls back to a question mark for empty names', () => {
    expect(staffInitials('')).toBe('?')
    expect(staffInitials(null)).toBe('?')
    expect(staffInitials(undefined)).toBe('?')
  })
})

describe('staffColor', () => {
  it('is deterministic for the same staff id', () => {
    const first = staffColor('staff-123')
    const second = staffColor('staff-123')
    expect(second).toEqual(first)
    expect(second.key).toBe(first.key)
  })

  it('returns the neutral color for unassigned appointments', () => {
    expect(staffColor(null)).toEqual(UNASSIGNED_STAFF_COLOR)
    expect(staffColor(undefined)).toEqual(UNASSIGNED_STAFF_COLOR)
  })

  it('exposes semantic container classes with readable text classes', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const color = staffColor(id)
      expect(color.containerClass).toMatch(/bg-/)
      expect(color.containerClass).toMatch(/text-/)
      expect(color.borderClass).toMatch(/border-/)
      expect(color.solidClass).toMatch(/bg-/)
    }
  })

  it('spreads different ids across the palette', () => {
    const keys = new Set(Array.from({ length: 40 }, (_, index) => staffColor(`staff-${index}`).key))
    expect(keys.size).toBeGreaterThan(3)
  })
})

describe('staff grid grouping scenarios', () => {
  const staff = [
    { id: 'staff-1', name: 'Anna Kowalska' },
    { id: 'staff-2', name: 'Marta Nowak' },
  ]

  it('keeps every staff column visible even when empty', () => {
    const groups = groupAppointmentsByStaff([], staff)
    expect(groups).toHaveLength(3)
    expect(groups.every((group) => group.appointments.length === 0)).toBe(true)
  })

  it('groups unknown staff into the unassigned column only once', () => {
    const appointments = [
      { id: 'a1', start_time: '2026-01-01T10:00:00', duration_minutes: 30, staff_id: 'ghost' },
      { id: 'a2', start_time: '2026-01-01T10:30:00', duration_minutes: 30, staff_id: 'ghost' },
    ]
    const groups = groupAppointmentsByStaff(appointments, staff)
    const unassignedGroups = groups.filter((group) => group.staffId === null)
    expect(unassignedGroups).toHaveLength(1)
    expect(unassignedGroups[0].appointments.map((a) => a.id)).toEqual(['a1', 'a2'])
  })
})
