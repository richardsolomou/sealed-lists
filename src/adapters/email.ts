import { createSmtpDelivery, smtpConfigFromEnvironment, type EmailDelivery as SmtpDelivery, type EmailMessage } from 'ras-stack/email'

export type Email = EmailMessage

export type EmailDelivery = Pick<SmtpDelivery, 'send'> & { configured: boolean }

/**
 * SMTP because every provider speaks it — Resend, Postmark, Fastmail, a relay on
 * the box. With nothing configured, mail is written to the log instead so a
 * development or self-hosted instance still works, just without delivery.
 */
export function buildEmailDelivery(env: NodeJS.ProcessEnv = process.env): EmailDelivery {
  const config = smtpConfigFromEnvironment(env)
  if (!config) {
    return {
      configured: false,
      send: async (email) => {
        console.info({ event: 'email_not_sent', to: email.to, subject: email.subject }, email.text)
      },
    }
  }

  const delivery = createSmtpDelivery(config)

  return {
    configured: true,
    send: (email) => delivery.send(email),
  }
}
