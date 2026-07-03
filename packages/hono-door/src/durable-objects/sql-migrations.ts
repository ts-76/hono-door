// Durable Object SQLite storage migrations. This helper is intentionally scoped
// to per-object `ctx.storage.sql`, not D1 or other SQL backends.
export type SqlMigration = {
  id: number
  name: string
  run: (storage: DurableObjectStorage) => void
}

export function runSqlMigrations(
  storage: DurableObjectStorage,
  migrations: SqlMigration[],
): void {
  storage.transactionSync(() => {
    storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `)

    const applied = new Set(
      storage.sql
        .exec<{ id: number }>(`
          SELECT id
          FROM _sql_schema_migrations;
        `)
        .toArray()
        .map((row) => row.id),
    )

    for (const migration of [...migrations].sort((a, b) => a.id - b.id)) {
      if (applied.has(migration.id)) continue

      migration.run(storage)
      storage.sql.exec(
        `
          INSERT INTO _sql_schema_migrations (id, name, applied_at)
          VALUES (?, ?, ?);
        `,
        migration.id,
        migration.name,
        Date.now(),
      )
    }
  })
}

export function addColumnIfMissing(
  storage: DurableObjectStorage,
  statement: string,
): void {
  // Compatibility escape hatch for objects that already received the column
  // before migrations were tracked. Other SQL errors must remain fatal.
  try {
    storage.sql.exec(statement)
  } catch (error) {
    if (isDuplicateColumnError(error)) return
    throw error
  }
}

export function isDuplicateColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /duplicate column name/i.test(message)
}
