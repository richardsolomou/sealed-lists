import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'

const { provider } = vi.hoisted(() => ({ provider: vi.fn() }))
vi.mock('ras-stack/posthog/react', () => ({
  PostHogIntegration: (props: { children: ReactNode }) => {
    provider(props)
    return props.children
  },
  PostHogBetterAuthIdentity: () => null,
}))
vi.mock('@tanstack/react-router', () => ({
  createRootRouteWithContext: () => (options: unknown) => ({ options }),
  HeadContent: () => null,
  Scripts: () => null,
  Outlet: () => 'application',
  Link: () => null,
  useNavigate: () => vi.fn(),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
  useSuspenseQuery: () => ({ data: null }),
}))
vi.mock('../client/queries', () => ({ meQuery: () => ({}) }))
vi.mock('../client/authClient', () => ({ authClient: { useSession: () => ({ data: null, isPending: false }) } }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  vi.resetModules()
})

async function render(token: string) {
  vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', token)
  vi.stubEnv('VITE_POSTHOG_HOST', token ? 'https://eu.i.posthog.com' : '')
  const { Route } = await import('./__root')
  return renderToStaticMarkup(createElement(Route.options.component as ComponentType))
}

it('routes the real root provider through the same path as the ingest proxy', async () => {
  await render('phc_test')
  expect(provider).toHaveBeenCalledWith(
    expect.objectContaining({
      environment: expect.objectContaining({ projectToken: 'phc_test', host: 'https://eu.i.posthog.com' }),
      ingestPath: '/t',
    }),
  )
})

it('renders the application without initializing telemetry when credentials are absent', async () => {
  const html = await render('')
  expect({ environment: provider.mock.lastCall?.[0].environment, rendered: html.includes('application') }).toEqual({
    environment: undefined,
    rendered: true,
  })
})
