import { useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { authFailureMessage } from 'ras-stack/auth/client'
import { useAuthAction } from 'ras-stack/auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASSWORD_MIN_LENGTH } from '../core/game'
import { authClient } from '../client/authClient'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: 'New password — Sealed Lists' }] }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const resetPassword = useAuthAction({
    failureMessage: (failure) => authFailureMessage(failure, 'That link has run out. Ask for a new one.'),
  })

  if (!token) {
    return (
      <main className="mx-auto max-w-sm">
        <h1 className="text-3xl">That link is incomplete</h1>
        <p className="mt-4 text-faint">
          Open the one from the email again, or{' '}
          <Link to="/forgot-password" className="underline decoration-edge underline-offset-4 hover:text-brass">
            ask for a new one
          </Link>
          .
        </p>
      </main>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = await resetPassword.run(() => authClient.resetPassword({ newPassword: password, token }))
    if (result.error) return
    await queryClient.invalidateQueries()
    toast.success('Password saved.')
    void navigate({ to: '/signin' })
  }

  return (
    <main className="mx-auto max-w-sm">
      <h1 className="text-3xl">New password</h1>
      <p className="mt-2 mb-7 text-sm text-faint">{PASSWORD_MIN_LENGTH} characters or more.</p>
      <Card>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={password.length < PASSWORD_MIN_LENGTH || resetPassword.busy}>
              {resetPassword.busy ? 'Saving…' : 'Save password'}
            </Button>
            {resetPassword.error && <p className="text-sm text-destructive">{resetPassword.error}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
