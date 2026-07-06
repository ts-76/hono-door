import { DurableObject } from 'cloudflare:workers'

import { generateRawToken, hashToken } from '../services/token'
import { addColumnIfMissing, runSqlMigrations, type SqlMigration } from './sql-migrations'

const CURRENT_ROOM_KEY = 'current_room_id'
const ISSUE_POLICY_KEY = 'issue_policy'
const DEFAULT_ROOM_ID = 'default'
const DEFAULT_TTL_SECONDS = 60 * 60

export type IssueTokenInput = {
  ttlSeconds: number
  label?: string
  roomId?: string
  maxUses?: number
}

export type PublicLinkIssuePolicy = {
  ttlSeconds: number
  label?: string | undefined
  maxUses?: number | undefined
}

type PublicLinkIssuePolicyLike = {
  ttlSeconds: number
  label?: string | undefined
  maxUses?: number | undefined
}

export type IssueTokenResult = {
  rawToken: string
  tokenHash: string
  createdAt: number
  expiresAt: number
  roomId: string
}

export type PublicLinkAccess =
  | {
      ok: true
      tokenHash: string
      label?: string | undefined
      expiresAt: number
      roomId: string
    }
  | {
      ok: false
      status: 401 | 403
      reason: string
    }

export type VerifyTokenOptions = {
  consume?: boolean
}

export type PublicLinkTokenSummary = {
  tokenHash: string
  label?: string | undefined
  roomId: string
  createdAt: string
  expiresAt: string
  revokedAt?: string | undefined
  maxUses?: number | undefined
  useCount: number
  ttlSeconds?: number | undefined
  state?: PublicLinkTokenState | undefined
}

export type PublicLinkTokenState = 'active' | 'expired' | 'revoked' | 'max_uses_reached'

export type PublicLinkStatus = {
  exists: boolean
  currentRoomId: string
  activeTokenCount: number
  latestIssuedAt?: string | undefined
  latestExpiresAt?: string | undefined
}

type TokenRow = {
  token_hash: string
  label: string | null
  expires_at: number
  revoked_at: number | null
  max_uses: number | null
  use_count: number
}

type TokenSummaryRow = {
  token_hash: string
  label: string | null
  created_at: number
  expires_at: number
  revoked_at: number | null
  ttl_seconds: number | null
  max_uses: number | null
  use_count: number
}

type TokenStatusRow = {
  count: number
  latest_issued_at: number | null
  latest_expires_at: number | null
}

type SettingRow = {
  value: string
}

const PUBLIC_LINK_MIGRATIONS: SqlMigration[] = [
  {
    id: 1,
    name: 'create_public_link_tables',
    run(storage) {
      storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS link_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
      storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS tokens (
          token_hash TEXT PRIMARY KEY,
          label TEXT,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          revoked_at INTEGER,
          max_uses INTEGER,
          use_count INTEGER NOT NULL DEFAULT 0
        );
      `)
    },
  },
  {
    id: 2,
    name: 'add_token_ttl_seconds',
    run(storage) {
      addColumnIfMissing(
        storage,
        `
          ALTER TABLE tokens ADD COLUMN ttl_seconds INTEGER;
        `,
      )
    },
  },
  {
    id: 3,
    name: 'add_token_expiry_index',
    run(storage) {
      storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);
      `)
    },
  },
]

export class PublicLink extends DurableObject<unknown> {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      runSqlMigrations(this.ctx.storage, PUBLIC_LINK_MIGRATIONS)
    })
  }

  async issueToken(input: IssueTokenInput): Promise<IssueTokenResult> {
    const now = Date.now()
    const rawToken = await generateRawToken()
    const tokenHash = await hashToken(rawToken)
    const expiresAt = now + input.ttlSeconds * 1000
    const roomId = input.roomId ?? this.getCurrentRoomId()
    const policy = normalizeIssuePolicy(input)

    this.ctx.storage.sql.exec(
      `
        INSERT INTO tokens (
          token_hash,
          label,
          created_at,
          expires_at,
          ttl_seconds,
          max_uses
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      tokenHash,
      policy.label ?? null,
      now,
      expiresAt,
      policy.ttlSeconds,
      policy.maxUses ?? null,
    )

    this.setIssuePolicy(policy)
    this.setCurrentRoomId(roomId)
    await this.scheduleCleanup()

    return { rawToken, tokenHash, createdAt: now, expiresAt, roomId }
  }

  async verifyToken(
    rawToken: string,
    options: VerifyTokenOptions = {},
  ): Promise<PublicLinkAccess> {
    const tokenHash = await hashToken(rawToken)
    const row = this.ctx.storage.sql
      .exec<TokenRow>(
        `
          SELECT token_hash, label, expires_at, revoked_at, max_uses, use_count
          FROM tokens
          WHERE token_hash = ?;
        `,
        tokenHash,
      )
      .toArray()[0]

    if (!row) {
      return { ok: false, status: 401, reason: 'Token not found.' }
    }

    const now = Date.now()
    if (row.revoked_at !== null) {
      return { ok: false, status: 403, reason: 'Token was revoked.' }
    }

    if (row.expires_at <= now) {
      return { ok: false, status: 403, reason: 'Token expired.' }
    }

    if (row.max_uses !== null && row.use_count >= row.max_uses) {
      return { ok: false, status: 403, reason: 'Token use limit reached.' }
    }

    if (options.consume ?? true) {
      this.ctx.storage.sql.exec(
        `
          UPDATE tokens
          SET use_count = use_count + 1
          WHERE token_hash = ?;
        `,
        tokenHash,
      )
    }

    return {
      ok: true,
      tokenHash,
      label: row.label ?? undefined,
      expiresAt: row.expires_at,
      roomId: this.getCurrentRoomId(),
    }
  }

  getCurrentRoomId(): string {
    const row = this.ctx.storage.sql
      .exec<SettingRow>(
        `
          SELECT value
          FROM link_settings
          WHERE key = ?;
        `,
        CURRENT_ROOM_KEY,
      )
      .toArray()[0]

    return row?.value ?? DEFAULT_ROOM_ID
  }

  switchRoom(roomId: string): { roomId: string } {
    this.setCurrentRoomId(roomId)
    return { roomId }
  }

  revokeToken(tokenHash: string): { revoked: boolean } {
    const result = this.ctx.storage.sql.exec(
      `
        UPDATE tokens
        SET revoked_at = ?
        WHERE token_hash = ? AND revoked_at IS NULL;
      `,
      Date.now(),
      tokenHash,
    )

    return { revoked: result.rowsWritten > 0 }
  }

  revokeActiveTokens(): { revokedTokenCount: number } {
    const result = this.ctx.storage.sql.exec(
      `
        UPDATE tokens
        SET revoked_at = ?
        WHERE
          revoked_at IS NULL
          AND expires_at > ?
          AND (max_uses IS NULL OR use_count < max_uses);
      `,
      Date.now(),
      Date.now(),
    )

    return { revokedTokenCount: result.rowsWritten }
  }

  async reissueToken(): Promise<
    IssueTokenResult & {
      revokedTokenCount: number
      issuePolicy: PublicLinkIssuePolicy
    }
  > {
    const policy = this.getIssuePolicy()
    const { revokedTokenCount } = this.revokeActiveTokens()
    const input: IssueTokenInput = {
      ttlSeconds: policy.ttlSeconds,
      roomId: this.getCurrentRoomId(),
    }
    if (policy.label !== undefined) input.label = policy.label
    if (policy.maxUses !== undefined) input.maxUses = policy.maxUses

    const result = await this.issueToken(input)

    return { ...result, revokedTokenCount, issuePolicy: policy }
  }

  getStatus(): PublicLinkStatus {
    const now = Date.now()
    const tokenStatus = this.ctx.storage.sql
      .exec<TokenStatusRow>(
        `
          SELECT
            COUNT(*) AS count,
            MAX(created_at) AS latest_issued_at,
            MAX(expires_at) AS latest_expires_at
          FROM tokens
          WHERE
            revoked_at IS NULL
            AND expires_at > ?
            AND (max_uses IS NULL OR use_count < max_uses);
        `,
        now,
      )
      .one()

    const exists =
      this.ctx.storage.sql
        .exec<{ count: number }>(
          `
            SELECT COUNT(*) AS count
            FROM link_settings;
          `,
        )
        .one().count > 0 ||
      this.ctx.storage.sql
        .exec<{ count: number }>(
          `
            SELECT COUNT(*) AS count
            FROM tokens
            LIMIT 1;
          `,
        )
        .one().count > 0

    const status: PublicLinkStatus = {
      exists,
      currentRoomId: this.getCurrentRoomId(),
      activeTokenCount: tokenStatus.count,
    }
    if (tokenStatus.latest_issued_at !== null) {
      status.latestIssuedAt = new Date(tokenStatus.latest_issued_at).toISOString()
    }
    if (tokenStatus.latest_expires_at !== null) {
      status.latestExpiresAt = new Date(tokenStatus.latest_expires_at).toISOString()
    }

    return status
  }

  listActiveTokens(): { tokens: PublicLinkTokenSummary[] } {
    const now = Date.now()
    const roomId = this.getCurrentRoomId()
    const rows = this.ctx.storage.sql
      .exec<TokenSummaryRow>(
        `
          SELECT
            token_hash,
            label,
            created_at,
            expires_at,
            revoked_at,
            ttl_seconds,
            max_uses,
            use_count
          FROM tokens
          WHERE
            revoked_at IS NULL
            AND expires_at > ?
            AND (max_uses IS NULL OR use_count < max_uses)
          ORDER BY expires_at ASC, created_at DESC;
        `,
        now,
      )
      .toArray()

    return {
      tokens: rows.map((row) => ({
        tokenHash: row.token_hash,
        label: row.label ?? undefined,
        roomId,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
        revokedAt: row.revoked_at === null ? undefined : new Date(row.revoked_at).toISOString(),
        maxUses: row.max_uses ?? undefined,
        useCount: row.use_count,
        ttlSeconds:
          row.ttl_seconds ??
          Math.max(1, Math.round((row.expires_at - row.created_at) / 1000)),
        state: tokenState(row, now),
      })),
    }
  }

  listTokens(): { tokens: PublicLinkTokenSummary[] } {
    const now = Date.now()
    const roomId = this.getCurrentRoomId()
    const rows = this.ctx.storage.sql
      .exec<TokenSummaryRow>(
        `
          SELECT
            token_hash,
            label,
            created_at,
            expires_at,
            revoked_at,
            ttl_seconds,
            max_uses,
            use_count
          FROM tokens
          ORDER BY created_at DESC, expires_at DESC;
        `,
      )
      .toArray()

    return {
      tokens: rows.map((row) => ({
        tokenHash: row.token_hash,
        label: row.label ?? undefined,
        roomId,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
        revokedAt: row.revoked_at === null ? undefined : new Date(row.revoked_at).toISOString(),
        maxUses: row.max_uses ?? undefined,
        useCount: row.use_count,
        ttlSeconds:
          row.ttl_seconds ??
          Math.max(1, Math.round((row.expires_at - row.created_at) / 1000)),
        state: tokenState(row, now),
      })),
    }
  }

  getIssuePolicy(): PublicLinkIssuePolicy {
    const stored = this.ctx.storage.sql
      .exec<SettingRow>(
        `
          SELECT value
          FROM link_settings
          WHERE key = ?;
        `,
        ISSUE_POLICY_KEY,
      )
      .toArray()[0]

    if (stored) {
      const parsed = parseIssuePolicy(stored.value)
      if (parsed) return parsed
    }

    return this.fallbackIssuePolicy()
  }

  setIssuePolicy(input: PublicLinkIssuePolicy): PublicLinkIssuePolicy {
    const policy = normalizeIssuePolicy(input)
    this.ctx.storage.sql.exec(
      `
        INSERT INTO link_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      `,
      ISSUE_POLICY_KEY,
      JSON.stringify(policy),
    )

    return policy
  }

  async deleteLinkData(): Promise<{ deleted: true }> {
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec('DELETE FROM tokens;')
      this.ctx.storage.sql.exec('DELETE FROM link_settings;')
    })
    await this.ctx.storage.deleteAlarm()

    return { deleted: true }
  }

  async alarm(): Promise<void> {
    this.cleanupExpiredTokens()
    await this.scheduleCleanup()
  }

  private setCurrentRoomId(roomId: string): void {
    this.ctx.storage.sql.exec(
      `
        INSERT INTO link_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      `,
      CURRENT_ROOM_KEY,
      roomId,
    )
  }

  private fallbackIssuePolicy(): PublicLinkIssuePolicy {
    const row = this.ctx.storage.sql
      .exec<{
        label: string | null
        created_at: number
        expires_at: number
        ttl_seconds: number | null
        max_uses: number | null
      }>(
        `
          SELECT label, created_at, expires_at, ttl_seconds, max_uses
          FROM tokens
          WHERE
            revoked_at IS NULL
            AND expires_at > ?
            AND (max_uses IS NULL OR use_count < max_uses)
          ORDER BY created_at DESC
          LIMIT 1;
        `,
        Date.now(),
      )
      .toArray()[0]

    if (!row) {
      return {
        ttlSeconds: DEFAULT_TTL_SECONDS,
      }
    }

    const input: PublicLinkIssuePolicyLike = {
      ttlSeconds:
        row.ttl_seconds ??
        Math.max(1, Math.round((row.expires_at - row.created_at) / 1000)),
    }
    if (row.label !== null) input.label = row.label
    if (row.max_uses !== null) input.maxUses = row.max_uses
    return normalizeIssuePolicy(input)
  }

  private cleanupExpiredTokens(): void {
    // Keep expired token rows for admin archive analysis.
  }

  private async scheduleCleanup(): Promise<void> {
    const row = this.ctx.storage.sql
      .exec<{ expires_at: number }>(
        `
          SELECT expires_at
          FROM tokens
          WHERE revoked_at IS NULL AND expires_at > ?
          ORDER BY expires_at ASC
          LIMIT 1;
        `,
        Date.now(),
      )
      .toArray()[0]

    if (row) {
      await this.ctx.storage.setAlarm(row.expires_at + 1000)
      return
    }

    await this.ctx.storage.deleteAlarm()
  }
}

function tokenState(
  row: Pick<TokenSummaryRow, 'expires_at' | 'revoked_at' | 'max_uses' | 'use_count'>,
  now: number,
): PublicLinkTokenState {
  if (row.revoked_at !== null) return 'revoked'
  if (row.max_uses !== null && row.use_count >= row.max_uses) return 'max_uses_reached'
  if (row.expires_at <= now) return 'expired'
  return 'active'
}

function normalizeIssuePolicy(input: PublicLinkIssuePolicyLike): PublicLinkIssuePolicy {
  const policy: PublicLinkIssuePolicy = {
    ttlSeconds: input.ttlSeconds,
  }
  if (input.label !== undefined) policy.label = input.label
  if (input.maxUses !== undefined) policy.maxUses = input.maxUses
  return policy
}

function parseIssuePolicy(value: string): PublicLinkIssuePolicy | undefined {
  try {
    const input = JSON.parse(value) as Partial<PublicLinkIssuePolicy>
    const ttlSeconds = input.ttlSeconds
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds === undefined || ttlSeconds <= 0) {
      return undefined
    }
    const policy: PublicLinkIssuePolicyLike = {
      ttlSeconds,
    }
    if (typeof input.label === 'string' && input.label) policy.label = input.label
    const maxUses = input.maxUses
    if (Number.isSafeInteger(maxUses) && maxUses !== undefined && maxUses > 0) {
      policy.maxUses = maxUses
    }
    return normalizeIssuePolicy(policy)
  } catch {
    return undefined
  }
}
