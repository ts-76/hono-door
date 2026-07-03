import { DurableObject } from 'cloudflare:workers'

import { runSqlMigrations, type SqlMigration } from './sql-migrations'

export type RoomState = {
  title: string
  body: string
  mode: 'plain'
  updatedAt: number
}

type RoomSettingRow = {
  key: keyof RoomState
  value: string
}

const ROOM_MIGRATIONS: SqlMigration[] = [
  {
    id: 1,
    name: 'create_room_settings',
    run(storage) {
      storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS room_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
    },
  },
]

export class Room extends DurableObject<unknown> {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      runSqlMigrations(this.ctx.storage, ROOM_MIGRATIONS)
    })
  }

  getState(): RoomState {
    const rows = this.ctx.storage.sql
      .exec<RoomSettingRow>(
        `
          SELECT key, value
          FROM room_settings;
        `,
      )
      .toArray()

    const values = new Map(rows.map((row) => [row.key, row.value]))

    return {
      title: values.get('title') ?? 'Short-lived page',
      body: values.get('body') ?? 'This room has not been configured yet.',
      mode: 'plain',
      updatedAt: Number(values.get('updatedAt') ?? 0),
    }
  }

  setState(input: { title?: string; body?: string }): RoomState {
    const now = Date.now()

    if (input.title !== undefined) {
      this.setValue('title', input.title)
    }

    if (input.body !== undefined) {
      this.setValue('body', input.body)
    }

    this.setValue('updatedAt', String(now))

    return this.getState()
  }

  private setValue(key: keyof RoomState, value: string): void {
    this.ctx.storage.sql.exec(
      `
        INSERT INTO room_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      `,
      key,
      value,
    )
  }
}
