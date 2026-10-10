export type TimeOfDay = 'morning' | 'evening'

export type IncomingBeautyPlanProduct = {
  id?: string
  timeOfDay: TimeOfDay
  name: string
  url?: string | null
  imageUrl?: string | null
  price?: number | null
  usageDescription?: string | null
  availableInSalon?: boolean
  position?: number | null
  catalogProductId?: string | null
}

export type ProductsDiff = {
  toUpdate: Array<{ id: string; product: IncomingBeautyPlanProduct }>
  toInsert: IncomingBeautyPlanProduct[]
  toDeleteIds: string[]
}

function withoutId(product: IncomingBeautyPlanProduct): IncomingBeautyPlanProduct {
  return {
    timeOfDay: product.timeOfDay,
    name: product.name,
    url: product.url,
    imageUrl: product.imageUrl,
    price: product.price,
    usageDescription: product.usageDescription,
    availableInSalon: product.availableInSalon,
    position: product.position,
    catalogProductId: product.catalogProductId,
  }
}

export function diffProducts<T extends { id: string }>(
  existing: T[],
  incoming: IncomingBeautyPlanProduct[],
): ProductsDiff {
  const existingIds = new Set(existing.map((product) => product.id))
  const updatedIds = new Set<string>()
  const toUpdate: Array<{ id: string; product: IncomingBeautyPlanProduct }> = []
  const toInsert: IncomingBeautyPlanProduct[] = []

  for (const product of incoming) {
    if (product.id && existingIds.has(product.id) && !updatedIds.has(product.id)) {
      updatedIds.add(product.id)
      toUpdate.push({ id: product.id, product })
    } else {
      toInsert.push(withoutId(product))
    }
  }

  const toDeleteIds = existing.map((product) => product.id).filter((id) => !updatedIds.has(id))

  return { toUpdate, toInsert, toDeleteIds }
}
