import { Hono } from 'hono'
import type { Context, Env as HonoEnv, MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type {
  DoorConfig,
  ShortLinkArchivedLink,
  ShortLinkArchiveSearchInput,
  ShortLinkDeletedLink,
  ShortLinkIssuePolicyInput,
  ShortLinkIssuedLink,
  ShortLinkIssueLinkInput,
  ShortLinkOperationResult,
  ShortLinkReissuedLink,
} from './types'
import type { PublicLinkIssuePolicy, PublicLinkTokenSummary } from './durable-objects/public-link'
import type { RegistryArchiveLinkCandidate, RegistryArchiveLinkDetail, RegistryLinkSummary } from './durable-objects/registry'
import { parseJson, resolve } from './utils'

type CreateAdminApiOptions<T extends HonoEnv> = {
  config: DoorConfig<T>
  adminAuth: MiddlewareHandler<T>
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
}

const issueTokenSchema = z.object({
  ttl: z.union([z.string().min(1), z.number().int().positive()]).default('1h'),
  label: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  maxUses: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
})

const issuePolicySchema = z.object({
  ttl: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  label: z.string().min(1).nullable().optional(),
  maxUses: z.union([z.number().int().positive(), z.string().min(1)]).nullable().optional(),
})

const switchRoomSchema = z.object({
  roomId: z.string().min(1),
})

const roomSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
})

const revokeSchema = z.object({
  tokenHash: z.string().min(32),
})

export function createAdminApi<T extends HonoEnv>({
  config,
  adminAuth,
  issueLink,
  listLinks,
  listArchivedLinks,
  getArchivedLink,
  listLinkTokens,
  revokeLinkToken,
  getIssuePolicy,
  updateIssuePolicy,
  reissueLink,
  archiveLink,
  deleteArchivedLink,
}: CreateAdminApiOptions<T>): Hono<T> {
  const routes = new Hono<T>()

  routes.use('/links', adminAuth)
  routes.use('/links/*', adminAuth)
  routes.use('/rooms/*', adminAuth)

  routes.get('/links', async (c) => {
    const result = await listLinks(c)
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.get('/links/archive', async (c) => {
    const input: ShortLinkArchiveSearchInput = {}
    const q = c.req.query('q')?.trim()
    if (q) input.q = q
    const result = await listArchivedLinks(c, input)
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.get('/links/archive/:linkId', async (c) => {
    const result = await getArchivedLink(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.delete('/links/archive/:linkId', async (c) => {
    const result = await deleteArchivedLink(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.get('/links/:linkId', async (c) => {
    const link = resolve(config.publicLinks, c).getByName(c.req.param('linkId'))
    return c.json(await link.getStatus())
  })

  routes.get('/links/:linkId/tokens', async (c) => {
    const result = await listLinkTokens(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.get('/links/:linkId/issue-policy', async (c) => {
    const result = await getIssuePolicy(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.put('/links/:linkId/issue-policy', async (c) => {
    const body = await parseJson(c, issuePolicySchema)
    if (!body.ok) return body.response

    const result = await updateIssuePolicy(c, c.req.param('linkId'), body.value)
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.post('/links/:linkId/reissue', async (c) => {
    const result = await reissueLink(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.post('/links/:linkId/archive', async (c) => {
    const result = await archiveLink(c, c.req.param('linkId'))
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json(result.value)
  })

  routes.post('/links/:linkId/tokens', async (c) => {
    const body = await parseJson(c, issueTokenSchema)
    if (!body.ok) return body.response

    const result = await issueLink(c, {
      linkId: c.req.param('linkId'),
      ttl: body.value.ttl,
      roomId: body.value.roomId,
      label: body.value.label,
      maxUses: body.value.maxUses,
    })
    if (!result.ok) {
      return c.json({ error: result.error }, result.status)
    }

    return c.json({
      url: result.value.url,
      token: result.value.token,
      tokenHash: result.value.tokenHash,
      expiresAt: result.value.expiresAt,
      roomId: result.value.roomId,
    })
  })

  routes.post('/links/:linkId/switch-room', async (c) => {
    const body = await parseJson(c, switchRoomSchema)
    if (!body.ok) return body.response

    const linkId = c.req.param('linkId')
    const registry = resolve(config.registry, c).getByName('default')
    const usage = await registry.findRoomLinkIds(body.value.roomId)
    const conflictingLinkId = usage.linkIds.find((candidate) => candidate !== linkId)
    if (conflictingLinkId !== undefined) {
      return c.json(
        { error: `roomId "${body.value.roomId}" is already used by link "${conflictingLinkId}". Use a unique roomId.` },
        409,
      )
    }

    const link = resolve(config.publicLinks, c).getByName(linkId)
    const result = await link.switchRoom(body.value.roomId)
    await registry.recordLinkRoomSwitch(linkId, body.value.roomId)

    return c.json(result)
  })

  routes.post('/links/:linkId/revoke', async (c) => {
    const body = await parseJson(c, revokeSchema)
    if (!body.ok) return body.response

    const result = await revokeLinkToken(c, c.req.param('linkId'), body.value.tokenHash)
    if (!result.ok) {
      return c.json({ error: result.error }, result.status)
    }

    return c.json(result.value)
  })

  routes.post('/rooms/:roomId', async (c) => {
    const body = await parseJson(c, roomSchema)
    if (!body.ok) return body.response

    const room = resolve(config.rooms, c).getByName(c.req.param('roomId'))
    const input: { title?: string; body?: string } = {}
    if (body.value.title !== undefined) input.title = body.value.title
    if (body.value.body !== undefined) input.body = body.value.body

    const result = await room.setState(input)
    await resolve(config.registry, c).getByName('default').recordRoomSet(c.req.param('roomId'), input)

    return c.json(result)
  })

  return routes
}
