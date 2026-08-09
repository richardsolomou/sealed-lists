import { afterEach, describe, expect, it, vi } from 'vitest'
import { mutationRpc } from './rpc'

const request = (origin?: string, url = 'https://sealed-lists.example.com/action', headers: Record<string, string> = {}) =>
  new Request(url, {
    method: 'POST',
    headers: origin ? { origin, 'sec-fetch-site': 'same-origin', ...headers } : undefined,
  })

afterEach(() => vi.unstubAllEnvs())

describe('mutationRpc', () => {
  it('runs same-origin mutations', async () => {
    const work = vi.fn<() => string>(() => 'done')

    await expect(mutationRpc(work, request('https://sealed-lists.example.com'))).resolves.toBe('done')
    expect(work).toHaveBeenCalledOnce()
  })

  it('rejects mutations without an origin before running them', async () => {
    const work = vi.fn<() => void>()

    await expect(mutationRpc(work, request())).rejects.toThrow('cross-origin mutation rejected')
    expect(work).not.toHaveBeenCalled()
  })

  it('accepts the configured public origin behind an internal URL', async () => {
    vi.stubEnv('APP_URL', 'https://sealed-lists.example.com')

    await expect(mutationRpc(() => 'done', request('https://sealed-lists.example.com', 'http://app:3000/action'))).resolves.toBe('done')
  })

  it('accepts the public origin supplied by the trusted proxy', async () => {
    const proxied = request('https://sealed-lists.example.com', 'http://app:3000/action', {
      'x-forwarded-host': 'sealed-lists.example.com',
      'x-forwarded-proto': 'https',
    })

    await expect(mutationRpc(() => 'done', proxied)).resolves.toBe('done')
  })

  it('rejects a cross-site fetch even when its origin matches', async () => {
    const crossSite = request('https://sealed-lists.example.com', undefined, { 'sec-fetch-site': 'cross-site' })

    await expect(mutationRpc(() => 'done', crossSite)).rejects.toThrow('cross-origin mutation rejected')
  })
})
