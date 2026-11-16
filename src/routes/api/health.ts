import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { app } from '../../server/app'
import { checkDependency, healthResponse } from '../../server/health'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () =>
        healthResponse(() => {
          const { database } = app()
          return checkDependency('database_unavailable', 'database unavailable', () => database.get(sql`SELECT 1`))
        }),
    },
  },
})
