import { redirect as tanstackRedirect } from '@tanstack/react-router'

export function revalidatePath(..._args: unknown[]) {
  // TanStack Router refreshes loader data from the client with router.invalidate().
}

export function redirect(to: string): never {
  throw tanstackRedirect({ to: to as never })
}
