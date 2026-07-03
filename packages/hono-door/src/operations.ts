import type { Context, Env as HonoEnv } from 'hono'

import type {
  IssueTokenInput,
  PublicLinkIssuePolicy,
  PublicLinkStatus,
  PublicLinkTokenSummary,
} from './durable-objects/public-link'
import type { RegistryArchiveLinkCandidate, RegistryArchiveLinkDetail, RegistryLinkSummary } from './durable-objects/registry'
import { constantTimeEqual } from './services/token'
import type {
  DoorConfig,
  ShortLinkArchivedLink,
  ShortLinkArchiveSearchInput,
  ShortLinkIssuePolicyInput,
  ShortLinkIssuedLink,
  ShortLinkIssueLinkInput,
  ShortLinkIssueLinkRoomInput,
  ShortLinkOperationResult,
  ShortLinkReissuedLink,
} from './types'
import { parseDuration, parseOptionalPositiveInteger, publicPathFor, resolve } from './utils'

const ARCHIVE_RESULT_LIMIT = 50
const ARCHIVE_CANDIDATE_BATCH_SIZE = 100

export function createDoorOperations<T extends HonoEnv>(config: DoorConfig<T>) {
  return {
    validateAdminToken(c: Context<T>, token: string | undefined) {
      return validateAdminToken(config, c, token)
    },
    issueLink(c: Context<T>, input: ShortLinkIssueLinkInput) {
      return issueLink(config, c, input)
    },
    listLinks(c: Context<T>) {
      return listLinks(config, c)
    },
    listArchivedLinks(c: Context<T>, input: ShortLinkArchiveSearchInput = {}) {
      return listArchivedLinks(config, c, input)
    },
    getArchivedLink(c: Context<T>, linkId: string) {
      return getArchivedLink(config, c, linkId)
    },
    listLinkTokens(c: Context<T>, linkId: string) {
      return listLinkTokens(config, c, linkId)
    },
    getIssuePolicy(c: Context<T>, linkId: string) {
      return getIssuePolicy(config, c, linkId)
    },
    updateIssuePolicy(c: Context<T>, linkId: string, input: ShortLinkIssuePolicyInput) {
      return updateIssuePolicy(config, c, linkId, input)
    },
    reissueLink(c: Context<T>, linkId: string) {
      return reissueLink(config, c, linkId)
    },
    archiveLink(c: Context<T>, linkId: string) {
      return archiveLink(config, c, linkId)
    },
    adminSessionSecret(c: Context<T>) {
      return adminSessionSecret(config, c)
    },
  }
}

async function adminSessionSecret<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
): Promise<ShortLinkOperationResult<string>> {
  const configuredToken = resolve(config.adminToken, c)
  if (!configuredToken) {
    return { ok: false, status: 503, error: 'ADMIN_API_TOKEN is not configured.' }
  }

  return { ok: true, value: configuredToken }
}

async function validateAdminToken<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  token: string | undefined,
): Promise<ShortLinkOperationResult<true>> {
  const configuredToken = resolve(config.adminToken, c)
  if (!configuredToken) {
    return { ok: false, status: 503, error: 'ADMIN_API_TOKEN is not configured.' }
  }

  if (!token || !(await constantTimeEqual(token, configuredToken))) {
    return { ok: false, status: 401, error: 'Invalid admin token.' }
  }

  return { ok: true, value: true }
}

async function issueLink<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  input: ShortLinkIssueLinkInput,
): Promise<ShortLinkOperationResult<ShortLinkIssuedLink>> {
  const ttlSeconds = parseIssueLinkTtl(input.ttl)
  if (!ttlSeconds.ok) {
    return { ok: false, status: 400, error: ttlSeconds.error }
  }

  const maxUses = parseOptionalPositiveInteger(input.maxUses)
  if (!maxUses.ok) {
    return { ok: false, status: 400, error: maxUses.error }
  }

  const room = normalizeRoomInput(input.room)
  const roomId = room.id ?? input.roomId

  if (roomId !== undefined) {
    const roomInput: { title?: string; body?: string } = {}
    const title = room.title ?? input.title
    const body = room.body ?? input.body
    if (title) roomInput.title = title
    if (body) roomInput.body = body
    if (roomInput.title !== undefined || roomInput.body !== undefined) {
      const roomObject = resolve(config.rooms, c).getByName(roomId)
      const state = await roomObject.setState(roomInput)
      await recordRoomSnapshot(config, c, roomId, { title: state.title, body: state.body })
    } else {
      await recordRoomSnapshot(config, c, roomId)
    }
  }

  const role = input.role ?? 'viewer'
  const tokenInput: IssueTokenInput = {
    ttlSeconds: ttlSeconds.value,
    role,
  }
  if (roomId !== undefined) tokenInput.roomId = roomId
  if (input.label !== undefined) tokenInput.label = input.label
  if (maxUses.value !== undefined) tokenInput.maxUses = maxUses.value

  const result = await resolve(config.publicLinks, c).getByName(input.linkId).issueToken(tokenInput)
  const registryInput = {
    linkId: input.linkId,
    tokenHash: result.tokenHash,
    role,
    roomId: result.roomId,
    createdAt: result.createdAt,
    expiresAt: result.expiresAt,
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(maxUses.value !== undefined ? { maxUses: maxUses.value } : {}),
  }
  await resolve(config.registry, c).getByName('default').recordTokenIssued(registryInput)

  const url = new URL(publicPathFor(config.publicPath, input.linkId), publicBaseUrl(config, c))
  url.searchParams.set(config.tokenQueryParam, result.rawToken)

  return {
    ok: true,
    value: issuedLink(input.linkId, url.toString(), result),
  }
}

async function listLinks<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
): Promise<ShortLinkOperationResult<{ links: RegistryLinkSummary[] }>> {
  const registry = resolve(config.registry, c).getByName('default')
  const publicLinks = resolve(config.publicLinks, c)
  const candidates = await registry.listLinks()
  const links = await Promise.all(
    candidates.links.map(async (candidate) => {
      const status = await publicLinks.getByName(candidate.linkId).getStatus()
      if (!activeListedStatus(status)) return undefined
      return {
        ...candidate,
        currentRoomId: status.currentRoomId,
        activeTokenCount: status.activeTokenCount,
        latestIssuedAt: status.latestIssuedAt,
        latestExpiresAt: status.latestExpiresAt,
      }
    }),
  )

  return {
    ok: true,
    value: {
      links: links
        .filter((link): link is RegistryLinkSummary => link !== undefined)
        .sort((a, b) => a.latestExpiresAt.localeCompare(b.latestExpiresAt) || a.linkId.localeCompare(b.linkId)),
    },
  }
}

async function listLinkTokens<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  linkId: string,
): Promise<ShortLinkOperationResult<{ tokens: PublicLinkTokenSummary[] }>> {
  const link = resolve(config.publicLinks, c).getByName(linkId)
  return { ok: true, value: await link.listActiveTokens() }
}

async function listArchivedLinks<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  input: ShortLinkArchiveSearchInput,
): Promise<ShortLinkOperationResult<{ links: RegistryArchiveLinkCandidate[] }>> {
  const registry = resolve(config.registry, c).getByName('default')
  const publicLinks = resolve(config.publicLinks, c)

  const links: RegistryArchiveLinkCandidate[] = []
  let offset = 0

  while (links.length < ARCHIVE_RESULT_LIMIT) {
    const candidates = await registry.listArchiveCandidates({
      q: input.q,
      limit: ARCHIVE_CANDIDATE_BATCH_SIZE,
      offset,
    })
    if (candidates.links.length === 0) break

    const inactiveLinks = await Promise.all(
      candidates.links.map(async (candidate) => {
        const status = await publicLinks.getByName(candidate.linkId).getStatus()
        if (status.activeTokenCount > 0) return undefined
        return {
          ...candidate,
          currentRoomId: status.currentRoomId,
        }
      }),
    )

    for (const link of inactiveLinks) {
      if (link === undefined) continue
      links.push(link)
      if (links.length >= ARCHIVE_RESULT_LIMIT) break
    }

    offset += candidates.links.length
    if (candidates.links.length < ARCHIVE_CANDIDATE_BATCH_SIZE) break
  }

  return {
    ok: true,
    value: {
      links,
    },
  }
}

async function getArchivedLink<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  linkId: string,
): Promise<ShortLinkOperationResult<RegistryArchiveLinkDetail & { tokens: PublicLinkTokenSummary[] }>> {
  const registry = resolve(config.registry, c).getByName('default')
  const detail = await registry.getArchiveLink(linkId)
  if (!detail) {
    return { ok: false, status: 404, error: 'Link not found.' }
  }

  const link = resolve(config.publicLinks, c).getByName(linkId)
  const [status, tokenResult] = await Promise.all([link.getStatus(), link.listTokens()])
  if (status.activeTokenCount > 0) {
    return { ok: false, status: 409, error: 'Link is active.' }
  }

  return {
    ok: true,
    value: {
      ...detail,
      currentRoomId: status.currentRoomId,
      tokens: tokenResult.tokens,
    },
  }
}

async function getIssuePolicy<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  linkId: string,
): Promise<ShortLinkOperationResult<PublicLinkIssuePolicy>> {
  const link = resolve(config.publicLinks, c).getByName(linkId)
  return { ok: true, value: await link.getIssuePolicy() }
}

async function updateIssuePolicy<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  linkId: string,
  input: ShortLinkIssuePolicyInput,
): Promise<ShortLinkOperationResult<PublicLinkIssuePolicy>> {
  const link = resolve(config.publicLinks, c).getByName(linkId)
  const current = await link.getIssuePolicy()
  const policy = parseIssuePolicyInput(input, current)
  if (!policy.ok) {
    return { ok: false, status: 400, error: policy.error }
  }

  return { ok: true, value: await link.setIssuePolicy(policy.value) }
}

async function reissueLink<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  linkId: string,
): Promise<ShortLinkOperationResult<ShortLinkReissuedLink>> {
  const link = resolve(config.publicLinks, c).getByName(linkId)
  const status = await link.getStatus()
  if (!status.exists) {
    return { ok: false, status: 404, error: 'Link not found.' }
  }

  const result = await link.reissueToken()
  const policy = result.issuePolicy
  const registryInput = {
    linkId,
    tokenHash: result.tokenHash,
    role: policy.role,
    roomId: result.roomId,
    createdAt: result.createdAt,
    expiresAt: result.expiresAt,
    ...(policy.label !== undefined ? { label: policy.label } : {}),
    ...(policy.maxUses !== undefined ? { maxUses: policy.maxUses } : {}),
  }
  await recordRoomSnapshot(config, c, result.roomId)
  await resolve(config.registry, c).getByName('default').recordTokenIssued(registryInput)

  const url = new URL(publicPathFor(config.publicPath, linkId), publicBaseUrl(config, c))
  url.searchParams.set(config.tokenQueryParam, result.rawToken)

  return {
    ok: true,
    value: {
      ...issuedLink(linkId, url.toString(), result),
      reissued: true,
      revokedTokenCount: result.revokedTokenCount,
    },
  }
}

async function recordRoomSnapshot<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  roomId: string,
  stateInput?: { title: string; body: string },
) {
  const state = stateInput ?? await resolve(config.rooms, c).getByName(roomId).getState()
  await resolve(config.registry, c).getByName('default').recordRoomSet(roomId, {
    title: state.title,
    body: state.body,
  })
}

async function archiveLink<T extends HonoEnv>(
  config: DoorConfig<T>,
  c: Context<T>,
  linkId: string,
): Promise<ShortLinkOperationResult<ShortLinkArchivedLink>> {
  const link = resolve(config.publicLinks, c).getByName(linkId)
  const status = await link.getStatus()
  if (!status.exists) {
    return { ok: false, status: 404, error: 'Link not found.' }
  }

  const result = await link.revokeActiveTokens()
  await resolve(config.registry, c).getByName('default').recordActiveTokensRevoked(linkId)

  return {
    ok: true,
    value: {
      linkId,
      archived: true,
      revokedTokenCount: result.revokedTokenCount,
    },
  }
}

function activeListedStatus(
  status: PublicLinkStatus,
): status is PublicLinkStatus & {
  latestIssuedAt: string
  latestExpiresAt: string
} {
  return status.activeTokenCount > 0 && status.latestIssuedAt !== undefined && status.latestExpiresAt !== undefined
}

function parseIssuePolicyInput(
  input: ShortLinkIssuePolicyInput,
  current: PublicLinkIssuePolicy,
): { ok: true; value: PublicLinkIssuePolicy } | { ok: false; error: string } {
  const ttlSeconds =
    input.ttl === undefined ? { ok: true as const, value: current.ttlSeconds } : parseIssueLinkTtl(input.ttl)
  if (!ttlSeconds.ok) {
    return { ok: false, error: ttlSeconds.error }
  }

  const maxUses =
    input.maxUses === undefined
      ? { ok: true as const, value: current.maxUses }
      : input.maxUses === null
        ? { ok: true as const, value: undefined }
        : parseOptionalPositiveInteger(input.maxUses)
  if (!maxUses.ok) {
    return { ok: false, error: maxUses.error }
  }

  const policy: PublicLinkIssuePolicy = {
    ttlSeconds: ttlSeconds.value,
    role: input.role ?? current.role,
  }
  const label = input.label === undefined ? current.label : input.label
  if (label) policy.label = label
  if (maxUses.value !== undefined) policy.maxUses = maxUses.value

  return { ok: true, value: policy }
}

function issuedLink(
  linkId: string,
  url: string,
  result: {
    rawToken: string
    tokenHash: string
    expiresAt: number
    roomId: string
  },
): ShortLinkIssuedLink {
  return {
    linkId,
    url,
    token: result.rawToken,
    tokenHash: result.tokenHash,
    expiresAt: new Date(result.expiresAt).toISOString(),
    roomId: result.roomId,
  }
}

function parseIssueLinkTtl(
  input: string | number | undefined,
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof input === 'number') {
    if (!Number.isSafeInteger(input) || input <= 0) {
      return { ok: false, error: 'TTL must be a positive integer number of seconds.' }
    }

    return { ok: true, value: input }
  }

  return parseDuration(input ?? '1h')
}

function normalizeRoomInput(
  input: ShortLinkIssueLinkRoomInput | undefined,
): { id?: string | undefined; title?: string | undefined; body?: string | undefined } {
  if (typeof input === 'string') {
    return { id: input }
  }

  if (input === undefined) {
    return {}
  }

  return input
}

function publicBaseUrl<T extends HonoEnv>(config: DoorConfig<T>, c: Context<T>): string {
  return resolve(config.publicBaseUrl, c) ?? new URL(c.req.url).origin
}
