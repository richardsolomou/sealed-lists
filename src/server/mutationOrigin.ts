import { getRequest } from '@tanstack/react-start/server'
import { requireSameOrigin } from 'ras-stack/auth'

export function requireMutationOrigin(request = getRequest()) {
  return requireSameOrigin(request, {
    configured: [process.env.APP_URL],
    trustForwardedHeaders: true,
  })
}
