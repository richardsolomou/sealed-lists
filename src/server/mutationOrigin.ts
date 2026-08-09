import { requireTanStackMutationOrigin } from 'ras-stack/tanstack/server'

export function requireMutationOrigin(request?: Request) {
  return requireTanStackMutationOrigin(
    {
      configured: [process.env.APP_URL],
      trustForwardedHeaders: true,
    },
    request,
  )
}
