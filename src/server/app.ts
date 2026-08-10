import path from 'node:path'
import { persistedSecret } from 'ras-stack/auth'
import { globalSingleton } from 'ras-stack/server'
import { buildEmailDelivery } from '../adapters/email'
import { serverTelemetry } from '../adapters/posthog'
import { createCentrifugoPublisher, type RealtimePublisher } from '../adapters/centrifugo'
import { databasePath, openDatabase, type SealedListsDatabase } from '../db/connection'
import { Repository } from '../db/repository'
import { createAuth } from './auth'
import { buildNotifier } from './notify'
import { SealedListsService } from './service'

type App = {
  database: SealedListsDatabase
  service: SealedListsService
  realtime: RealtimePublisher
  auth: ReturnType<typeof createAuth>
  emailConfigured: boolean
  telemetry: ReturnType<typeof serverTelemetry>
}

const appUrl = () => process.env.APP_URL?.trim() || 'http://localhost:3000'

export function app(): App {
  return globalSingleton('sealed-lists.app', () => {
    const telemetry = serverTelemetry()
    const file = databasePath()
    const database = openDatabase(file)
    const repository = new Repository(database)
    const email = buildEmailDelivery()
    const realtime = createCentrifugoPublisher({
      apiKey: requiredEnvironment('CENTRIFUGO_API_KEY'),
      url: process.env.CENTRIFUGO_URL?.trim() || 'http://localhost:8000',
    })
    const service = new SealedListsService(repository, Date.now, buildNotifier(repository, email, appUrl), realtime)
    return {
      database,
      service,
      realtime,
      auth: createAuth(database, persistedSecret({ directory: path.dirname(file) }), email),
      emailConfigured: email.configured,
      telemetry,
    }
  })
}

export function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}
