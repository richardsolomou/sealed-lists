import { app } from './app'
import type { RealtimeViewer } from './realtime'

// Application policy: keep `centrifugo.json`'s namespaces in step with these channels.

/** No server-side channels: a page follows the one group it shows, which it subscribes to itself. */
export function serverChannels(_viewer: RealtimeViewer): string[] {
  return []
}

/** Only a group's members may follow its channel; a subscription token re-checks membership every time it refreshes. */
export function canSubscribe(viewer: RealtimeViewer, channel: string) {
  const groupId = /^group:([\w-]{1,64})$/.exec(channel)?.[1]
  return Boolean(viewer.id && groupId && app().service.isMember(groupId, viewer.id))
}
