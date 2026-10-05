import { describe, expect, it } from 'vitest'
import { diffProducts } from '../src/lib/beauty-plan-diff'

const existing = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('diffProducts', () => {
  it('marks products with matching ids as updates', () => {
    const result = diffProducts(existing, [
      { id: 'a', timeOfDay: 'morning', name: 'Krem' },
      { id: 'c', timeOfDay: 'evening', name: 'Serum' },
    ])

    expect(result.toUpdate).toEqual([
      { id: 'a', product: { id: 'a', timeOfDay: 'morning', name: 'Krem' } },
      { id: 'c', product: { id: 'c', timeOfDay: 'evening', name: 'Serum' } },
    ])
    expect(result.toInsert).toEqual([])
    expect(result.toDeleteIds).toEqual(['b'])
  })

  it('inserts products without ids', () => {
    const result = diffProducts(existing, [
      { id: 'a', timeOfDay: 'morning', name: 'Krem' },
      { timeOfDay: 'morning', name: 'Tonik' },
      { timeOfDay: 'evening', name: 'Olejek' },
    ])

    expect(result.toUpdate).toHaveLength(1)
    expect(result.toInsert).toEqual([
      {
        timeOfDay: 'morning',
        name: 'Tonik',
        url: undefined,
        imageUrl: undefined,
        price: undefined,
        usageDescription: undefined,
      },
      {
        timeOfDay: 'evening',
        name: 'Olejek',
        url: undefined,
        imageUrl: undefined,
        price: undefined,
        usageDescription: undefined,
      },
    ])
    expect(result.toDeleteIds).toEqual(['b', 'c'])
  })

  it('deletes all existing products when incoming is empty', () => {
    const result = diffProducts(existing, [])

    expect(result.toUpdate).toEqual([])
    expect(result.toInsert).toEqual([])
    expect(result.toDeleteIds).toEqual(['a', 'b', 'c'])
  })

  it('inserts all products when there are no existing ones', () => {
    const result = diffProducts([], [{ timeOfDay: 'evening', name: 'Krem' }])

    expect(result.toUpdate).toEqual([])
    expect(result.toInsert).toEqual([
      {
        timeOfDay: 'evening',
        name: 'Krem',
        url: undefined,
        imageUrl: undefined,
        price: undefined,
        usageDescription: undefined,
      },
    ])
    expect(result.toDeleteIds).toEqual([])
  })

  it('does not delete or update anything when incoming matches existing', () => {
    const result = diffProducts(existing, [
      { id: 'a', timeOfDay: 'morning', name: 'A' },
      { id: 'b', timeOfDay: 'morning', name: 'B' },
      { id: 'c', timeOfDay: 'evening', name: 'C' },
    ])

    expect(result.toUpdate).toHaveLength(3)
    expect(result.toInsert).toEqual([])
    expect(result.toDeleteIds).toEqual([])
  })

  it('treats unknown ids as inserts and strips the stale id', () => {
    const result = diffProducts(existing, [{ id: 'unknown', timeOfDay: 'morning', name: 'Nowy' }])

    expect(result.toUpdate).toEqual([])
    expect(result.toInsert).toEqual([
      {
        timeOfDay: 'morning',
        name: 'Nowy',
        url: undefined,
        imageUrl: undefined,
        price: undefined,
        usageDescription: undefined,
      },
    ])
    expect(result.toDeleteIds).toEqual(['a', 'b', 'c'])
  })

  it('updates a duplicated id only once and inserts the duplicate', () => {
    const result = diffProducts(
      [{ id: 'a' }],
      [
        { id: 'a', timeOfDay: 'morning', name: 'Pierwszy' },
        { id: 'a', timeOfDay: 'evening', name: 'Drugi' },
      ],
    )

    expect(result.toUpdate).toEqual([
      { id: 'a', product: { id: 'a', timeOfDay: 'morning', name: 'Pierwszy' } },
    ])
    expect(result.toInsert).toEqual([
      {
        timeOfDay: 'evening',
        name: 'Drugi',
        url: undefined,
        imageUrl: undefined,
        price: undefined,
        usageDescription: undefined,
      },
    ])
    expect(result.toDeleteIds).toEqual([])
  })
})
