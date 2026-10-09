import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Zgodność wstecz: projekt Vercel ma stare nazwy env z aplikacji Next.js.
  const supabaseUrl =
    env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ''
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''

  // Udostępnij sekrety serwerowe w process.env dla SSR (createServerFn).
  // Nie są eksponowane do klienta — trafiają wyłącznie do kodu serwerowego.
  for (const [key, value] of Object.entries({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SITE_URL: env.VITE_SITE_URL,
  })) {
    if (value && !process.env[key]) process.env[key] = value
  }

  return {
    server: {
      port: 3000,
      host: true,
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  }
})
