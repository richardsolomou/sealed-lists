import { describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../../server/app', () => ({ app: () => ({ database: { get } }) }))
import { Route } from './health'

const handler = (Route.options.server!.handlers as { GET: () => Promise<Response> }).GET

describe('application health route', () => {
  it('checks the application database before reporting healthy', async () => {
    get.mockReturnValueOnce({ value: 1 })
    const response = await handler()
    expect({ status: response.status, checked: get.mock.calls.length }).toEqual({ status: 200, checked: 1 })
    get.mockClear()
  })

  it('reports database unavailability without exposing the failure', async () => {
    get.mockImplementationOnce(() => {
      throw new Error('private database credentials')
    })
    const response = await handler()
    expect({ status: response.status, body: await response.text() }).toEqual({
      status: 503,
      body: JSON.stringify({ ok: false, error: 'database unavailable', code: 'database_unavailable' }),
    })
    get.mockClear()
  })
})
