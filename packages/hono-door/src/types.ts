import type { Context, Env as HonoEnv } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import type { PublicLinkAccess } from './durable-objects/public-link'
import { PublicLink } from './durable-objects/public-link'
import { Registry } from './durable-objects/registry'
import type { RoomState } from './durable-objects/room'
import { Room } from './durable-objects/room'

export type ShortLinkBindings = {
  PUBLIC_LINKS: DurableObjectNamespace<PublicLink>
  ROOMS: DurableObjectNamespace<Room>
  REGISTRY: DurableObjectNamespace<Registry>
  PUBLIC_BASE_URL?: string
  ADMIN_API_TOKEN?: string
}

export type ShortLinkContext = {
  linkId: string
  tokenHash: string
  label?: string | undefined
  role: string
  expiresAt: number
  roomId: string
  room: RoomState
  tokenSource: 'header' | 'query' | 'cookie'
}

export type ShortLinkVariables = {
  shortLink: ShortLinkContext
  publicLinkAccess: PublicLinkAccess
}

export type ShortLinkEnv<Bindings = ShortLinkBindings> = HonoEnv & {
  Bindings: Bindings
  Variables: ShortLinkVariables
}

export type Resolver<T extends HonoEnv, Value> = Value | ((c: Context<T>) => Value)

export type ShortLinkPageRenderer<T extends HonoEnv> = (context: {
  c: Context<T>
  link: ShortLinkContext
}) => string | Promise<string>

export type ShortLinkOptions<T extends HonoEnv> = {
  publicLinks?: Resolver<T, DurableObjectNamespace<PublicLink>>
  rooms?: Resolver<T, DurableObjectNamespace<Room>>
  registry?: Resolver<T, DurableObjectNamespace<Registry>>
  adminToken?: Resolver<T, string | undefined>
  publicBaseUrl?: Resolver<T, string | undefined>
  publicPath?: string | ((linkId: string) => string)
  cookieName?: string
  cookieSecure?: Resolver<T, boolean>
  tokenQueryParam?: string
}

type RequiredDefaultBindings = Pick<ShortLinkBindings, 'PUBLIC_LINKS' | 'ROOMS' | 'REGISTRY'>
type EnvBindings<T extends HonoEnv> = T extends { Bindings: infer Bindings } ? Bindings : never
export type ShortLinkHasDefaultBindings<T extends HonoEnv> =
  EnvBindings<T> extends RequiredDefaultBindings ? true : false

export type ShortLinkRequiredResolverOptions<T extends HonoEnv> = ShortLinkOptions<T> & {
  publicLinks: Resolver<T, DurableObjectNamespace<PublicLink>>
  rooms: Resolver<T, DurableObjectNamespace<Room>>
  registry: Resolver<T, DurableObjectNamespace<Registry>>
}

export type ShortLinkOptionsFor<T extends HonoEnv> =
  ShortLinkHasDefaultBindings<T> extends true
    ? ShortLinkOptions<T>
    : ShortLinkRequiredResolverOptions<T>

export type DoorConfig<T extends HonoEnv> = {
  publicLinks: Resolver<T, DurableObjectNamespace<PublicLink>>
  rooms: Resolver<T, DurableObjectNamespace<Room>>
  registry: Resolver<T, DurableObjectNamespace<Registry>>
  adminToken: Resolver<T, string | undefined>
  publicBaseUrl: Resolver<T, string | undefined>
  publicPath: string | ((linkId: string) => string)
  cookieName: string
  cookieSecure?: Resolver<T, boolean> | undefined
  tokenQueryParam: string
}

export type ShortLinkProtectOptions = {
  redirectQueryToken?: boolean
  linkIdParam?: string
}

export type ShortLinkIssueLinkRoomInput =
  | string
  | {
      id: string
      title?: string | undefined
      body?: string | undefined
    }

export type ShortLinkIssueLinkInput = {
  linkId: string
  ttl?: string | number | undefined
  roomId?: string | undefined
  room?: ShortLinkIssueLinkRoomInput | undefined
  role?: string | undefined
  label?: string | undefined
  maxUses?: string | number | undefined
  title?: string | undefined
  body?: string | undefined
}

export type ShortLinkIssuedLink = {
  linkId: string
  url: string
  token: string
  tokenHash: string
  expiresAt: string
  roomId: string
}

export type ShortLinkIssuePolicyInput = {
  ttl?: string | number | undefined
  role?: string | undefined
  label?: string | null | undefined
  maxUses?: string | number | null | undefined
}

export type ShortLinkReissuedLink = ShortLinkIssuedLink & {
  reissued: true
  revokedTokenCount: number
}

export type ShortLinkArchiveSearchInput = {
  q?: string | undefined
}

export type ShortLinkOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: ContentfulStatusCode; error: string }
