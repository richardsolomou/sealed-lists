import { describe, expect, it } from 'vitest'
import { channelPolicy } from './realtimeChannels'

const policy = channelPolicy((groupId, userId) => groupId === 'one' && userId === 'user-1')

describe('channel policy', () => {
  it('gives a viewer no server-side channels', () => {
    expect(policy.serverChannels({ id: 'user-1' })).toEqual([])
  })

  it('lets a member follow their group’s channel', () => {
    expect(policy.canSubscribe({ id: 'user-1' }, 'group:one')).toBe(true)
  })

  it('refuses a group the viewer is not a member of', () => {
    expect(policy.canSubscribe({ id: 'user-1' }, 'group:another')).toBe(false)
  })

  it('refuses an anonymous viewer', () => {
    expect(policy.canSubscribe({ id: '' }, 'group:one')).toBe(false)
  })

  it('refuses a channel outside the group namespace', () => {
    expect(policy.canSubscribe({ id: 'user-1' }, 'user:user-1')).toBe(false)
  })
})
