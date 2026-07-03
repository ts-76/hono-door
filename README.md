# Hono Short Link DO

DX-first Hono middleware for short-lived public links on Cloudflare Workers and
Durable Objects.

The Worker in this repo is intentionally small: Hono mounts public link routes,
the admin API, and the optional admin UI, then exports the Durable Object classes
that Wrangler binds by name.

```ts
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { createDoor, PublicLink, Registry, Room } from 'hono-door'
import { createDoorUi } from 'hono-door-ui'
import { renderSamplePublicPage } from './src/sample-public-page'

export { PublicLink, Registry, Room }

const app = new Hono()
const door = createDoor()

app.use('*', secureHeaders())
app.route('/l', door.public(renderSamplePublicPage))
app.route('/admin', door.adminApi())
app.route('/admin', createDoorUi(door))

export default app
```

## Packages

This repo builds two publishable packages:

| Package | Purpose | QR dependency |
| --- | --- | --- |
| `hono-door` | Core Hono routes, admin API, middleware, Durable Objects | no |
| `hono-door-ui` | Optional browser admin UI mounted at `/admin/ui` | yes |

Install only the core package when you do not need the browser UI:

```bash
bun add hono-door
```

Add the UI package when you want the default admin UI:

```bash
bun add hono-door hono-door-ui
```

The sample app also depends on `qrcode-terminal` for the local CLI's terminal QR
output. That CLI dependency is separate from the `hono-door` core package.

## Requirements

- Runtime: Cloudflare Workers with Durable Objects and SQLite-backed Durable
  Object classes.
- Framework: Hono 4.10 or newer.
- Package manager: Bun is used in this repository. Published packages can be
  installed with Bun, npm, pnpm, or another Node package manager.
- Wrangler config: bind `PUBLIC_LINKS`, `ROOMS`, and `REGISTRY`, and add
  `new_sqlite_classes` migrations for `PublicLink`, `Room`, and `Registry`.
- Worker entrypoint: export `PublicLink`, `Registry`, and `Room` so Wrangler can
  instantiate the bound Durable Object classes.
- Secrets and vars: set `ADMIN_API_TOKEN`; set `PUBLIC_BASE_URL` to the origin
  that should appear in issued public URLs.

## What It Does

- `PublicLink` is a SQLite-backed Durable Object keyed by public link ID.
- `Room` is a SQLite-backed Durable Object keyed by room ID.
- `Registry` is a SQLite-backed Durable Object that indexes issued link
  candidates for server-side listing.
- The package uses Durable Object SQLite storage directly with bound SQL
  parameters and tracks internal schema changes per object.
- A public URL can stay stable while its backing room changes.
- Tokens are short-lived access grants stored only as SHA-256 hashes.
- Raw tokens are returned once at issue time and are carried in the public URL.
- Admin JSON routes require `Authorization: Bearer <ADMIN_API_TOKEN>`.
- The browser admin UI validates `ADMIN_API_TOKEN` once, then uses a signed
  HttpOnly session cookie scoped to `/admin/ui`.
- `door.public()` includes only a minimal fallback page. Pass a custom renderer
  to display application content after token validation.
- The sample Worker uses `renderSamplePublicPage` to show how application-owned
  public UI can read `link.roomId`, `link.label`, and room state.

## Stable Room IDs

Treat `roomId` as the stable application-owned identifier for the content behind
a public link. For custom systems such as surveys, issue a new `roomId` for each
public survey/event and use that value as the foreign key in your own Durable
Object or D1 schema.

`hono-door` keeps `roomId` unique as a storage address:

- `ROOMS.getByName(roomId)` always resolves the same `Room` Durable Object.
- `Registry.rooms.room_id` is a primary key, so duplicate room rows are not
  created.
- Public renderers receive `link.roomId`, `link.linkId`, `link.tokenHash`,
  `link.label`, `link.role`, and `link.expiresAt` after token validation.

The package does not reject a repeated `roomId`. Calling `/admin/rooms/:roomId`
again for the same `roomId` updates that room. Issuing a link reads the current
room state and records it for archive review. For archive-safe custom workflows,
do not reuse a `roomId` for another survey/event; create a fresh ID instead.

For example, a survey app can use `roomId` as the stable key:

```sql
CREATE TABLE survey_rooms (
  room_id TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE survey_responses (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  submitted_at INTEGER NOT NULL
);
```

Then render the public page by reading your application data with
`link.roomId`:

```ts
app.route('/l', door.public(async ({ c, link }) => {
  const survey = await c.env.DB
    .prepare('SELECT * FROM survey_rooms WHERE room_id = ?')
    .bind(link.roomId)
    .first()

  return renderSurveyPage({ survey, link })
}))
```

Manual archive, revoke, and TTL expiry do not change `roomId` or `tokenHash`.
Reissue creates a new token and therefore a new `tokenHash`, but still uses the
link's current `roomId`.

Example issued URL:

```text
https://example.workers.dev/l/summer-event?token=<raw-token>
```

On first browser access with `?token=...`, the middleware validates the token,
sets an HTTP-only cookie scoped to that link path, and redirects to the same URL
without the token query string. Later requests use the cookie. Bearer tokens are
also accepted for programmatic access.

## Setup Order

1. Install dependencies.

   ```bash
   bun install
   ```

2. Create a local admin token.

   ```bash
   printf 'ADMIN_API_TOKEN=local-admin-token\n' > .dev.vars
   ```

3. Generate Worker types after dependencies are installed.

   ```bash
   bun run types
   ```

4. Run the local Worker.

   ```bash
   bun run dev
   ```

5. Verify the Worker is alive.

   ```bash
   curl http://localhost:8787/health
   ```

Expected health response:

```json
{"ok":true,"service":"hono-short-link-do"}
```

## Wrangler Durable Objects

`wrangler.jsonc` must bind the same class names exported by the Worker:

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "PUBLIC_LINKS", "class_name": "PublicLink" },
      { "name": "ROOMS", "class_name": "Room" },
      { "name": "REGISTRY", "class_name": "Registry" }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["PublicLink", "Room"]
    },
    {
      "tag": "v2",
      "new_sqlite_classes": ["Registry"]
    }
  ]
}
```

The Worker entrypoint must include:

```ts
export { PublicLink, Registry, Room }
```

Without that export, Wrangler can read the binding config but cannot instantiate
the Durable Object classes.

## Bindings

`createDoor()` uses these binding names by default:

| Binding | Purpose |
| --- | --- |
| `PUBLIC_LINKS` | Durable Object namespace for `PublicLink` |
| `ROOMS` | Durable Object namespace for `Room` |
| `REGISTRY` | Durable Object namespace for server-side list candidates |
| `ADMIN_API_TOKEN` | Admin API bearer token |
| `PUBLIC_BASE_URL` | Base URL used when issuing public links |

Override the resolvers when embedding the package in another app:

```ts
import { Hono } from 'hono'
import { PublicLink, Registry, Room, createDoor, type ShortLinkVariables } from 'hono-door'

type AppEnv = {
  Bindings: {
    MY_PUBLIC_LINKS: DurableObjectNamespace<PublicLink>
    MY_ROOMS: DurableObjectNamespace<Room>
    MY_REGISTRY: DurableObjectNamespace<Registry>
    SHORT_LINK_ADMIN_TOKEN?: string
    SHORT_LINK_PUBLIC_BASE_URL?: string
  }
  Variables: ShortLinkVariables
}

const app = new Hono<AppEnv>()
const door = createDoor<AppEnv>({
  publicLinks: (c) => c.env.MY_PUBLIC_LINKS,
  rooms: (c) => c.env.MY_ROOMS,
  registry: (c) => c.env.MY_REGISTRY,
  adminToken: (c) => c.env.SHORT_LINK_ADMIN_TOKEN,
  publicBaseUrl: (c) => c.env.SHORT_LINK_PUBLIC_BASE_URL,
  publicPath: '/event',
})
```

## Routes

The repo Worker mounts:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | none | Health check |
| `GET` | `/l/:linkId` | public token | Render the current room for a link |
| `GET` | `/admin/ui` | none | Browser admin UI shell; actions require a UI session |
| `POST` | `/admin/ui` | UI session or form token | Issue a link from the UI |
| `GET` | `/admin/ui/links` | none | Server-backed active link list shell; data API requires a UI session |
| `GET` | `/admin/ui/archive` | none | Browser archive shell for inactive link search and admin-only preview |
| `GET` | `/admin/ui/archive/:linkId/rooms/:roomId/preview` | UI session | Admin-only archived room preview |
| `GET` | `/admin/ui/client.js` | none | Admin UI client script |
| `POST` | `/admin/ui/api/session` | form token | Create UI session cookie |
| `GET` | `/admin/ui/api/session` | UI session | Check UI session state |
| `DELETE` | `/admin/ui/api/session` | UI session | Clear UI session cookie |
| `GET` | `/admin/ui/api/links` | UI session | UI proxy for active links |
| `GET` | `/admin/ui/api/links/archive` | UI session | UI proxy for inactive archive search |
| `GET` | `/admin/ui/api/links/archive/:linkId` | UI session | UI proxy for archived link detail |
| `GET` | `/admin/ui/api/links/:linkId/tokens` | UI session | UI proxy for active token metadata |
| `GET` | `/admin/ui/api/links/:linkId/issue-policy` | UI session | UI proxy for issue policy |
| `PUT` | `/admin/ui/api/links/:linkId/issue-policy` | UI session | UI proxy for issue policy update |
| `POST` | `/admin/ui/api/links/:linkId/reissue` | UI session | UI proxy for revoke-and-reissue |
| `POST` | `/admin/ui/api/links/:linkId/archive` | UI session | UI proxy for manual archive |
| `GET` | `/admin/links` | bearer admin token | List active links |
| `GET` | `/admin/links/archive` | bearer admin token | Search inactive archived links |
| `GET` | `/admin/links/archive/:linkId` | bearer admin token | Archived link detail with room snapshot and token history |
| `GET` | `/admin/links/:linkId` | bearer admin token | Link status |
| `GET` | `/admin/links/:linkId/tokens` | bearer admin token | List active token metadata for a link |
| `GET` | `/admin/links/:linkId/issue-policy` | bearer admin token | Get link issue policy |
| `PUT` | `/admin/links/:linkId/issue-policy` | bearer admin token | Update link issue policy |
| `POST` | `/admin/links/:linkId/reissue` | bearer admin token | Revoke active tokens and issue a new token |
| `POST` | `/admin/links/:linkId/archive` | bearer admin token | Revoke active tokens without issuing a new token |
| `POST` | `/admin/links/:linkId/tokens` | bearer admin token | Issue a token |
| `POST` | `/admin/links/:linkId/switch-room` | bearer admin token | Point link at another room |
| `POST` | `/admin/links/:linkId/revoke` | bearer admin token | Revoke a token by hash |
| `POST` | `/admin/rooms/:roomId` | bearer admin token | Set room content |

## Request Requirements

- Admin JSON API requests must include
  `Authorization: Bearer <ADMIN_API_TOKEN>`.
- Requests with JSON bodies must include `Content-Type: application/json`.
- Public link requests require a valid raw token by `?token=...`,
  `Authorization: Bearer <raw-token>`, or the link-scoped HttpOnly cookie that
  is set after query-token access.
- Raw public tokens are returned only by issue/reissue responses. List, archive,
  and detail endpoints return token hashes and metadata only.
- Browser admin UI API requests under `/admin/ui/api/*` use the signed UI
  session cookie created by `POST /admin/ui/api/session`, not bearer auth.

## Admin API Reference

Set these variables for examples:

```bash
export SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787
export SHORT_LINK_ADMIN_TOKEN=local-admin-token
```

### Set Room Content

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/rooms/room-a" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Summer Event","body":"Welcome"}'
```

Response:

```json
{"title":"Summer Event","body":"Welcome","mode":"plain","updatedAt":1710000000000}
```

### Issue Token

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/tokens" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl":"1h","roomId":"room-a","label":"staff","role":"viewer","maxUses":10}'
```

Request fields:

| Field | Required | Notes |
| --- | --- | --- |
| `ttl` | no | Defaults to `1h`; accepts duration strings such as `15m`, `1h`, `1d`, or a positive integer number of seconds |
| `roomId` | no | Sets the link's current room when present; use a stable, application-owned ID and do not reuse it for another survey/event |
| `label` | no | Token-scoped operator memo; not used for authorization and exposed to public renderers as `shortLink.label` |
| `role` | no | Defaults to `viewer` and is exposed in `shortLink.role` |
| `maxUses` | no | Positive integer as a number or string; omitted means unlimited until expiry/revoke |

Response:

```json
{
  "url": "http://localhost:8787/l/summer-event?token=<raw-token>",
  "token": "<raw-token>",
  "tokenHash": "<sha-256-hash>",
  "expiresAt": "2026-06-28T12:00:00.000Z",
  "roomId": "room-a"
}
```

Store `tokenHash` if you need to revoke this token later. The raw `token` is not
stored by the Durable Object and cannot be recovered.

### List Active Links

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Response:

```json
{
  "links": [
    {
      "linkId": "summer-event",
      "currentRoomId": "room-a",
      "activeTokenCount": 1,
      "latestIssuedAt": "2026-06-28T11:00:00.000Z",
      "latestExpiresAt": "2026-06-28T12:00:00.000Z"
    }
  ]
}
```

This endpoint uses the `REGISTRY` Durable Object as the link candidate index and
then checks each candidate's `PublicLink` object for the current room and active
token count. It returns only links with at least one non-expired, non-revoked
token that has not reached `maxUses`.

### Search Inactive Archive

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links/archive?q=summer" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

The archive returns inactive links: expired, revoked, or `maxUses`-reached
links with no currently active tokens. Search matches `linkId`, `roomId`, token
label, room title, and room body.

Response:

```json
{
  "links": [
    {
      "linkId": "summer-event",
      "currentRoomId": "room-a",
      "latestIssuedAt": "2026-06-28T11:00:00.000Z",
      "latestExpiresAt": "2026-06-28T12:00:00.000Z",
      "tokenCount": 1,
      "latestRoom": {
        "roomId": "room-a",
        "title": "Summer Event",
        "body": "Welcome",
        "updatedAt": "2026-06-28T10:55:00.000Z"
      }
    }
  ]
}
```

### Archived Link Detail

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links/archive/summer-event" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Response:

```json
{
  "linkId": "summer-event",
  "currentRoomId": "room-a",
  "tokenCount": 1,
  "rooms": [
    {
      "roomId": "room-a",
      "title": "Summer Event",
      "body": "Welcome",
      "updatedAt": "2026-06-28T10:55:00.000Z"
    }
  ],
  "tokens": [
    {
      "tokenHash": "<sha-256-hash>",
      "label": "staff",
      "role": "viewer",
      "roomId": "room-a",
      "createdAt": "2026-06-28T11:00:00.000Z",
      "expiresAt": "2026-06-28T12:00:00.000Z",
      "maxUses": 10,
      "useCount": 3,
      "ttlSeconds": 3600,
      "state": "expired"
    }
  ]
}
```

Archive detail is intended for post-publication review. It can show room
title/body and token metadata, but it still cannot reconstruct old public URLs
because raw tokens are not stored. The browser UI can reopen archived room
content through an `/admin/ui` preview route that requires the signed admin
session cookie and does not create a new public token.
For custom systems, use the archived link's `linkId` and `roomId` to read the
application-owned archive, survey, response, or snapshot data from your own
Durable Object or D1 storage.
If the link has an active token again, this endpoint returns `409` and the link
belongs in the active-link list instead.

### List Active Tokens For A Link

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/tokens" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Response:

```json
{
  "tokens": [
    {
      "tokenHash": "<sha-256-hash>",
      "label": "staff",
      "role": "viewer",
      "roomId": "room-a",
      "createdAt": "2026-06-28T11:00:00.000Z",
      "expiresAt": "2026-06-28T12:00:00.000Z",
      "maxUses": 10,
      "useCount": 0
    }
  ]
}
```

Raw tokens are not stored and are never returned by list endpoints, so list
responses cannot reconstruct the public URL or QR code.

### Get Issue Policy

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/issue-policy" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Response:

```json
{"ttlSeconds":3600,"label":"staff","role":"viewer","maxUses":10}
```

The policy is the reusable issuing configuration for a link. `roomId` is not
stored in the policy; reissue uses the link's current room.

### Update Issue Policy

```bash
curl -sS -X PUT "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/issue-policy" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl":"15m","label":"reissued","role":"viewer","maxUses":3}'
```

Use `null` for `label` or `maxUses` to clear them.

### Reissue URL And QR

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/reissue" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Response:

```json
{
  "url": "http://localhost:8787/l/summer-event?token=<new-raw-token>",
  "token": "<new-raw-token>",
  "tokenHash": "<new-sha-256-hash>",
  "expiresAt": "2026-06-28T12:15:00.000Z",
  "roomId": "room-a",
  "reissued": true,
  "revokedTokenCount": 1
}
```

Reissue requires an existing link. It always revokes active tokens for the link
before issuing the new token. The raw token is returned only in this response
and is not stored.

### Archive Before TTL

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/archive" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Response:

```json
{"linkId":"summer-event","archived":true,"revokedTokenCount":1}
```

Manual archive revokes currently active tokens without issuing a replacement
token. The link disappears from `/admin/links` immediately and can be reviewed
from `/admin/links/archive` or the browser archive UI. Archived room previews
remain admin-session-only and do not make the link public again.
Manual archive does not change `roomId` or rewrite token hashes.

### Link Status

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Response:

```json
{
  "exists": true,
  "currentRoomId": "room-a",
  "activeTokenCount": 1,
  "latestIssuedAt": "2026-01-01T00:00:00.000Z",
  "latestExpiresAt": "2026-01-01T01:00:00.000Z"
}
```

`activeTokenCount` and latest timestamps are computed from currently active
tokens: non-revoked, non-expired tokens that have not reached `maxUses`.
Expired token rows are retained for archive analysis. Expired links do not
appear in `/admin/links` or the browser active-link list, but they can be found
from `/admin/links/archive`. Browser archive previews require an admin UI
session and do not make the link public again. Use
`POST /admin/links/:linkId/reissue` only when you intentionally want a new
public URL and QR-ready token.

### Switch Link Room

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/switch-room" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roomId":"room-b"}'
```

Response:

```json
{"roomId":"room-b"}
```

Existing valid tokens for the link now render `room-b`; the public URL path does
not change.

### Revoke Token

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/revoke" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokenHash":"<sha-256-hash-from-issue-response>"}'
```

Response:

```json
{"revoked":true}
```

`false` means no unrevoked row matched that hash.

## CLI Reference

The CLI is a thin wrapper around the admin API and uses:

- `SHORT_LINK_ADMIN_BASE_URL`, defaulting to `http://localhost:8787`
- `SHORT_LINK_ADMIN_TOKEN`, required

Issue a token and render a terminal QR code:

```bash
SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787 \
SHORT_LINK_ADMIN_TOKEN=local-admin-token \
bun run token:issue --link summer-event --ttl 1h --room room-a --label staff --max-uses 10
```

Set room content:

```bash
SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787 \
SHORT_LINK_ADMIN_TOKEN=local-admin-token \
bun run room:set --room room-a --title "Summer Event" --body "Welcome"
```

Switch the room behind a stable link:

```bash
SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787 \
SHORT_LINK_ADMIN_TOKEN=local-admin-token \
bun run link:switch --link summer-event --room room-b
```

The current CLI supports issue, room update, and room switch. Use the API
examples above for status and revoke until CLI wrappers are added.

## Admin And Security Model

- The public route is deny-by-default; no token means `401`.
- Invalid tokens return `401`; revoked, expired, or over-used tokens return
  `403`.
- Admin JSON routes are protected only by `ADMIN_API_TOKEN`.
- The admin UI asks for `ADMIN_API_TOKEN` once, then sets a signed HttpOnly
  session cookie. It does not persist the token in browser storage or a
  JavaScript-readable cookie.
- The UI session cookie is scoped to `/admin/ui`, signed with the configured
  admin token, and expires after 8 hours.
- `/admin/ui/api/*` is for the browser UI. CLI and direct API clients should
  keep using bearer-protected `/admin/*` JSON routes.
- The admin UI issues links for an existing or application-managed `roomId`; it
  does not edit room title/body content. Use `/admin/rooms/:roomId` or a custom
  application UI for room content.
- Treat `roomId` as a stable application key. The same `roomId` resolves to the
  same `Room` Durable Object and Registry room row; repeated writes update that
  room, so issue a fresh `roomId` for each survey/event instead of reusing one.
- The built-in public page is intentionally not a room content UI. Production
  applications should pass `door.public(({ link }) => ...)` and render their
  own content using `link.roomId`, `link.label`, and application data.
- Active-link listing uses the server-side `REGISTRY` Durable Object as an
  index and `PublicLink` as the token source of truth.
- Archive search uses `REGISTRY` for link, token label, and room text matching,
  then checks `PublicLink` to include only links without active tokens.
- List endpoints return token hashes and metadata only, never raw tokens.
- Reissue revokes all active tokens for the link before returning a new raw
  token, URL, and QR-ready URL.
- Token labels are operational notes only and are not part of authorization.
  Public renderers and handlers can read the verified token label from
  `shortLink.label`.
- Public responses set `Cache-Control: no-store`, `Referrer-Policy:
  no-referrer`, and `X-Robots-Tag: noindex`.
- Put the admin routes behind Cloudflare Access or another network boundary
  before using this for sensitive production workflows.

## Token Lifecycle

1. Admin issues a token for a link with a TTL and optional `maxUses`.
2. `PublicLink` generates a raw token, stores only its SHA-256 hash, and returns
   the raw token once.
3. `PublicLink` stores the link issue policy: TTL, role, label, and `maxUses`.
4. If `roomId` is included, the link's current room is updated at issue time.
   Use a stable, non-reused `roomId` for archive-safe application data.
5. `Registry` records the link as a server-side list candidate.
6. Public access validates the raw token against the stored hash.
7. Browser query-token access sets an HTTP-only cookie and redirects without
   consuming the first use; the next cookie-backed request consumes one use.
8. Header-token and cookie-token access increment `use_count`.
9. A token stops working when it expires, is revoked, or reaches `maxUses`.
10. Reissue revokes currently active tokens and issues one replacement token
    using the stored issue policy and current room.
11. Expired token rows remain stored so archive detail can show token history,
    use counts, and inactive state.

`Registry` is updated by issue, room switch, revoke, and room update paths and is
used as the candidate index for admin lists. Current active counts, latest active
timestamps, token detail, `useCount`, and `maxUses` checks are read from the
per-link `PublicLink` object so public access does not need to update a single
global object on every request.
Existing data created before adding `REGISTRY` cannot be backfilled automatically
because Durable Object namespaces are not globally enumerable by this package.

## Deploy

1. Set the production admin secret.

   ```bash
   bunx wrangler secret put ADMIN_API_TOKEN
   ```

2. Confirm `PUBLIC_BASE_URL` in `wrangler.jsonc` matches the deployed route or
   custom domain used in issued links.

3. Run a dry run.

   ```bash
   bun run deploy:dry-run
   ```

4. Deploy.

   ```bash
   bun run deploy
   ```

5. Verify the deployed Worker.

   ```bash
   curl https://hono-short-link-do.tsapp.workers.dev/health
   ```

6. Issue a short-lived production token, open the returned URL, then check link
   status and revoke the token hash if it was only for verification.

## Verification Commands

Run before handing off code changes:

```bash
bun run check
```

For documentation-only changes, at minimum review the changed Markdown and make
sure any command examples still match `package.json`, `wrangler.jsonc`, and the
mounted routes in `src/index.tsx`.

## Maintainer Release Flow

Package releases are automated from `main` with semantic-release. The release
workflow publishes both npm packages:

- `hono-door`
- `hono-door-ui`

Releases stay on the `0.x` line until the package is ready for a stable `1.0`.
Conventional release commits such as `feat:`, `fix:`, and `perf:` advance the
minor version, so automated releases use `0.x.0` versions. Before the first
automated publish, configure npm trusted publishing for this GitHub repository
and both package names so the workflow can publish with provenance through
GitHub OIDC.

Normal release flow:

1. Open a pull request against `main`.
2. Wait for CI to pass.
3. Merge the pull request.
4. Let the `Release` workflow publish packages and create the GitHub Release.
