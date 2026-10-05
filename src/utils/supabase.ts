import type { CookieOptions } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'

function resolveSupabaseUrl(): string {
  return (
    process.env.VITE_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    (import.meta.env.VITE_SUPABASE_URL as string) ??
    ''
  )
}

function resolveSupabaseAnonKey(): string {
  return (
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ??
    ''
  )
}

export function getSupabaseServerClient() {
  return createServerClient(resolveSupabaseUrl(), resolveSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(
        cookies: Array<{
          name: string
          value: string
          options?: CookieOptions
        }>,
      ) {
        cookies.forEach((cookie) => {
          // Przekazujemy opcje od @supabase/ssr (maxAge, sameSite, secure, path),
          // żeby sesja nie stawała się cookie sesyjnym i miała utwardzone flagi.
          setCookie(cookie.name, cookie.value, {
            ...cookie.options,
            path: cookie.options?.path ?? '/',
            sameSite: cookie.options?.sameSite ?? 'lax',
            secure:
              typeof cookie.options?.secure === 'boolean'
                ? cookie.options.secure
                : import.meta.env.PROD,
          })
        })
      },
    },
  })
}
