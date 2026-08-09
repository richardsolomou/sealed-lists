import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { configuredProviders, providerCredentials, standardRateLimitOptions, standardSessionOptions, trustedOrigins } from 'ras-stack/auth'
import { PASSWORD_MIN_LENGTH } from '../core/game'
import type { EmailDelivery } from '../adapters/email'
import type { SealedListsDatabase } from '../db/connection'
import { schema } from '../db/schema'
import { resetPasswordEmail, verifyEmail } from './emails'

export const SOCIAL_PROVIDERS = ['google', 'discord'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

function socialProviders(env: NodeJS.ProcessEnv) {
  const enabled = configuredProviders(SOCIAL_PROVIDERS, env)
  return {
    ...(enabled.includes('google') ? { google: providerCredentials('google', env)! } : {}),
    ...(enabled.includes('discord') ? { discord: providerCredentials('discord', env)! } : {}),
  }
}

export function createAuth(database: SealedListsDatabase, secret: string, email: EmailDelivery) {
  return betterAuth({
    database: drizzleAdapter(database, { provider: 'sqlite', schema }),
    secret,
    baseURL: process.env.APP_URL?.trim() || undefined,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      autoSignIn: true,
      sendResetPassword: async ({ user, url }) => {
        await email.send(resetPasswordEmail(user.email, url))
      },
    },
    // Unverified accounts can still play: the group already knows who each other
    // are, and blocking the first game on an inbox would be the wrong trade.
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await email.send(verifyEmail(user.email, url))
      },
    },
    socialProviders: socialProviders(process.env),
    // Signing in with Google to an account made with a password should land on
    // the same account, not a second one.
    account: { accountLinking: { enabled: true, trustedProviders: [...SOCIAL_PROVIDERS] } },
    /*
     * Limits are per IP, and a whole group signing up shares one: six friends in
     * the same room on the same WiFi must not lock the last two out. Generous
     * enough for that, tight enough to make guessing a password pointless.
     */
    rateLimit: standardRateLimitOptions(),
    session: standardSessionOptions(),
    advanced: { useSecureCookies: (process.env.APP_URL ?? '').startsWith('https://') },
    trustedOrigins: trustedOrigins({ trustForwardedHeaders: true }),
  })
}
