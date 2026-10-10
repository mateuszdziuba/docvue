import { createFileRoute } from '@tanstack/react-router'
import { ProductsList } from '@/components/admin/products-list'
import { getCatalogProductsFn } from '@/src/server/products'

export const Route = createFileRoute('/_authed/dashboard/products/')({
  loader: async ({ context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const result = await getCatalogProductsFn({ data: { limit: 200 } })
    return {
      products: result.products,
      error: 'error' in result ? (result.error ?? null) : null,
      isOwner: isOwner ?? false,
    }
  },
  component: ProductsPage,
})

function ProductsPage() {
  const { products, error, isOwner } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground">
          Baza kosmetyków
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dodaj kosmetyki raz (przez link lub ręcznie), a potem wybieraj je do planów
          pielęgnacyjnych bez wklejania linków.
        </p>
      </div>

      <ProductsList initialProducts={products} initialError={error ?? null} isOwner={isOwner} />
    </div>
  )
}
