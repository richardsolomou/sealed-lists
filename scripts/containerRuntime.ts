import fs from 'node:fs'
import { caddyRealtimeProxy, caddyRuntimeEnvironment, centrifugoEnvironment, superviseProcesses } from 'ras-stack/runtime'

const requiredEnvironment = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const apiKey = requiredEnvironment('CENTRIFUGO_API_KEY')
const proxySecret = requiredEnvironment('CENTRIFUGO_PROXY_SECRET')
const appUrl = requiredEnvironment('APP_URL')
const realtimeEnvironment = { ...process.env }
delete realtimeEnvironment.CENTRIFUGO_API_KEY
delete realtimeEnvironment.CENTRIFUGO_PROXY_SECRET
Object.assign(
  realtimeEnvironment,
  centrifugoEnvironment({ apiKey, allowedOrigins: process.env.CENTRIFUGO_CLIENT_ALLOWED_ORIGINS || appUrl }),
  {
    CENTRIFUGO_VAR_PROXY_SECRET: proxySecret,
  },
)

const caddyfile = '/tmp/sealed-lists-Caddyfile'
fs.writeFileSync(caddyfile, caddyRealtimeProxy())
process.exitCode = await superviseProcesses([
  { name: 'app', command: process.execPath, args: ['/app/.output/server/index.mjs'], env: process.env },
  { name: 'realtime', command: 'centrifugo', args: ['--config=/app/centrifugo.json'], env: realtimeEnvironment },
  {
    name: 'proxy',
    command: 'caddy',
    args: ['run', '--config', caddyfile, '--adapter', 'caddyfile'],
    env: { ...process.env, ...caddyRuntimeEnvironment() },
  },
])
