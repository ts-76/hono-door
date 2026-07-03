import type { Context, Env as HonoEnv } from 'hono'
import { z } from 'zod'

import { parseDurationSeconds } from './services/duration'
import type { Resolver } from './types'

export function resolve<T extends HonoEnv, Value>(
  value: Resolver<T, Value>,
  c: Context<T>,
): Value {
  return typeof value === 'function' ? (value as (context: Context<T>) => Value)(c) : value
}

export function setVariable<T extends HonoEnv>(c: Context<T>, key: string, value: unknown): void {
  ;(c.set as (key: string, value: unknown) => void)(key, value)
}

export async function parseJson<T extends HonoEnv, Schema extends z.ZodTypeAny>(
  c: Context<T>,
  schema: Schema,
): Promise<
  | { ok: true; value: z.infer<Schema> }
  | { ok: false; response: Response }
> {
  const json = await c.req.json().catch(() => undefined)
  const result = schema.safeParse(json)

  if (!result.success) {
    return {
      ok: false,
      response: c.json(
        {
          error: 'Invalid request body.',
          issues: result.error.flatten(),
        },
        400,
      ),
    }
  }

  return { ok: true, value: result.data }
}

export function parseDuration(
  input: string,
): { ok: true; value: number } | { ok: false; error: string } {
  try {
    return { ok: true, value: parseDurationSeconds(input) }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid duration.',
    }
  }
}

export function parseOptionalPositiveInteger(
  input: string | number | undefined,
): { ok: true; value: number | undefined } | { ok: false; error: string } {
  if (input === undefined) {
    return { ok: true, value: undefined }
  }

  const value = Number(input)
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: 'Max uses must be a positive integer.' }
  }

  return { ok: true, value }
}

export function publicPathFor(
  publicPath: string | ((linkId: string) => string),
  linkId: string,
): string {
  if (typeof publicPath === 'function') {
    return publicPath(linkId)
  }

  return `${publicPath.replace(/\/$/, '')}/${encodeURIComponent(linkId)}`
}

export function bearerToken(authorization: string | undefined): string | undefined {
  if (!authorization?.startsWith('Bearer ')) {
    return undefined
  }

  return authorization.slice('Bearer '.length)
}
