declare module 'cloudflare:workers' {
  export class DurableObject<T = unknown> {
    protected ctx: DurableObjectState
    protected env: T
    constructor(ctx: DurableObjectState, env: T)
  }
}

interface Env {}

interface DurableObjectId {
  toString(): string
}

interface DurableObjectNamespace<T = unknown> {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): T
  getByName(name: string): T
}

interface DurableObjectState {
  storage: DurableObjectStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): void
}

interface DurableObjectStorage {
  sql: DurableObjectSqlStorage
  setAlarm(scheduledTime: number | Date): Promise<void>
  deleteAlarm(): Promise<void>
  transactionSync<T>(closure: () => T): T
}

interface DurableObjectSqlStorage {
  exec<T = unknown>(query: string, ...bindings: unknown[]): DurableObjectSqlStorageCursor<T>
}

interface DurableObjectSqlStorageCursor<T> {
  rowsWritten: number
  toArray(): T[]
  one(): T
}
