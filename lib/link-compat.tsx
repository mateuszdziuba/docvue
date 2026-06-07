import {
  Link as TanStackLink,
  type LinkProps as TanStackLinkProps,
  useRouterState,
} from '@tanstack/react-router'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

type CompatLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  children?: ReactNode
}

function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:|#)/.test(href)
}

export function Link({ href, children, ...props }: CompatLinkProps) {
  if (isExternalHref(href)) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  return (
    <TanStackLink {...(props as Omit<TanStackLinkProps, 'to'>)} to={href as never}>
      {children}
    </TanStackLink>
  )
}

export function usePathname() {
  return useRouterState({ select: (state) => state.location.pathname })
}

export default Link
