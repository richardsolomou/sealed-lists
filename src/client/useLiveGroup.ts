import { useQueryClient } from '@tanstack/react-query'
import type { ClientInfo, PublicationContext, SubscribedContext } from 'centrifuge'
import { createSameOriginRealtimeClient } from 'ras-stack/realtime/client'
import { useConnectedRealtimeClient } from 'ras-stack/realtime/react'
import { useCallback, useState } from 'react'
import type { RealtimeEvent } from '../adapters/centrifugo'
import { groupQuery } from './queries'

const TYPING_TTL_MS = 6_000

export type PresentPlayer = { userId: string; name: string; typing: boolean }

export function useLiveGroup(token: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const [present, setPresent] = useState<PresentPlayer[]>([])
  const createClient = useCallback(() => createSameOriginRealtimeClient({ data: { token } }), [token])
  const configure = useCallback(
    (realtime: ReturnType<typeof createSameOriginRealtimeClient>) => {
      const channel = { current: '' }
      const typing = new Map<string, number>()
      let sweep: ReturnType<typeof setTimeout> | undefined
      let closed = false
      let presenceRequest = 0
      const refresh = () => void queryClient.invalidateQueries({ queryKey: groupQuery(token).queryKey })
      const syncPresence = async () => {
        if (!channel.current) return
        const request = ++presenceRequest
        try {
          const { clients } = await realtime.presence(channel.current)
          const players = presentPlayers(clients, typing, Date.now())
          if (!closed && request === presenceRequest) setPresent(players)
        } catch (error) {
          console.error({ event: 'realtime_presence_failed', error })
        }
      }
      const scheduleTypingSweep = () => {
        clearTimeout(sweep)
        const next = Math.min(...typing.values())
        if (!Number.isFinite(next)) return
        sweep = setTimeout(
          () => {
            const now = Date.now()
            for (const [userId, until] of typing) if (until <= now) typing.delete(userId)
            void syncPresence()
            scheduleTypingSweep()
          },
          Math.max(0, next - Date.now()) + 50,
        )
      }

      const subscribed = ({ channel: nextChannel }: SubscribedContext) => {
        channel.current = nextChannel
        refresh()
        void syncPresence()
      }
      const presenceChanged = () => void syncPresence()
      const publication = ({ data }: PublicationContext) => {
        const event = groupEvent(data)
        if (!event) return
        if (event.type === 'change') {
          refresh()
          void syncPresence()
          return
        }
        if (event.type !== 'typing') return
        if (event.typing) typing.set(event.userId, Date.now() + TYPING_TTL_MS)
        else typing.delete(event.userId)
        scheduleTypingSweep()
        void syncPresence()
      }
      realtime.on('connected', refresh)
      realtime.on('subscribed', subscribed)
      realtime.on('join', presenceChanged)
      realtime.on('leave', presenceChanged)
      realtime.on('publication', publication)

      return () => {
        closed = true
        clearTimeout(sweep)
        realtime.off('connected', refresh)
        realtime.off('subscribed', subscribed)
        realtime.off('join', presenceChanged)
        realtime.off('leave', presenceChanged)
        realtime.off('publication', publication)
        setPresent([])
      }
    },
    [queryClient, token],
  )
  useConnectedRealtimeClient(createClient, enabled, { configure })

  return present
}

export function presentPlayers(clients: Record<string, ClientInfo>, typing: Map<string, number>, now: number): PresentPlayer[] {
  const players = new Map<string, PresentPlayer>()
  for (const client of Object.values(clients)) {
    const name = connectionName(client)
    if (client.user && name) players.set(client.user, { userId: client.user, name, typing: (typing.get(client.user) ?? 0) > now })
  }
  return [...players.values()].toSorted((left, right) => left.name.localeCompare(right.name) || left.userId.localeCompare(right.userId))
}

function connectionName(client: ClientInfo) {
  if (typeof client.connInfo !== 'object' || client.connInfo === null || !('name' in client.connInfo)) return undefined
  return typeof client.connInfo.name === 'string' ? client.connInfo.name : undefined
}

function groupEvent(value: unknown): RealtimeEvent | undefined {
  if (typeof value !== 'object' || value === null || !('type' in value)) return undefined
  if (value.type === 'change') return { type: 'change' }
  if (
    value.type === 'typing' &&
    'userId' in value &&
    typeof value.userId === 'string' &&
    'typing' in value &&
    typeof value.typing === 'boolean'
  ) {
    return { type: 'typing', userId: value.userId, typing: value.typing }
  }
  return undefined
}
