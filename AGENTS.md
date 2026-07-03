# Agent Guide

## Scope

This repo is a Cloudflare Workers + Hono short-link project. The implementation
source is already present; documentation work should stay aligned with the real
code instead of describing planned behavior as if it exists.

## Shell Rule

Prefix shell commands with `rtk`.

```bash
rtk bun run check
rtk bun run dev
rtk rg -n "PublicLink|Room" src packages wrangler.jsonc
```

## Ownership Boundaries

For documentation-only tasks, edit only:

- `README.md`
- `PLAN.md`
- `AGENTS.md`
- `docs/*`

Do not edit source, package, lockfile, generated Worker types, or Wrangler
configuration unless the user explicitly expands the scope.

The user may have unrelated edits in the tree. Do not revert files you did not
change.

## Source Of Truth Checklist

Before changing onboarding docs, verify these files:

- `src/index.tsx` for mounted routes and `export { PublicLink, Registry, Room }`
- `wrangler.jsonc` for Durable Object bindings, migrations, routes, vars, and
  compatibility settings
- `packages/hono-door/src/admin-api.ts` for admin endpoints and request schemas
- `packages/hono-door/src/durable-objects/public-link.ts` for token lifecycle,
  status, revoke, and `maxUses`
- `packages/hono-door/src/durable-objects/registry.ts` for server-side link
  list candidates
- `packages/hono-door/src/middleware.ts` for public-token auth behavior
- `packages/hono-door-ui/src/index.ts` for optional browser admin UI routes
- `scripts/admin.ts` and `package.json` for actual CLI commands

## Implementation Notes

- `PublicLink`, `Registry`, and `Room` must be exported from the Worker
  entrypoint because Wrangler Durable Object bindings reference those class
  names.
- `PUBLIC_LINKS`, `REGISTRY`, and `ROOMS` are the default binding names used by
  `createDoor()`.
- The browser admin UI is a separate package, `hono-door-ui`; do not reintroduce
  `hono-door/ui` as a subpath export unless the package split is intentionally
  reverted.
- `ADMIN_API_TOKEN` is the admin bearer secret. Local development reads it from
  `.dev.vars`; production should use a Wrangler secret.
- The browser admin UI validates `ADMIN_API_TOKEN` once and stores only a signed
  HttpOnly session cookie scoped to `/admin/ui`. Do not store the raw token in
  localStorage, sessionStorage, or a JavaScript-readable cookie.
- `PUBLIC_BASE_URL` controls URLs returned by token issue operations.
- Raw public tokens are returned only when issued. Durable Object storage keeps
  token hashes, not raw tokens.
- `PublicLink` stores link-level issue policy (`ttlSeconds`, `role`, `label`,
  `maxUses`). Reissue uses that policy and the current room, revokes all active
  tokens, and returns the new raw token only in the response.
- `GET /admin/links` uses `Registry` only for link candidates, then refreshes
  active counts and latest active-token timestamps from `PublicLink`.
  `GET /admin/links/:linkId/tokens` reads active token detail from `PublicLink`.
  These endpoints cannot reconstruct public URLs or QR codes because raw tokens
  are not stored.
- `GET /admin/links/archive` searches inactive links through `Registry`, then
  checks `PublicLink` so only links with no active token are returned.
- `GET /admin/links/archive/:linkId` returns room title/body snapshots from
  `Registry` plus retained token history from `PublicLink`.
- `/admin/ui/api/*` routes are UI-only cookie-session proxies. Keep CLI/API
  routes bearer-token based unless the user explicitly requests a broader auth
  change.
- `maxUses` limits consumed accesses. Query-token browser access first redirects
  into an HTTP-only cookie without consuming the query request; cookie and bearer
  access consume uses.
- Current CLI commands are `token:issue`, `room:set`, and `link:switch`.
  Revoke, status, issue-policy, and reissue exist in the API but do not yet
  have CLI wrappers.

## Verification

Use the smallest verification that matches the change:

- Docs only: inspect changed Markdown and cross-check examples against the files
  listed in the source-of-truth checklist.
- Code or config change: run `rtk bun run check`.
- Local runtime behavior: run `rtk bun run dev`, then verify `/health`, issue a
  token, open the returned public URL, check status, and revoke the token hash
  through the admin API.

Do not leave a required dev server running when the task is complete.
