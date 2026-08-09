import { describe, expect, it, vi } from 'vitest'
import { createCentrifugoPublisher } from './centrifugo'

function deferred() {
  let resolve!: () => void
  return { promise: new Promise<void>((done) => (resolve = done)), resolve: () => resolve() }
}

describe('createCentrifugoPublisher', () => {
  it('publishes a list-free change to the group channel', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: {} }))
    const realtime = createCentrifugoPublisher({ apiKey: 'secret', url: 'http://centrifugo:8000', fetch: request })

    realtime.publish('tuesday')
    await realtime.idle()

    expect(request).toHaveBeenCalledWith('http://centrifugo:8000/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'secret' },
      body: JSON.stringify({ channel: 'group:tuesday', data: { type: 'change' } }),
      signal: expect.any(AbortSignal),
    })
  })

  it('publishes typing without list text', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: {} }))
    const realtime = createCentrifugoPublisher({ apiKey: 'secret', url: 'http://centrifugo:8000', fetch: request })

    realtime.publish('tuesday', { type: 'typing', userId: 'alex', typing: true })
    await realtime.idle()

    const body = request.mock.calls[0]?.[1]?.body
    if (typeof body !== 'string') throw new Error('expected a JSON request body')
    expect(JSON.parse(body)).toEqual({
      channel: 'group:tuesday',
      data: { type: 'typing', userId: 'alex', typing: true },
    })
  })

  it('does not let typing replace a pending change notification', async () => {
    const gate = deferred()
    const request = vi.fn<typeof fetch>().mockImplementation(async () => {
      await gate.promise
      return Response.json({ result: {} })
    })
    const realtime = createCentrifugoPublisher({ apiKey: 'secret', url: 'http://centrifugo:8000', fetch: request })

    realtime.publish('tuesday')
    realtime.publish('tuesday', { type: 'typing', userId: 'alex', typing: true })
    gate.resolve()
    await realtime.idle()

    const types = request.mock.calls.map((call) => {
      const body = call[1]?.body
      if (typeof body !== 'string') throw new Error('expected a JSON request body')
      return JSON.parse(body).data.type
    })
    expect(types).toEqual(['change', 'typing'])
  })
})
