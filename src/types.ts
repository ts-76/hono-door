import type { ShortLinkBindings, ShortLinkVariables } from 'hono-door'

export type AppBindings = {
  Bindings: Env & ShortLinkBindings
  Variables: ShortLinkVariables
}
