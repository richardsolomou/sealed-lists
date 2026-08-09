import { canonicalRedirect as sharedCanonicalRedirect } from 'ras-stack/server'

const SERVED_ON_ANY_HOST = new Set(['/api/health', '/api/centrifugo/connect'])

export function canonicalRedirect(requestUrl: string, appUrl: string | undefined): string | null {
  return sharedCanonicalRedirect(requestUrl, {
    canonicalUrl: appUrl,
    pathsServedOnAnyHost: SERVED_ON_ANY_HOST,
  })
}
