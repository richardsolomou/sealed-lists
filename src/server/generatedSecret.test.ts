import { memoryAdapter } from 'better-auth/adapters/memory'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createAuth, generatedSecret } from './auth'

const previous = 'a secret an earlier release generated into the data directory'
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'generated-secret-'))
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

it('reads the secret an earlier release generated', async () => {
  await writeFile(path.join(directory, 'auth.secret'), `${previous}\n`)
  expect(generatedSecret({ DATA_DIR: directory })).toBe(previous)
})

it('leaves the secret to Better Auth when a variable is set', async () => {
  await writeFile(path.join(directory, 'auth.secret'), previous)
  const set = ['BETTER_AUTH_SECRET', 'BETTER_AUTH_SECRETS', 'AUTH_SECRET'].map((name) =>
    generatedSecret({ DATA_DIR: directory, [name]: 'x' }),
  )
  expect(set).toEqual([undefined, undefined, undefined])
})

it('has no secret without the file', () => {
  expect(generatedSecret({ DATA_DIR: directory })).toBeUndefined()
})

it('keeps a session signed with the generated secret valid', async () => {
  const database = memoryAdapter({ user: [], session: [], account: [], verification: [], rateLimit: [] })
  const signIn = createAuth(database, undefined, previous)
  const origin = 'http://localhost:3000'
  const response = await signIn.handler(
    new Request(`${origin}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ name: 'Ada', email: 'ada@example.test', password: 'correct horse battery staple' }),
    }),
  )
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  await writeFile(path.join(directory, 'auth.secret'), previous)
  const restarted = createAuth(database, undefined, generatedSecret({ DATA_DIR: directory }))
  expect((await restarted.api.getSession({ headers: new Headers({ cookie }) }))?.user.name).toBe('Ada')
})
