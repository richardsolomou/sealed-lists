/// <reference lib="esnext.disposable" />

import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailDelivery } from '../adapters/email'
import { groupChannel, type RealtimeEvent } from '../contracts/realtime'
import { databaseFile, openDatabase } from '../db/database'
import * as schema from '../db/schema'
import { Repository } from '../db/repository'
import { createAuth } from './auth'
import { buildNotifier } from './notify'
import { createRealtime, type RealtimeViewerLookup } from './realtime'
import { SealedListsService } from './service'
import { currentUser } from './session'
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
    const viewer: RealtimeViewerLookup = async (request) => {
      const user = await currentUser(request)
      return user ? { id: user.id, info: { name: user.name } } : undefined
    }
    const realtime = resources.adopt(createRealtime(viewer), (instance) => instance.close())
    // Publications coalesce per channel, so typing pings get their own publisher rather than replace a queued change.
    const typing = resources.adopt(createRealtime(viewer), (instance) => instance.close())
    const changes = { publish: (groupId: string) => realtime.publish(groupChannel(groupId), { type: 'change' } satisfies RealtimeEvent) }
    const service = new SealedListsService(repository, Date.now, buildNotifier(repository, email, appUrl), changes)
    // better-sqlite3 transactions are synchronous and Better Auth's are not, so the adapter's `transaction` option stays off.
    const auth = createAuth(drizzleAdapter(database, { provider: 'sqlite', schema }), email)
    return { telemetry, database, service, realtime, typing, auth, emailConfigured: Boolean(email), close: () => resources.disposeAsync() }
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
