import { Hono } from 'hono'
import type { Context, Env as HonoEnv, MiddlewareHandler } from 'hono'

import type { ShortLinkContext, ShortLinkPageRenderer } from './types'

export function createPublicRoutes<T extends HonoEnv>(
  protect: () => MiddlewareHandler<T>,
  renderer: ShortLinkPageRenderer<T>,
): Hono<T> {
  const routes = new Hono<T>()

  routes.get('/:linkId', protect(), async (c) => {
    const html = await renderer({
      c: c as unknown as Context<T>,
      link: (c.get as (key: string) => unknown)('shortLink') as ShortLinkContext,
    })
    return c.html(html)
  })

  return routes
}
