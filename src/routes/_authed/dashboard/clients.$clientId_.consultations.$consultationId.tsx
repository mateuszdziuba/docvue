import { createFileRoute, notFound } from '@tanstack/react-router'
import { ConsultationEditor } from '@/components/admin/consultation/consultation-editor'
import { getBeautyPlanFn } from '@/src/server/beauty-plans'
import { getConsultationFn } from '@/src/server/consultations'
import { getSalonFn } from '@/src/server/settings'
import { getStaffFn } from '@/src/server/staff'
import { getTreatmentsFn } from '@/src/server/treatments'

export const Route = createFileRoute(
  '/_authed/dashboard/clients/$clientId_/consultations/$consultationId',
)({
  loader: async ({ params }) => {
    const [result, salon, staffResult, treatmentsResult, beautyPlanResult] = await Promise.all([
      getConsultationFn({ data: { id: params.consultationId } }),
      getSalonFn(),
      getStaffFn(),
      getTreatmentsFn({ data: {} }),
      getBeautyPlanFn({ data: { clientId: params.clientId } }),
    ])
    if (result.error || !result.consultation || !result.client) throw notFound()
    if (result.consultation.client_id !== params.clientId) throw notFound()

    return {
      consultation: result.consultation,
      client: result.client,
      photoUrl: result.photoUrl,
      salonId: salon?.id ?? '',
      staffMembers: (staffResult.data ?? [])
        .filter((member) => member.is_active)
        .map((member) => ({ id: member.id, name: member.name })),
      treatments: treatmentsResult.treatments,
      beautyPlan: beautyPlanResult.plan
        ? {
            id: beautyPlanResult.plan.id,
            consultation_id: beautyPlanResult.plan.consultation_id ?? null,
          }
        : null,
    }
  },
  component: ConsultationPage,
})

function ConsultationPage() {
  const { consultation, client, photoUrl, salonId, staffMembers, treatments, beautyPlan } =
    Route.useLoaderData()
  const { isOwner } = Route.useRouteContext()

  return (
    <ConsultationEditor
      consultation={consultation}
      client={client}
      initialPhotoUrl={photoUrl}
      isOwner={isOwner}
      salonId={salonId}
      staffMembers={staffMembers}
      treatments={treatments}
      beautyPlan={beautyPlan}
    />
  )
}
