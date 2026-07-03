# hono-door

Hono routes, middleware, and Durable Objects for short-lived public links on
Cloudflare Workers.

Install:

```bash
bun add hono-door
```

Minimal Worker:

```ts
import { Hono } from 'hono'
import { createDoor, PublicLink, Registry, Room } from 'hono-door'

export { PublicLink, Registry, Room }

const app = new Hono()
const door = createDoor()

app.route('/l', door.public())
app.route('/admin', door.adminApi())

export default app
```

See the repository README for Wrangler bindings, Durable Object migrations,
admin API examples, archive search, and token lifecycle details.

## Stable Room IDs

Use `roomId` as the stable application-owned key for custom content. The same
`roomId` resolves to the same `Room` Durable Object, and the Registry stores one
row per `room_id`. Reusing a `roomId` updates that room; it does not create a
second room. For survey or event systems, create a fresh `roomId` per public
survey/event and use it as the foreign key in your own DO or D1 data.

Public renderers receive `link.roomId`, `link.linkId`, `link.tokenHash`,
`link.label`, `link.role`, and `link.expiresAt` after token validation, so they
can load application data by `roomId`. Manual archive, revoke, and expiry do
not change `roomId`; reissue creates a new token hash while keeping the link's
current room.

`hono-door` uses Cloudflare Durable Object SQLite storage directly through
`ctx.storage.sql.exec()` with bound parameters. The package manages each Durable
Object's internal SQLite schema with an in-object migration table, but your
Worker still needs Wrangler `new_sqlite_classes` migrations for the exported
`PublicLink`, `Registry`, and `Room` classes.
