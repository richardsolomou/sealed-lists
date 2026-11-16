import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { postHogEnvironment } from 'ras-stack/posthog'
import { postHogIngestProxy } from 'ras-stack/posthog/proxy'
import { defineConfig, loadEnv } from 'vite'
import { POSTHOG_INGEST_PATH } from './src/posthog'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const posthog = postHogEnvironment({ projectToken: env.VITE_POSTHOG_PROJECT_TOKEN, host: env.VITE_POSTHOG_HOST })
  const proxy = posthog ? postHogIngestProxy(posthog, { path: POSTHOG_INGEST_PATH }) : undefined
  return {
    resolve: { tsconfigPaths: true },
    server: {
      allowedHosts: ['host.docker.internal'],
      port: 3000,
      proxy: { '/connection': { target: 'ws://localhost:8000', ws: true }, ...proxy?.vite },
    },
    plugins: [tanstackStart(), nitro({ routeRules: { ...proxy?.nitro } }), viteReact(), tailwindcss()],
  }
})
