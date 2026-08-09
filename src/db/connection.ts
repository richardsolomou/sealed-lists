import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import path from 'node:path'
import { bundledDirectory } from 'ras-stack/database'
import { closeDrizzleSqlite, openDrizzleSqlite } from 'ras-stack/database/sqlite'
import { schema } from './schema'

export type SealedListsDatabase = BetterSQLite3Database<typeof schema> & { $client: import('better-sqlite3').Database }

const migrationsFolder = bundledDirectory({
  developmentUrl: new URL('../../drizzle', import.meta.url),
  production: import.meta.env.PROD,
  name: 'drizzle',
})

export function openDatabase(file: string): SealedListsDatabase {
  return openDrizzleSqlite({ file, schema, migrationsFolder })
}

export function closeDatabase(database: SealedListsDatabase) {
  closeDrizzleSqlite(database)
}

export function databasePath(dataDirectory = process.env.DATA_DIR ?? '/data') {
  return path.join(path.resolve(dataDirectory), 'sealed-lists.sqlite')
}
