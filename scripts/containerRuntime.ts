import { runRealtimeStack } from 'ras-stack/runtime'

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
realtimeEnvironment.CENTRIFUGO_VAR_PROXY_SECRET = proxySecret

process.exitCode = await runRealtimeStack({
  app: { command: process.execPath, args: ['/app/.output/server/index.mjs'], env: process.env },
  centrifugo: {
    configPath: '/app/centrifugo.json',
    env: realtimeEnvironment,
    environment: { apiKey, allowedOrigins: process.env.CENTRIFUGO_CLIENT_ALLOWED_ORIGINS || appUrl },
  },
  caddy: { configPath: '/tmp/sealed-lists-Caddyfile', env: process.env },
})
