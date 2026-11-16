import net from 'node:net'
import { createTransport, type Transporter } from 'nodemailer'

/** The product name the auth email copy uses. */
export const PRODUCT_NAME = 'Sealed Lists'

const SMTP_TIMEOUT_MS = 20_000

/** `cid` lets the HTML body show the attachment inline as `cid:<value>`. */
export type EmailAttachment = { filename: string; content: Buffer; contentType: string; cid?: string }

export type EmailMessage = {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: EmailAttachment[]
  /** Replaces the configured sender's display name; the address stays the configured one so SPF and DKIM still pass. */
  fromName?: string
  replyTo?: string
}

export type EmailDelivery = {
  send(message: EmailMessage): Promise<void>
  /** Connects and authenticates without sending, to check settings someone just entered. */
  verify(): Promise<void>
}

export type SmtpConfig = {
  from: string
  host: string
  port: number
  secure: boolean
  user?: string
  password?: string
  /** The name TLS presents and verifies when `host` is an address the application resolved and checked itself. */
  servername?: string
  timeoutMs?: number
}

/** Sends through the SMTP server in the environment; undefined when none is configured. */
export function emailDelivery(environment: NodeJS.ProcessEnv = process.env): EmailDelivery | undefined {
  const config = smtpConfigFromEnvironment(environment)
  return config && smtpDelivery(config)
}

export function smtpConfigFromEnvironment(environment: NodeJS.ProcessEnv = process.env): SmtpConfig | undefined {
  const host = environment.SMTP_HOST?.trim()
  const from = environment.EMAIL_FROM?.trim()
  if (!host && !from) return undefined
  if (!host) throw new Error('SMTP_HOST is required for SMTP email')
  if (!from) throw new Error('EMAIL_FROM is required for SMTP email')

  const port = Number(environment.SMTP_PORT ?? 587)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('SMTP_PORT must be a valid TCP port')

  const user = environment.SMTP_USER?.trim()
  const password = environment.SMTP_PASSWORD
  if (Boolean(user) !== Boolean(password)) throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together')

  return {
    from,
    host,
    port,
    secure: environment.SMTP_SECURE?.trim().toLowerCase() === 'true',
    ...(user && password ? { user, password } : {}),
  }
}

/** Every send and verify fails and disconnects after `timeoutMs`, and each wait on the server is bounded by the same limit. */
export function smtpDelivery(config: SmtpConfig): EmailDelivery {
  const timeoutMs = config.timeoutMs ?? SMTP_TIMEOUT_MS
  const options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    servername: config.servername,
    auth: config.user ? { user: config.user, pass: config.password } : undefined,
    // Without it, a stripped STARTTLS offer would make nodemailer send the password in plain text.
    requireTLS: Boolean(config.user),
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
  }
  const exchange = async (work: (transport: Transporter) => Promise<unknown>) => {
    // nodemailer cannot abort an exchange, so each one gets its own socket for the deadline to destroy.
    const socket = new net.Socket()
    await withinDeadline(work(createTransport({ ...options, socket })), timeoutMs, () => {
      socket.destroy()
      // Connecting revives a destroyed socket, so one the deadline beat to connecting closes as soon as it opens.
      socket.once('connect', () => socket.destroy())
    })
  }
  return {
    send: ({ fromName, ...message }) =>
      exchange((transport) =>
        transport.sendMail({ from: fromName ? { name: fromName, address: senderAddress(config.from) } : config.from, ...message }),
      ),
    verify: () => exchange((transport) => transport.verify()),
  }
}

// A server that trickles bytes keeps each socket wait short of its timeout, so the whole exchange needs its own deadline.
async function withinDeadline(work: Promise<unknown>, timeoutMs: number, abort: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      abort()
      reject(new Error(`SMTP server did not finish within ${timeoutMs} ms`))
    }, timeoutMs)
  })
  try {
    await Promise.race([work, deadline])
  } finally {
    clearTimeout(timer)
  }
}

function senderAddress(from: string) {
  return /<([^<>]+)>\s*$/.exec(from)?.[1] ?? from
}

type AuthEmail = { user: { id: string; email: string; name: string }; url: string }

/**
 * Better Auth's password-reset and verification callbacks, which wait for the SMTP server to accept each email. Plain text
 * only, and short: they exist to get someone back to the page, not to be read.
 */
export function authEmails(delivery: Pick<EmailDelivery, 'send'>) {
  return {
    sendResetPassword: ({ user, url }: AuthEmail) =>
      delivery.send({
        to: user.email,
        subject: `Reset your ${PRODUCT_NAME} password`,
        text: `Set a new password here:\n\n${url}\n\nThe link stops working in an hour. If you did not ask for this, ignore it.`,
      }),
    sendVerificationEmail: ({ user, url }: AuthEmail) =>
      delivery.send({
        to: user.email,
        subject: `Confirm your email for ${PRODUCT_NAME}`,
        text: `Confirm your email address and your account is ready:\n\n${url}\n\nIf you did not sign up, ignore this.`,
      }),
  }
}
