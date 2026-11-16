import { assertSqliteConformance } from 'ras-stack/conformance'
import { describe, expect, it } from 'vitest'
import { closeDatabase, openDatabase } from '../db/connection'

describe('shared infrastructure conformance', () => {
  it('configures SQLite safely', async () => {
    const database = openDatabase(':memory:')
    await expect(assertSqliteConformance((name) => database.$client.pragma(name, { simple: true }))).resolves.toBeUndefined()
    closeDatabase(database)
  })
})
