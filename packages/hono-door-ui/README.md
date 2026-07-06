# hono-door-ui

Optional browser admin UI for `hono-door`. It provides URL and QR issuing,
active link listing, inactive archive search, admin-only archive previews,
issue-policy editing, active-link reissue flows, manual archive before TTL, and
manual archive deletion.

The issue UI accepts `linkId`, `roomId`, TTL, label, and max-use settings. It
submits directly from that form and then shows the issued URL/QR result. It does
not edit room content; use the core admin API or application-specific routes
for custom room data.

Treat `roomId` as a stable application-owned key. The UI will pass it through to
`hono-door`; your app should create a fresh `roomId` for each survey/event and
use that ID to load custom DO or D1 data. Archive previews stay admin-only and
use the archived link's `linkId` and `roomId`; they do not create a new token or
public URL. By default the package returns a minimal admin preview, but apps can
pass `renderArchivePreview` to reuse the same custom presentation they use for
public links.

Deleting an archived link removes retained token history and admin preview data.
It is only available for links with no active token.

The UI supports Japanese and English. Locale is detected with Hono's language
middleware from `?lang=ja|en`, the language cookie, and `Accept-Language`, with
Japanese as the fallback.

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

Reuse your app's archived-content renderer when opening archive previews:

```ts
app.route(
  '/admin',
  createDoorUi(door, {
    renderArchivePreview: ({ c, linkId, room }) =>
      renderPublicLikePage({
        c,
        linkId,
        roomId: room.roomId,
        title: room.title,
        body: room.body,
      }),
  }),
)
```

See the repository README for the full setup and security model.
