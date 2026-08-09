import { CentrifugoPublisher } from 'ras-stack/realtime'

export type RealtimeEvent = { type: 'change' } | { type: 'typing'; userId: string; typing: boolean }

export type RealtimePublisher = {
  publish: (groupId: string, event?: RealtimeEvent) => void
}

export type ManagedRealtimePublisher = RealtimePublisher & {
  idle: () => Promise<void>
  close: () => Promise<void>
}

type RealtimeConfig = {
  apiKey: string
  url: string
  fetch?: typeof fetch
}

export const groupChannel = (groupId: string) => `group:${groupId}`

export function createCentrifugoPublisher(config: RealtimeConfig): ManagedRealtimePublisher {
  const publisher = () =>
    new CentrifugoPublisher({
      apiUrl: `${config.url.replace(/\/$/, '')}/api`,
      apiKey: config.apiKey,
      fetch: config.fetch,
      onError: (error, channel) => console.error({ event: 'realtime_publish_failed', channel, error }),
    })
  const changes = publisher()
  const typing = publisher()
  return {
    publish(groupId, event = { type: 'change' }) {
      const target = event.type === 'change' ? changes : typing
      target.publish(groupChannel(groupId), event)
    },
    idle: async () => Promise.all([changes.idle(), typing.idle()]).then(() => undefined),
    close: async () => Promise.all([changes.close(), typing.close()]).then(() => undefined),
  }
}
