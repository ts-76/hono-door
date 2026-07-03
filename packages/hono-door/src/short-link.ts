import type { Context, Env as HonoEnv } from 'hono'

import { createAdminApi } from './admin-api'
import { defaultPublicPage } from './default-page'
import { PublicLink } from './durable-objects/public-link'
import { Room } from './durable-objects/room'
import { createAdminAuth, createProtect } from './middleware'
import { createDoorOperations } from './operations'
import { createPublicRoutes } from './public-routes'
import type {
  DoorConfig,
  ShortLinkBindings,
  ShortLinkEnv,
  ShortLinkHasDefaultBindings,
  ShortLinkOptions,
  ShortLinkOptionsFor,
} from './types'

const DEFAULT_COOKIE_NAME = '__short_link_token'
const DEFAULT_PUBLIC_MOUNT = '/l'

type CreateDoorArgs<T extends HonoEnv> =
  ShortLinkHasDefaultBindings<T> extends true
    ? [options?: ShortLinkOptionsFor<T>]
    : [options: ShortLinkOptionsFor<T>]

type ShortLinkDoor<T extends HonoEnv> = ReturnType<typeof createDoorWithOptions<T>>

export function createDoor(): ShortLinkDoor<ShortLinkEnv>
export function createDoor<T extends HonoEnv>(...args: CreateDoorArgs<T>): ShortLinkDoor<T>
export function createDoor<T extends HonoEnv = ShortLinkEnv>(
  options: ShortLinkOptions<T> = {},
): ShortLinkDoor<T> {
  return createDoorWithOptions(options)
}

function createDoorWithOptions<T extends HonoEnv>(
  options: ShortLinkOptions<T>,
) {
  const config: DoorConfig<T> = {
    publicLinks: options.publicLinks ?? ((c: Context<T>) => defaultBindings(c).PUBLIC_LINKS),
    rooms: options.rooms ?? ((c: Context<T>) => defaultBindings(c).ROOMS),
    registry: options.registry ?? ((c: Context<T>) => defaultBindings(c).REGISTRY),
    adminToken: options.adminToken ?? ((c: Context<T>) => defaultBindings(c).ADMIN_API_TOKEN),
    publicBaseUrl: options.publicBaseUrl ?? ((c: Context<T>) => defaultBindings(c).PUBLIC_BASE_URL),
    publicPath: options.publicPath ?? DEFAULT_PUBLIC_MOUNT,
    cookieName: options.cookieName ?? DEFAULT_COOKIE_NAME,
    cookieSecure: options.cookieSecure,
    tokenQueryParam: options.tokenQueryParam ?? 'token',
  }

  const protect = createProtect(config)
  const adminAuth = createAdminAuth(config)
  const operations = createDoorOperations(config)

  return {
    public: (renderer = defaultPublicPage) => createPublicRoutes(protect, renderer),
    adminApi: () =>
      createAdminApi({
        config,
        adminAuth,
        issueLink: operations.issueLink,
        listLinks: operations.listLinks,
        listArchivedLinks: operations.listArchivedLinks,
        getArchivedLink: operations.getArchivedLink,
        listLinkTokens: operations.listLinkTokens,
        getIssuePolicy: operations.getIssuePolicy,
        updateIssuePolicy: operations.updateIssuePolicy,
        reissueLink: operations.reissueLink,
        archiveLink: operations.archiveLink,
      }),
    protect,
    adminAuth: () => adminAuth,
    validateAdminToken: operations.validateAdminToken,
    issueLink: operations.issueLink,
    listLinks: operations.listLinks,
    listArchivedLinks: operations.listArchivedLinks,
    getArchivedLink: operations.getArchivedLink,
    listLinkTokens: operations.listLinkTokens,
    getIssuePolicy: operations.getIssuePolicy,
    updateIssuePolicy: operations.updateIssuePolicy,
    reissueLink: operations.reissueLink,
    archiveLink: operations.archiveLink,
    adminSessionSecret: operations.adminSessionSecret,
    renderPage: defaultPublicPage,
  }
}

function defaultBindings<T extends HonoEnv>(c: Context<T>): ShortLinkBindings {
  return c.env as ShortLinkBindings
}
