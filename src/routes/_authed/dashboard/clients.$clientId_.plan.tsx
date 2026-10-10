import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  BeautyPlanEditor,
  type BeautyPlanProductInitial,
} from '@/components/admin/beauty-plan-editor'
import type { BeautyPlanProduct } from '@/src/server/beauty-plans'
import { getBeautyPlanFn } from '@/src/server/beauty-plans'
import { getClientFn } from '@/src/server/clients'

export const Route = createFileRoute('/_authed/dashboard/clients/$clientId_/plan')({
  loader: async ({ params }) => {
    const [clientResult, planResult] = await Promise.all([
      getClientFn({ data: { id: params.clientId } }),
      getBeautyPlanFn({ data: { clientId: params.clientId } }),
    ])
    if (clientResult.error || !clientResult.client) throw notFound()
    return {
      client: clientResult.client,
      plan: planResult.plan,
      products: planResult.products ?? [],
    }
  },
  component: BeautyPlanEditorPage,
})

function toInitial(product: BeautyPlanProduct): BeautyPlanProductInitial {
  return {
    id: product.id,
    name: product.name,
    url: product.url ?? '',
    imageUrl: product.image_url,
    price: product.price,
    usageDescription: product.usage_description ?? '',
    availableInSalon: product.available_in_salon,
    catalogProductId: product.catalog_product_id,
  }
}

function BeautyPlanEditorPage() {
  const { client, plan, products } = Route.useLoaderData()
  const { clientId } = Route.useParams()

  return (
    <BeautyPlanEditor
      clientId={clientId}
      planId={plan?.id}
      clientName={client.name}
      initialMorningDesc={plan?.morning_description ?? ''}
      initialEveningDesc={plan?.evening_description ?? ''}
      initialMorningProducts={products
        .filter((product) => product.time_of_day === 'morning')
        .map(toInitial)}
      initialEveningProducts={products
        .filter((product) => product.time_of_day === 'evening')
        .map(toInitial)}
    />
  )
}
