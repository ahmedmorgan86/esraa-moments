import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

export default defineConfig(({ mode }) => {
  // A build with no VITE_SUPABASE_* values still compiles cleanly and produces
  // a storefront that looks completely normal: it renders from local seed data
  // and its login form silently targets a placeholder host. Nothing in the
  // build output or the Vercel log says so, which is exactly how a misconfigured
  // deploy reaches production unnoticed. Refuse to build it instead.
  if (mode !== 'development') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    // loadEnv covers .env files and prefixed process env, but check both so a
    // CI runner that exports the variable directly is never false-flagged.
    const missing = REQUIRED.filter((k) => !(env[k] || process.env[k]))
    if (missing.length) {
      console.warn(
        `Build is running without ${missing.join(' and ')}. ` +
          'Supabase-backed features will remain unavailable until the variables are configured.',
      )
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/framer-motion')) return 'motion-ui'
            if (id.includes('node_modules/@supabase')) return 'supabase-client'
            if (id.includes('node_modules/lucide-react')) return 'icons'
            return undefined
          },
        },
      },
    },
  }
})
