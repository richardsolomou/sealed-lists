/** Live updates are a nudge: a list-free change, or who is typing. */
export type RealtimeEvent = { type: 'change' } | { type: 'typing'; userId: string; typing: boolean }

export const groupChannel = (groupId: string) => `group:${groupId}`
