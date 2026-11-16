/// <reference lib="esnext.disposable" />

import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailDelivery } from '../adapters/email'
import { createCentrifugoPublisher } from '../adapters/centrifugo'
import { databaseFile, openDatabase } from '../db/database'
import * as schema from '../db/schema'
import { Repository } from '../db/repository'
import { createAuth } from './auth'
import { buildNotifier } from './notify'
import { SealedListsService } from './service'
import { createTelemetry } from './telemetry'

export type App = ReturnType<typeof createApp>

const appKey = Symbol.for('app.server')
type AppGlobal = typeof globalThis & { [appKey]?: App }

const appUrl = () => process.env.APP_URL?.trim() || 'http://localhost:3000'

/**
 * The server's long-lived resources, created on first use. The instance lives on `globalThis`, so Vite's
 * development module reloads reuse it instead of opening a second set of connections.
 */
export function app(): App {
  const scope = globalThis as AppGlobal
  return (scope[appKey] ??= createApp())
}

function createApp() {
  // Each resource registers its cleanup as it is created, and closing runs them in reverse.
  const resources = new AsyncDisposableStack()
  try {
    // First, so it closes last and records the others closing.
    const telemetry = resources.adopt(createTelemetry(), (created) => created.shutdown())
    const database = resources.adopt(openDatabase(databaseFile()), (db) => {
      db.$client.close()
    })
    const repository = new Repository(database)
    const email = emailDelivery()
    const realtime = resources.adopt(
      createCentrifugoPublisher({
        apiKey: requiredEnvironment('CENTRIFUGO_API_KEY'),
        url: process.env.CENTRIFUGO_URL?.trim() || 'http://localhost:8000',
      }),
      (publisher) => publisher.close(),
    )
    const service = new SealedListsService(repository, Date.now, buildNotifier(repository, email, appUrl), realtime)
    // better-sqlite3 transactions are synchronous and Better Auth's are not, so the adapter's `transaction` option stays off.
    const auth = createAuth(drizzleAdapter(database, { provider: 'sqlite', schema }), email)
    return { telemetry, database, service, realtime, auth, emailConfigured: Boolean(email), close: () => resources.disposeAsync() }
  } catch (error) {
    disposeInBackground(resources)
    throw error
  }
}

/** Closes what a failed `createApp` already opened, so retrying on the next `app()` call does not leak a set per attempt. */
function disposeInBackground(resources: AsyncDisposableStack) {
  resources.disposeAsync().catch((cause: unknown) => {
    console.error('closing a partially created app failed', cause)
  })
}

/** Closes the current instance, if any; the next `app()` call creates a fresh one. */
export async function closeApp() {
  const scope = globalThis as AppGlobal
  const current = scope[appKey]
  delete scope[appKey]
  await current?.close()
}

export function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}
