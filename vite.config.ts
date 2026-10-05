import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Udostępnij sekrety serwerowe w process.env dla SSR (createServerFn).
  // Nie są eksponowane do klienta — trafiają wyłącznie do kodu serwerowego.
  for (const key of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SITE_URL',
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }

  return {
    server: {
      port: 3000,
      host: true,
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  }
})
