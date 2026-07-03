import type { Context, Env as HonoEnv, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { constantTimeEqual } from './services/token'
import type {
  DoorConfig,
  ShortLinkContext,
  ShortLinkProtectOptions,
} from './types'
import { bearerToken, resolve, setVariable } from './utils'

export function createProtect<T extends HonoEnv>(
  config: DoorConfig<T>,
): (options?: ShortLinkProtectOptions) => MiddlewareHandler<T> {
  return (protectOptions: ShortLinkProtectOptions = {}) => {
    const redirectQueryToken = protectOptions.redirectQueryToken ?? true
    const linkIdParam = protectOptions.linkIdParam ?? 'linkId'

    return async (c, next) => {
      const linkId = c.req.param(linkIdParam)
      if (!linkId) {
        return c.text('Link ID is required.', 400)
      }

      const tokenFromQuery = c.req.query(config.tokenQueryParam)
      const tokenFromHeader = bearerToken(c.req.header('Authorization'))
      const tokenFromCookie = getCookie(c, config.cookieName)
      const token = tokenFromHeader ?? tokenFromQuery ?? tokenFromCookie
      const tokenSource = tokenFromHeader
        ? 'header'
        : tokenFromQuery
          ? 'query'
          : tokenFromCookie
            ? 'cookie'
            : undefined
      const requestPath = new URL(c.req.url).pathname

      c.header('Cache-Control', 'no-store')
      c.header('Referrer-Policy', 'no-referrer')
      c.header('X-Robots-Tag', 'noindex')

      if (!token || !tokenSource) {
        deleteCookie(c, config.cookieName, { path: requestPath })
        return c.text('Token required.', 401)
      }

      const publicLinks = resolve(config.publicLinks, c)
      const link = publicLinks.getByName(linkId)
      const consume = !(tokenSource === 'query' && redirectQueryToken)
      const access = await link.verifyToken(token, { consume })

      setVariable(c, 'publicLinkAccess', access)

      if (!access.ok) {
        deleteCookie(c, config.cookieName, { path: requestPath })
        return c.text(access.reason, access.status)
      }

      if (tokenSource === 'query' && redirectQueryToken) {
        const maxAge = Math.max(0, Math.floor((access.expiresAt - Date.now()) / 1000))
        setCookie(c, config.cookieName, token, {
          path: requestPath,
          httpOnly: true,
          secure: cookieSecure(config, c),
          sameSite: 'Lax',
          maxAge,
        })
        return c.redirect(requestPath, 302)
      }

      const room = resolve(config.rooms, c).getByName(access.roomId)
      const state = await room.getState()

      setVariable(c, 'shortLink', {
        linkId,
        tokenHash: access.tokenHash,
        label: access.label,
        role: access.role,
        expiresAt: access.expiresAt,
        roomId: access.roomId,
        room: state,
        tokenSource,
      } satisfies ShortLinkContext)

      await next()
    }
  }
}

export function createAdminAuth<T extends HonoEnv>(config: DoorConfig<T>): MiddlewareHandler<T> {
  return async (c, next) => {
    const configuredToken = resolve(config.adminToken, c)
    if (!configuredToken) {
      return c.json({ error: 'ADMIN_API_TOKEN is not configured.' }, 503)
    }

    const actualToken = bearerToken(c.req.header('Authorization')) ?? ''
    if (!actualToken || !(await constantTimeEqual(actualToken, configuredToken))) {
      return c.json({ error: 'Unauthorized.' }, 401)
    }

    await next()
  }
}

function cookieSecure<T extends HonoEnv>(config: DoorConfig<T>, c: Context<T>): boolean {
  if (config.cookieSecure !== undefined) {
    return resolve(config.cookieSecure, c)
  }

  return new URL(c.req.url).protocol === 'https:'
}
