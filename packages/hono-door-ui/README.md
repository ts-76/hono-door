# hono-door-ui

Optional browser admin UI for `hono-door`. It provides URL and QR issuing,
active link listing, inactive archive search, issue-policy editing, and reissue
flows.

The issue UI accepts `linkId`, `roomId`, TTL, label, and max-use settings. It
submits directly from that form and then shows the issued URL/QR result. It does
not edit room content; use the core admin API or application-specific routes
for custom room data.

Install with the core package:

```bash
bun add hono-door hono-door-ui
```

Mount it beside the `hono-door` admin API:

```ts
import { createDoorUi } from 'hono-door-ui'

app.route('/admin', door.adminApi())
app.route('/admin', createDoorUi(door))
```

See the repository README for the full setup and security model.
