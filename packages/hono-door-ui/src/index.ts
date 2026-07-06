import { Hono } from 'hono'
import type { Context, Env as HonoEnv } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { languageDetector } from 'hono/language'
import { z } from 'zod'

import type {
  PublicLinkTokenSummary,
  RegistryArchiveLinkCandidate,
  RegistryArchiveLinkDetail,
  RegistryLinkSummary,
  ShortLinkArchivedLink,
  PublicLinkIssuePolicy,
  ShortLinkArchiveSearchInput,
  ShortLinkDeletedLink,
  ShortLinkIssuePolicyInput,
  ShortLinkIssuedLink,
  ShortLinkIssueLinkInput,
  ShortLinkOperationResult,
  ShortLinkReissuedLink,
} from 'hono-door'
import { adminUiText, resolveAdminUiLocale, type AdminUiLocale } from './i18n'
import {
  generateQrCodeSvg,
  renderAdminArchivePage,
  renderAdminArchivePreviewPage,
  renderAdminLinkListPage,
  renderAdminUiPage,
  type AdminUiResult,
  type AdminUiValues,
} from './admin-ui'
import { adminUiClientJs } from './generated/admin-ui-client'

export type AdminUiArchivePreviewRenderer<T extends HonoEnv> = (context: {
  c: Context<T>
  linkId: string
  room: RegistryArchiveLinkDetail['rooms'][number]
  detail: RegistryArchiveLinkDetail & { tokens: PublicLinkTokenSummary[] }
}) => string | Response | Promise<string | Response>

export type AdminUiOptions<T extends HonoEnv> = {
  renderArchivePreview?: AdminUiArchivePreviewRenderer<T> | undefined
}

export type AdminUiShortLink<T extends HonoEnv> = {
  validateAdminToken(
    c: Context<T>,
    token: string | undefined,
  ): Promise<ShortLinkOperationResult<true>>
  issueLink(
    c: Context<T>,
    input: ShortLinkIssueLinkInput,
  ): Promise<ShortLinkOperationResult<ShortLinkIssuedLink>>
  listLinks(c: Context<T>): Promise<ShortLinkOperationResult<{ links: RegistryLinkSummary[] }>>
  listArchivedLinks(
    c: Context<T>,
    input: ShortLinkArchiveSearchInput,
  ): Promise<ShortLinkOperationResult<{ links: RegistryArchiveLinkCandidate[] }>>
  getArchivedLink(
    c: Context<T>,
    linkId: string,
  ): Promise<ShortLinkOperationResult<RegistryArchiveLinkDetail & { tokens: PublicLinkTokenSummary[] }>>
  listLinkTokens(
    c: Context<T>,
    linkId: string,
  ): Promise<ShortLinkOperationResult<{ tokens: PublicLinkTokenSummary[] }>>
  revokeLinkToken(
    c: Context<T>,
    linkId: string,
    tokenHash: string,
  ): Promise<ShortLinkOperationResult<{ revoked: boolean }>>
  getIssuePolicy(
    c: Context<T>,
    linkId: string,
  ): Promise<ShortLinkOperationResult<PublicLinkIssuePolicy>>
  updateIssuePolicy(
    c: Context<T>,
    linkId: string,
    input: ShortLinkIssuePolicyInput,
  ): Promise<ShortLinkOperationResult<PublicLinkIssuePolicy>>
  reissueLink(
    c: Context<T>,
    linkId: string,
  ): Promise<ShortLinkOperationResult<ShortLinkReissuedLink>>
  archiveLink(
    c: Context<T>,
    linkId: string,
  ): Promise<ShortLinkOperationResult<ShortLinkArchivedLink>>
  deleteArchivedLink(
    c: Context<T>,
    linkId: string,
  ): Promise<ShortLinkOperationResult<ShortLinkDeletedLink>>
  adminSessionSecret(c: Context<T>): Promise<ShortLinkOperationResult<string>>
}

const adminUiSessionCookie = '__hono_door_admin_session'
const adminUiSessionMaxAgeSeconds = 8 * 60 * 60

const adminUiIssueSchema = z.object({
  adminToken: z.string().min(1).optional(),
  linkId: z.string().min(1),
  roomId: z.string().min(1),
  ttl: z.string().default('1h'),
  label: z.string().optional(),
  maxUses: z.string().optional(),
})

const adminUiLoginSchema = z.object({
  adminToken: z.string().min(1),
})

const adminUiIssuePolicySchema = z.object({
  ttl: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  label: z.string().min(1).nullable().optional(),
  maxUses: z.union([z.string().min(1), z.number().int().positive()]).nullable().optional(),
})

const adminUiSessionSchema = z.object({
  exp: z.number().int().positive(),
})

export function createDoorUi<T extends HonoEnv>(
  shortLink: AdminUiShortLink<T>,
  options: AdminUiOptions<T> = {},
): Hono<T> {
  const routes = new Hono<T>()

  routes.use(
    '/ui/*',
    languageDetector({
      supportedLanguages: ['ja', 'en'],
      fallbackLanguage: 'ja',
      convertDetectedLanguage: (language) => language.split('-')[0] ?? language,
      cookieOptions: {
        path: '/admin/ui',
        sameSite: 'Lax',
        httpOnly: true,
        secure: false,
        maxAge: 365 * 24 * 60 * 60,
      },
    }),
  )

  routes.get('/ui/client.js', () =>
    new Response(adminUiClientJs, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }),
  )
  routes.post('/ui/api/session', async (c) => {
    const body = await parseJson(c, adminUiLoginSchema)
    if (!body.ok) return body.response

    const tokenValidation = await shortLink.validateAdminToken(c, body.value.adminToken)
    if (!tokenValidation.ok) {
      return c.json({ error: tokenValidation.error }, tokenValidation.status)
    }

    const secret = await shortLink.adminSessionSecret(c)
    if (!secret.ok) return c.json({ error: secret.error }, secret.status)

    await setAdminSessionCookie(c, secret.value)
    return c.json({ authenticated: true })
  })

  routes.get('/ui/api/session', async (c) => {
    const session = await readAdminSession(c, shortLink)
    return c.json({ authenticated: session.ok })
  })

  routes.delete('/ui/api/session', (c) => {
    clearAdminSessionCookie(c)
    return c.json({ authenticated: false })
  })

  routes.get('/ui/api/links', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const result = await shortLink.listLinks(c)
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.get('/ui/api/links/archive', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const input: ShortLinkArchiveSearchInput = {}
    const q = c.req.query('q')?.trim()
    if (q) input.q = q
    const result = await shortLink.listArchivedLinks(c, input)
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.get('/ui/api/links/archive/:linkId', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const result = await shortLink.getArchivedLink(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.delete('/ui/api/links/archive/:linkId', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const result = await shortLink.deleteArchivedLink(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.get('/ui/api/links/:linkId/tokens', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const result = await shortLink.listLinkTokens(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.get('/ui/api/links/:linkId/issue-policy', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const result = await shortLink.getIssuePolicy(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.put('/ui/api/links/:linkId/issue-policy', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const body = await parseJson(c, adminUiIssuePolicySchema)
    if (!body.ok) return body.response

    const result = await shortLink.updateIssuePolicy(c, c.req.param('linkId'), body.value)
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.post('/ui/api/links/:linkId/reissue', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const linkId = c.req.param('linkId')
    const json = await c.req.json().catch(() => undefined)
    if (json !== undefined) {
      const body = adminUiIssuePolicySchema.safeParse(json)
      if (!body.success) {
        return c.json({ error: adminUiText[getAdminUiLocale(c)].requiredFieldsInvalid }, 400)
      }

      const update = await shortLink.updateIssuePolicy(c, linkId, body.data)
      if (!update.ok) return c.json({ error: update.error }, update.status)
    }

    const result = await shortLink.reissueLink(c, linkId)
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json({
      ...result.value,
      qrSvg: generateQrCodeSvg(result.value.url),
    })
  })

  routes.post('/ui/api/links/:linkId/archive', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const result = await shortLink.archiveLink(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.post('/ui/api/links/:linkId/tokens/:tokenHash/revoke', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.json({ error: session.error }, session.status)

    const linkId = c.req.param('linkId')
    const tokenHash = c.req.param('tokenHash')
    if (tokenHash.length < 32) {
      return c.json({ error: adminUiText[getAdminUiLocale(c)].requiredFieldsInvalid }, 400)
    }

    const result = await shortLink.revokeLinkToken(c, linkId, tokenHash)
    if (!result.ok) return c.json({ error: result.error }, result.status)

    return c.json(result.value)
  })

  routes.get('/ui/links', async (c) => {
    const session = await readAdminSession(c, shortLink)
    return c.html(renderAdminLinkListPage({ authenticated: session.ok, locale: getAdminUiLocale(c) }))
  })
  routes.get('/ui/archive', async (c) => {
    const session = await readAdminSession(c, shortLink)
    return c.html(renderAdminArchivePage({ authenticated: session.ok, locale: getAdminUiLocale(c) }))
  })
  routes.get('/ui/archive/:linkId/rooms/:roomId/preview', async (c) => {
    const session = await readAdminSession(c, shortLink)
    if (!session.ok) return c.text(session.error, session.status)

    const linkId = c.req.param('linkId')
    const roomId = c.req.param('roomId')
    const result = await shortLink.getArchivedLink(c, linkId)
    if (!result.ok) return c.text(result.error, result.status)

    const room = result.value.rooms.find((candidate) => candidate.roomId === roomId)
    if (!room) return c.text('Archived room not found.', 404)

    if (options.renderArchivePreview) {
      const rendered = await options.renderArchivePreview({
        c,
        linkId,
        room,
        detail: result.value,
      })
      return rendered instanceof Response ? rendered : c.html(rendered)
    }

    return c.html(renderAdminArchivePreviewPage({ linkId, room }))
  })
  routes.get('/ui', async (c) => {
    const session = await readAdminSession(c, shortLink)
    return c.html(renderAdminUiPage({ authenticated: session.ok, locale: getAdminUiLocale(c) }))
  })

  routes.post('/ui', async (c) => {
    const locale = getAdminUiLocale(c)
    const body = await parseForm(c, locale)
    if (!body.ok) {
      return c.html(renderAdminUiPage({ values: body.values, error: body.error, locale }), 400)
    }

    const values = body.value
    let authenticated = (await readAdminSession(c, shortLink)).ok
    if (!authenticated) {
      const tokenValidation = await shortLink.validateAdminToken(c, values.adminToken)
      if (!tokenValidation.ok) {
        return c.html(
          renderAdminUiPage({
            authenticated: false,
            values: scrubAdminToken(values),
            error: tokenValidation.error,
            locale,
          }),
          tokenValidation.status,
        )
      }

      const secret = await shortLink.adminSessionSecret(c)
      if (!secret.ok) {
        return c.html(
          renderAdminUiPage({
            authenticated: false,
            values: scrubAdminToken(values),
            error: secret.error,
            locale,
          }),
          secret.status,
        )
      }

      await setAdminSessionCookie(c, secret.value)
      authenticated = true
    }

    const result = await shortLink.issueLink(c, {
      linkId: values.linkId,
      roomId: values.roomId,
      ttl: values.ttl,
      label: values.label,
      maxUses: values.maxUses,
    })
    if (!result.ok) {
      return c.html(
        renderAdminUiPage({
          authenticated,
          values: scrubAdminToken(values),
          error: result.error,
          locale,
        }),
        result.status,
      )
    }

    return c.html(
      renderAdminUiPage({
        authenticated,
        values: scrubAdminToken(values),
        result: toAdminUiResult(result.value),
        locale,
      }),
    )
  })

  return routes
}

function getAdminUiLocale<T extends HonoEnv>(c: Context<T>): AdminUiLocale {
  const language = (c as unknown as { get(key: 'language'): unknown }).get('language')
  return resolveAdminUiLocale(language)
}

async function parseJson<T extends HonoEnv, Schema extends z.ZodType>(
  c: Context<T>,
  schema: Schema,
): Promise<
  | { ok: true; value: z.infer<Schema> }
  | { ok: false; response: Response }
> {
  const json = await c.req.json().catch(() => undefined)
  const result = schema.safeParse(json)

  if (!result.success) {
    const t = adminUiText[getAdminUiLocale(c)]
    return {
      ok: false,
      response: c.json({ error: t.requiredFieldsInvalid }, 400),
    }
  }

  return { ok: true, value: result.data }
}

async function readAdminSession<T extends HonoEnv>(
  c: Context<T>,
  shortLink: AdminUiShortLink<T>,
): Promise<ShortLinkOperationResult<true>> {
  const secret = await shortLink.adminSessionSecret(c)
  if (!secret.ok) {
    clearAdminSessionCookie(c)
    return { ok: false, status: secret.status, error: secret.error }
  }

  const value = await getSignedCookie(c, secret.value, adminUiSessionCookie)
  if (typeof value !== 'string') {
    clearAdminSessionCookie(c)
    return { ok: false, status: 401, error: 'Admin session required.' }
  }

  const session = parseAdminSession(value)
  if (!session.ok || session.value.exp <= Date.now()) {
    clearAdminSessionCookie(c)
    return { ok: false, status: 401, error: 'Admin session expired.' }
  }

  return { ok: true, value: true }
}

function parseAdminSession(
  value: string,
): { ok: true; value: z.infer<typeof adminUiSessionSchema> } | { ok: false } {
  try {
    const json = JSON.parse(value)
    const result = adminUiSessionSchema.safeParse(json)
    if (!result.success) return { ok: false }
    return { ok: true, value: result.data }
  } catch {
    return { ok: false }
  }
}

async function setAdminSessionCookie<T extends HonoEnv>(
  c: Context<T>,
  secret: string,
): Promise<void> {
  await setSignedCookie(
    c,
    adminUiSessionCookie,
    JSON.stringify({ exp: Date.now() + adminUiSessionMaxAgeSeconds * 1000 }),
    secret,
    {
      path: '/admin/ui',
      httpOnly: true,
      secure: isHttps(c),
      sameSite: 'Lax',
      maxAge: adminUiSessionMaxAgeSeconds,
    },
  )
}

function clearAdminSessionCookie<T extends HonoEnv>(c: Context<T>): void {
  deleteCookie(c, adminUiSessionCookie, {
    path: '/admin/ui',
    secure: isHttps(c),
    sameSite: 'Lax',
  })
}

function isHttps<T extends HonoEnv>(c: Context<T>): boolean {
  return new URL(c.req.url).protocol === 'https:'
}

async function parseForm<T extends HonoEnv>(
  c: Context<T>,
  locale: AdminUiLocale,
): Promise<
  | { ok: true; value: z.infer<typeof adminUiIssueSchema> }
  | { ok: false; values: AdminUiValues; error: string }
> {
  const body = await c.req.parseBody().catch(() => undefined)
  const values = formValues(body)
  const result = adminUiIssueSchema.safeParse(values)

  if (!result.success) {
    return {
      ok: false,
      values,
      error: adminUiText[locale].requiredFieldsInvalid,
    }
  }

  return { ok: true, value: result.data }
}

function formValues(body: Record<string, unknown> | undefined): AdminUiValues {
  return {
    adminToken: formString(body, 'adminToken'),
    linkId: formString(body, 'linkId'),
    roomId: formString(body, 'roomId'),
    ttl: formString(body, 'ttl') || '1h',
    label: formString(body, 'label'),
    maxUses: formString(body, 'maxUses'),
  }
}

function formString(
  body: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = body?.[key]
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function scrubAdminToken<T extends AdminUiValues>(values: T): AdminUiValues {
  return {
    linkId: values.linkId,
    roomId: values.roomId,
    ttl: values.ttl,
    label: values.label,
    maxUses: values.maxUses,
  }
}

function toAdminUiResult(result: ShortLinkIssuedLink): AdminUiResult {
  return {
    linkId: result.linkId,
    url: result.url,
    expiresAt: result.expiresAt,
    roomId: result.roomId,
    tokenHash: result.tokenHash,
    qrSvg: generateQrCodeSvg(result.url),
  }
}

export {
  generateQrCodeSvg,
  renderAdminLinkListPage,
  renderAdminUiPage,
}
export type { AdminUiPageInput, AdminUiResult, AdminUiValues } from './admin-ui'
