import { DurableObject } from 'cloudflare:workers'

import { runSqlMigrations, type SqlMigration } from './sql-migrations'

export type RegistryLinkSummary = {
  linkId: string
  currentRoomId: string
  activeTokenCount: number
  latestIssuedAt: string
  latestExpiresAt: string
}

export type RegistryArchiveSearchInput = {
  q?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type RegistryArchiveLinkCandidate = {
  linkId: string
  currentRoomId: string
  latestIssuedAt?: string | undefined
  latestExpiresAt?: string | undefined
  tokenCount: number
  latestRoom?: RegistryRoomSnapshot | undefined
}

export type RegistryArchiveLinkDetail = RegistryArchiveLinkCandidate & {
  rooms: RegistryRoomSnapshot[]
}

export type RegistryRoomSnapshot = {
  roomId: string
  title?: string | undefined
  body?: string | undefined
  updatedAt: string
}

export type RegistryRecordTokenIssuedInput = {
  linkId: string
  tokenHash: string
  label?: string | undefined
  role: string
  roomId: string
  createdAt: number
  expiresAt: number
  maxUses?: number | undefined
}

export type RegistryRecordRoomInput = {
  title?: string | undefined
  body?: string | undefined
}

type LinkSummaryRow = {
  link_id: string
  current_room_id: string
  active_token_count: number
  latest_issued_at: number
  latest_expires_at: number
}

type ArchiveLinkRow = {
  link_id: string
  current_room_id: string
  token_count: number
  latest_issued_at: number | null
  latest_expires_at: number | null
  room_title: string | null
  room_body: string | null
  room_updated_at: number | null
}

type RoomSnapshotRow = {
  room_id: string
  title: string | null
  body: string | null
  updated_at: number
}

const REGISTRY_MIGRATIONS: SqlMigration[] = [
  {
    id: 1,
    name: 'create_registry_tables',
    run(storage) {
      storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS links (
          link_id TEXT PRIMARY KEY,
          current_room_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          latest_issued_at INTEGER,
          latest_expires_at INTEGER
        );
      `)
      storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS tokens (
          token_hash TEXT PRIMARY KEY,
          link_id TEXT NOT NULL,
          label TEXT,
          role TEXT NOT NULL,
          room_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          revoked_at INTEGER,
          max_uses INTEGER,
          use_count INTEGER NOT NULL DEFAULT 0
        );
      `)
      storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
          room_id TEXT PRIMARY KEY,
          title TEXT,
          body TEXT,
          updated_at INTEGER NOT NULL
        );
      `)
    },
  },
  {
    id: 2,
    name: 'add_registry_token_indexes',
    run(storage) {
      storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS idx_registry_tokens_link_id ON tokens(link_id);
      `)
      storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS idx_registry_tokens_active ON tokens(revoked_at, expires_at);
      `)
    },
  },
]

export class Registry extends DurableObject<unknown> {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      runSqlMigrations(this.ctx.storage, REGISTRY_MIGRATIONS)
    })
  }

  recordTokenIssued(input: RegistryRecordTokenIssuedInput): { recorded: true } {
    const now = Date.now()
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        `
          INSERT INTO links (
            link_id,
            current_room_id,
            created_at,
            updated_at,
            latest_issued_at,
            latest_expires_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(link_id) DO UPDATE SET
            current_room_id = excluded.current_room_id,
            updated_at = excluded.updated_at,
            latest_issued_at = CASE
              WHEN links.latest_issued_at IS NULL OR excluded.latest_issued_at > links.latest_issued_at
              THEN excluded.latest_issued_at
              ELSE links.latest_issued_at
            END,
            latest_expires_at = CASE
              WHEN links.latest_expires_at IS NULL OR excluded.latest_expires_at > links.latest_expires_at
              THEN excluded.latest_expires_at
              ELSE links.latest_expires_at
            END;
        `,
        input.linkId,
        input.roomId,
        now,
        now,
        input.createdAt,
        input.expiresAt,
      )
      this.ctx.storage.sql.exec(
        `
          INSERT INTO tokens (
            token_hash,
            link_id,
            label,
            role,
            room_id,
            created_at,
            expires_at,
            max_uses,
            use_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
          ON CONFLICT(token_hash) DO UPDATE SET
            link_id = excluded.link_id,
            label = excluded.label,
            role = excluded.role,
            room_id = excluded.room_id,
            created_at = excluded.created_at,
            expires_at = excluded.expires_at,
            revoked_at = NULL,
            max_uses = excluded.max_uses,
            use_count = 0;
        `,
        input.tokenHash,
        input.linkId,
        input.label ?? null,
        input.role,
        input.roomId,
        input.createdAt,
        input.expiresAt,
        input.maxUses ?? null,
      )
    })

    return { recorded: true }
  }

  recordRoomSet(roomId: string, input: RegistryRecordRoomInput): { recorded: true } {
    this.ctx.storage.sql.exec(
      `
        INSERT INTO rooms (room_id, title, body, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(room_id) DO UPDATE SET
          title = COALESCE(excluded.title, rooms.title),
          body = COALESCE(excluded.body, rooms.body),
          updated_at = excluded.updated_at;
      `,
      roomId,
      input.title ?? null,
      input.body ?? null,
      Date.now(),
    )

    return { recorded: true }
  }

  recordLinkRoomSwitch(linkId: string, roomId: string): { recorded: true } {
    const now = Date.now()
    this.ctx.storage.sql.exec(
      `
        INSERT INTO links (link_id, current_room_id, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(link_id) DO UPDATE SET
          current_room_id = excluded.current_room_id,
          updated_at = excluded.updated_at;
      `,
      linkId,
      roomId,
      now,
      now,
    )

    return { recorded: true }
  }

  recordTokenRevoked(linkId: string, tokenHash: string): { revoked: boolean } {
    const result = this.ctx.storage.sql.exec(
      `
        UPDATE tokens
        SET revoked_at = ?
        WHERE link_id = ? AND token_hash = ? AND revoked_at IS NULL;
      `,
      Date.now(),
      linkId,
      tokenHash,
    )

    return { revoked: result.rowsWritten > 0 }
  }

  listLinks(): { links: RegistryLinkSummary[] } {
    const rows = this.ctx.storage.sql
      .exec<LinkSummaryRow>(
        `
          SELECT
            l.link_id,
            l.current_room_id,
            COUNT(t.token_hash) AS active_token_count,
            MAX(t.created_at) AS latest_issued_at,
            MAX(t.expires_at) AS latest_expires_at
          FROM links l
          INNER JOIN tokens t ON t.link_id = l.link_id
          WHERE
            t.revoked_at IS NULL
            AND t.expires_at > ?
          GROUP BY l.link_id, l.current_room_id
          ORDER BY latest_expires_at ASC, l.link_id ASC;
        `,
        Date.now(),
      )
      .toArray()

    return {
      links: rows.map((row) => ({
        linkId: row.link_id,
        currentRoomId: row.current_room_id,
        activeTokenCount: row.active_token_count,
        latestIssuedAt: new Date(row.latest_issued_at).toISOString(),
        latestExpiresAt: new Date(row.latest_expires_at).toISOString(),
      })),
    }
  }

  listArchiveCandidates(input: RegistryArchiveSearchInput = {}): { links: RegistryArchiveLinkCandidate[] } {
    const q = input.q?.trim()
    const limit = normalizeLimit(input.limit)
    const offset = normalizeOffset(input.offset)
    const params: (string | number)[] = []
    let where = ''

    if (q) {
      const pattern = `%${q.toLowerCase()}%`
      where = `
        WHERE
          lower(l.link_id) LIKE ?
          OR lower(l.current_room_id) LIKE ?
          OR EXISTS (
            SELECT 1
            FROM tokens st
            WHERE st.link_id = l.link_id AND lower(COALESCE(st.label, '')) LIKE ?
          )
          OR EXISTS (
            SELECT 1
            FROM rooms sr
            WHERE
              (
                sr.room_id = l.current_room_id
                OR sr.room_id IN (
                  SELECT tr.room_id
                  FROM tokens tr
                  WHERE tr.link_id = l.link_id
                )
              )
              AND (
                lower(COALESCE(sr.title, '')) LIKE ?
                OR lower(COALESCE(sr.body, '')) LIKE ?
              )
          )
      `
      params.push(pattern, pattern, pattern, pattern, pattern)
    }

    params.push(limit, offset)
    const rows = this.ctx.storage.sql
      .exec<ArchiveLinkRow>(
        `
          SELECT
            l.link_id,
            l.current_room_id,
            COUNT(t.token_hash) AS token_count,
            MAX(t.created_at) AS latest_issued_at,
            MAX(t.expires_at) AS latest_expires_at,
            r.title AS room_title,
            r.body AS room_body,
            r.updated_at AS room_updated_at
          FROM links l
          LEFT JOIN tokens t ON t.link_id = l.link_id
          LEFT JOIN rooms r ON r.room_id = l.current_room_id
          ${where}
          GROUP BY l.link_id, l.current_room_id, r.title, r.body, r.updated_at
          ORDER BY COALESCE(latest_expires_at, l.updated_at) DESC, l.link_id ASC
          LIMIT ? OFFSET ?;
        `,
        ...params,
      )
      .toArray()

    return {
      links: rows.map(archiveCandidateFromRow),
    }
  }

  getArchiveLink(linkId: string): RegistryArchiveLinkDetail | undefined {
    const row = this.ctx.storage.sql
      .exec<ArchiveLinkRow>(
        `
          SELECT
            l.link_id,
            l.current_room_id,
            COUNT(t.token_hash) AS token_count,
            MAX(t.created_at) AS latest_issued_at,
            MAX(t.expires_at) AS latest_expires_at,
            r.title AS room_title,
            r.body AS room_body,
            r.updated_at AS room_updated_at
          FROM links l
          LEFT JOIN tokens t ON t.link_id = l.link_id
          LEFT JOIN rooms r ON r.room_id = l.current_room_id
          WHERE l.link_id = ?
          GROUP BY l.link_id, l.current_room_id, r.title, r.body, r.updated_at;
        `,
        linkId,
      )
      .toArray()[0]

    if (!row) return undefined

    const rooms = this.ctx.storage.sql
      .exec<RoomSnapshotRow>(
        `
          SELECT room_id, title, body, updated_at
          FROM rooms
          WHERE
            room_id = ?
            OR room_id IN (
              SELECT room_id
              FROM tokens
              WHERE link_id = ?
            )
          ORDER BY updated_at DESC;
        `,
        row.current_room_id,
        linkId,
      )
      .toArray()

    return {
      ...archiveCandidateFromRow(row),
      rooms: rooms.map(roomSnapshotFromRow),
    }
  }
}

function archiveCandidateFromRow(row: ArchiveLinkRow): RegistryArchiveLinkCandidate {
  const candidate: RegistryArchiveLinkCandidate = {
    linkId: row.link_id,
    currentRoomId: row.current_room_id,
    tokenCount: row.token_count,
  }
  if (row.latest_issued_at !== null) {
    candidate.latestIssuedAt = new Date(row.latest_issued_at).toISOString()
  }
  if (row.latest_expires_at !== null) {
    candidate.latestExpiresAt = new Date(row.latest_expires_at).toISOString()
  }
  if (row.room_updated_at !== null) {
    candidate.latestRoom = {
      roomId: row.current_room_id,
      title: row.room_title ?? undefined,
      body: row.room_body ?? undefined,
      updatedAt: new Date(row.room_updated_at).toISOString(),
    }
  }
  return candidate
}

function roomSnapshotFromRow(row: RoomSnapshotRow): RegistryRoomSnapshot {
  return {
    roomId: row.room_id,
    title: row.title ?? undefined,
    body: row.body ?? undefined,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isSafeInteger(limit) || limit === undefined || limit <= 0) {
    return 50
  }
  return Math.min(limit, 100)
}

function normalizeOffset(offset: number | undefined): number {
  if (!Number.isSafeInteger(offset) || offset === undefined || offset < 0) {
    return 0
  }
  return offset
}
