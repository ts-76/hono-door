# Hono Door Durable Object Plan

## Current Goal

Provide a minimal, reusable Cloudflare Workers + Hono short-link system for
event-style public pages. Public pages are deny-by-default and become reachable
only through short-lived tokens. Operators can keep the public link ID stable
while switching the backing room.

```text
https://example.workers.dev/l/summer-event?token=<short-lived-token>
```

## Implemented

- Minimal Worker entrypoint in `src/index.tsx`
  - mounts `/health`
  - mounts public links at `/l`
  - mounts admin API at `/admin`
  - mounts browser admin UI at `/admin/ui`
  - exports `PublicLink`, `Registry`, and `Room` for Wrangler Durable Object bindings
- `wrangler.jsonc`
  - `PUBLIC_LINKS` binding to `PublicLink`
  - `ROOMS` binding to `Room`
  - `REGISTRY` binding to `Registry`
  - `v1` SQLite Durable Object migration for both classes
  - `v2` SQLite Durable Object migration for `Registry`
  - `PUBLIC_BASE_URL` production variable
- `hono-door` package API
  - `createDoor()`
  - `door.public()`
  - `door.adminApi()`
  - `door.protect()`
  - `door.adminAuth()`
  - `door.issueLink()`
  - `door.listLinks()`
  - `door.listLinkTokens()`
  - `door.getIssuePolicy()`
  - `door.updateIssuePolicy()`
  - `door.reissueLink()`
  - `door.validateAdminToken()`
  - `door.adminSessionSecret()`
- `hono-door-ui` package API
  - `createDoorUi()`
  - browser UI routes under `/admin/ui`
  - QR SVG generation kept outside the `hono-door` core package
- `PublicLink` Durable Object
  - link-level current room pointer
  - hashed token storage
  - link-level issue policy
  - TTL expiry
  - revoke by token hash
  - revoke active tokens and reissue
  - optional `maxUses`
  - active-token status count
  - retain expired token rows for archive analysis
- `Room` Durable Object
  - plain title/body state
  - updated timestamp
- `Registry` Durable Object
  - issued-link candidate index for server-side lists
  - issue, switch-room, revoke, and room update recording
  - inactive archive search across link, room, label, title, and body
- Admin API
  - `GET /admin/links`
  - `GET /admin/links/:linkId`
  - `GET /admin/links/:linkId/tokens`
  - `GET /admin/links/:linkId/issue-policy`
  - `PUT /admin/links/:linkId/issue-policy`
  - `POST /admin/links/:linkId/reissue`
  - `POST /admin/links/:linkId/tokens`
  - `POST /admin/links/:linkId/switch-room`
  - `POST /admin/links/:linkId/revoke`
  - `POST /admin/rooms/:roomId`
- CLI
  - `bun run token:issue`
  - `bun run room:set`
  - `bun run link:switch`
  - issue supports `--max-uses`
- Browser admin UI
  - issue link and QR code
  - server-side active link list using the admin API
  - token detail list from `PublicLink` without raw URL/QR reconstruction
  - issue policy edit and revoke-and-reissue URL/QR flow
  - signed HttpOnly admin session cookie scoped to `/admin/ui`
  - UI-only proxy API under `/admin/ui/api/*`
  - distributed as `hono-door-ui`, not as a `hono-door` subpath export

## Core Model

```text
linkId: summer-event
  currentRoomId: room-a
  token hashes: short-lived access grants

room-a
  title/body/mode for the published page
```

`PublicLink.currentRoomId` is the routing pointer. Tokens are scoped to the link
ID, not to a fixed room snapshot, so switching a link's current room changes what
valid existing link tokens render.

## Security Model

- Public routes require a valid raw token by bearer header, query string, or
  link-scoped HTTP-only cookie.
- Tokens are stored as hashes only; raw tokens are visible only in the issue
  response.
- Admin JSON routes use a single `ADMIN_API_TOKEN` bearer secret.
- The admin UI asks for the same admin token once, then uses a signed HttpOnly
  session cookie for privileged browser operations.
- Production admin routes should be additionally protected by Cloudflare Access
  or an equivalent network boundary.

## Remaining Work

- Add CLI wrappers for:
  - link status
  - token revoke
- Add tests for:
  - issue/status/revoke/max-uses admin API behavior
  - query-token redirect and cookie consumption
  - room switching with existing valid tokens
  - missing `ADMIN_API_TOKEN`
- Add production environment split if this moves beyond one Worker:
  - staging and production names/routes
  - environment-specific `PUBLIC_BASE_URL`
  - documented secret rotation procedure
- Add admin UI revoke/status controls so operators do not need curl for token
  lifecycle operations.
- Convert the sample public renderer in `src/sample-public-page.ts` from
  string-built HTML to `hono/jsx` so the example demonstrates a typed custom UI.
- Change archived-link reissue behavior so archived content can be reviewed or
  accessed by admins without making the link public again. The archive action
  should avoid creating a newly active public URL.
- Decide whether room content should support modes beyond `plain`.
