import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/dashboard/clients/$clientId_/consultations')({
  component: ConsultationsLayout,
})

function ConsultationsLayout() {
  return <Outlet />
}
