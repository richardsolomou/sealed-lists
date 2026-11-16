import type { RealtimePolicy } from './realtime'

// Application policy: keep `centrifugo.json`'s namespaces in step with these channels.

/** Only a group's members may follow its channel; a subscription token re-checks membership every time it refreshes. */
export function channelPolicy(isMember: (groupId: string, userId: string) => boolean): RealtimePolicy {
  return {
    /** No server-side channels: a page follows the one group it shows, which it subscribes to itself. */
    serverChannels: () => [],
    canSubscribe: (viewer, channel) => {
      const groupId = /^group:([\w-]{1,64})$/.exec(channel)?.[1]
      return Boolean(viewer.id && groupId && isMember(groupId, viewer.id))
    },
  }
}
