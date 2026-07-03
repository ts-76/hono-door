import { Hono } from 'hono'

import type { AppBindings } from '../types'

export const healthRoutes = new Hono<AppBindings>()

healthRoutes.get('/', (c) =>
  c.json({
    ok: true,
    service: 'hono-short-link-do',
  }),
)

