import { describe, expect, it, vi } from 'vitest'
import { buildEmailDelivery } from './email'

describe('buildEmailDelivery', () => {
  it('disables delivery when SMTP is not configured', () => {
    expect(buildEmailDelivery({}).configured).toBe(false)
  })

  it('reports undelivered development email without failing', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await buildEmailDelivery({}).send({ to: 'alex@example.test', subject: 'Game ready', text: 'Open the group.' })

    expect(info).toHaveBeenCalledOnce()
    info.mockRestore()
  })

  it('rejects partial SMTP configuration', () => {
    expect(() => buildEmailDelivery({ SMTP_HOST: 'smtp.example.test' })).toThrow('EMAIL_FROM is required')
  })
})
