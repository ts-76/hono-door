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

`hono-door` uses Cloudflare Durable Object SQLite storage directly through
`ctx.storage.sql.exec()` with bound parameters. The package manages each Durable
Object's internal SQLite schema with an in-object migration table, but your
Worker still needs Wrangler `new_sqlite_classes` migrations for the exported
`PublicLink`, `Registry`, and `Room` classes.
