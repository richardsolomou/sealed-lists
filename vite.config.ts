import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'
import { postHogSourceMaps } from './scripts/posthogSourceMaps.ts'

export default defineConfig(({ mode }) => {
  const sourceMaps = postHogSourceMaps({ ...loadEnv(mode, process.cwd(), ''), ...process.env })
  return {
    resolve: { tsconfigPaths: true },
    server: {
      allowedHosts: ['host.docker.internal'],
      port: 3000,
      proxy: { '/connection': { target: 'ws://localhost:8000', ws: true } },
    },
    plugins: [tanstackStart(), nitro(), viteReact(), tailwindcss(), sourceMaps?.client],
    ...(sourceMaps ? { worker: { plugins: () => [sourceMaps.worker()] } } : {}),
  }
})
