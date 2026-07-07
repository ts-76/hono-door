# Hono Short Link DO

[English](../README.md) | 日本語

Cloudflare Workers と Durable Objects 上で、期限付きの公開リンクを扱う
Hono 向けルートキットです。トークン保護ミドルウェア、管理 API ルート、
任意で使えるブラウザ管理 UI ルート、リンク状態を保存する Durable Object
クラスを含みます。

このリポジトリの Worker は小さく保たれています。Hono に公開リンクルート、
管理 API、任意の管理 UI を mount し、Wrangler の Durable Object binding
が参照するクラス名を export します。

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

## パッケージ

このリポジトリは2つの公開パッケージを提供します。

| Package | 目的 | QR 依存 |
| --- | --- | --- |
| `hono-door` | Hono ルート、トークン保護ミドルウェア、管理 API、Durable Objects | なし |
| `hono-door-ui` | `/admin/ui` に mount する任意のブラウザ管理 UI | あり |

ブラウザ UI が不要な場合は core package だけを入れます。

```bash
bun add hono-door
```

標準の管理 UI も使う場合は両方入れます。

```bash
bun add hono-door hono-door-ui
```

サンプルアプリはローカル CLI のターミナル QR 表示用に
`qrcode-terminal` も使います。この CLI 依存は `hono-door` core package
とは分離されています。

## 要件

- Runtime: Cloudflare Workers。Durable Objects と SQLite-backed Durable
  Object classes を使います。
- Framework: Hono 4.10 以降。
- Package manager: このリポジトリでは Bun を使います。公開パッケージは
  Bun、npm、pnpm などでインストールできます。
- Wrangler config: `PUBLIC_LINKS`, `ROOMS`, `REGISTRY` を bind し、
  `PublicLink`, `Room`, `Registry` に `new_sqlite_classes` migration を
  追加します。
- Worker entrypoint: Wrangler が Durable Object class を instantiate
  できるように `PublicLink`, `Registry`, `Room` を export します。
- Secrets and vars: `ADMIN_API_TOKEN` を設定します。発行 URL に使う origin
  は `PUBLIC_BASE_URL` で設定します。

## 何を提供するか

- `PublicLink` は public link ID ごとの SQLite-backed Durable Object です。
- `Room` は room ID ごとの SQLite-backed Durable Object です。
- `Registry` は管理画面の一覧/検索用に link candidate を保持する
  SQLite-backed Durable Object です。
- トークンは短命のアクセス許可です。保存されるのは SHA-256 hash だけで、
  raw token は発行時のレスポンスで一度だけ返されます。
- public URL の path は安定したまま、背後の room を切り替えられます。
- 管理 JSON API は `Authorization: Bearer <ADMIN_API_TOKEN>` を要求します。
- ブラウザ管理 UI は `ADMIN_API_TOKEN` を一度検証し、その後は `/admin/ui`
  scope の署名付き HttpOnly session cookie を使います。
- `door.public()` は最小の fallback page を含みます。実際の公開画面は
  custom renderer を渡してアプリ側で描画できます。
- 任意ルートを直接守りたい場合は `door.protect()` を middleware として
  使えます。検証済み link context は Hono の variables から読めます。

## Stable Room IDs

`roomId` は、公開リンクの背後にあるアプリケーション所有コンテンツの安定 ID
として扱います。アンケートやイベントなどのカスタムシステムでは、公開単位ごと
に新しい `roomId` を発行し、自分の Durable Object や D1 schema の外部キー
として使います。

`hono-door` は `roomId` を一つの link content として一意に扱います。

- `ROOMS.getByName(roomId)` は常に同じ `Room` Durable Object を指します。
- `Registry.rooms.room_id` は primary key です。
- 別の `linkId` が使用済みの `roomId` へ issue または switch しようとすると
  `409` を返します。
- public renderer は token 検証後に `link.roomId`, `link.linkId`,
  `link.tokenHash`, `link.label`, `link.expiresAt` を受け取れます。

`/admin/rooms/:roomId` を同じ `roomId` で再度呼ぶと、その room の内容を更新
します。issue 時には現在の room state を読み、archive review 用に記録します。
archive-safe な workflow では、survey/event ごとに新しい `roomId` を作って
ください。

## セットアップ

1. 依存関係をインストールします。

   ```bash
   bun install
   ```

2. ローカル管理トークンを作ります。

   ```bash
   printf 'ADMIN_API_TOKEN=local-admin-token\n' > .dev.vars
   ```

3. 依存関係インストール後に Worker types を生成します。

   ```bash
   bun run types
   ```

4. ローカル Worker を起動します。

   ```bash
   bun run dev
   ```

5. Worker の health check を確認します。

   ```bash
   curl http://localhost:8787/health
   ```

期待されるレスポンス:

```json
{"ok":true,"service":"hono-short-link-do"}
```

## Wrangler Durable Objects

`wrangler.jsonc` では、Worker が export する class name と同じ名前で binding
します。

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

Worker entrypoint には必ず次を含めます。

```ts
export { PublicLink, Registry, Room }
```

この export がないと、Wrangler は binding config を読めても Durable Object
class を instantiate できません。

## デフォルト binding

`createDoor()` は次の binding 名をデフォルトで使います。

| Binding | 目的 |
| --- | --- |
| `PUBLIC_LINKS` | `PublicLink` の Durable Object namespace |
| `ROOMS` | `Room` の Durable Object namespace |
| `REGISTRY` | server-side list candidate 用 Durable Object namespace |
| `ADMIN_API_TOKEN` | 管理 API bearer token |
| `PUBLIC_BASE_URL` | 発行 public URL の base URL |

別名の binding を使う場合は resolver を上書きします。

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

## 主なルート

| Method | Path | Auth | 目的 |
| --- | --- | --- | --- |
| `GET` | `/health` | なし | Health check |
| `GET` | `/l/:linkId` | public token | link の現在 room を描画 |
| `GET` | `/admin/ui` | なし | ブラウザ管理 UI shell |
| `POST` | `/admin/ui/api/session` | form token | UI session cookie 作成 |
| `GET` | `/admin/ui/api/links` | UI session | active link list |
| `GET` | `/admin/ui/api/links/archive` | UI session | inactive archive search |
| `GET` | `/admin/links` | bearer admin token | active link list |
| `GET` | `/admin/links/archive` | bearer admin token | inactive archive search |
| `GET` | `/admin/links/archive/:linkId` | bearer admin token | archived link detail |
| `DELETE` | `/admin/links/archive/:linkId` | bearer admin token | inactive archive record 削除 |
| `GET` | `/admin/links/:linkId` | bearer admin token | link status |
| `GET` | `/admin/links/:linkId/tokens` | bearer admin token | active token metadata |
| `GET` | `/admin/links/:linkId/issue-policy` | bearer admin token | issue policy 取得 |
| `PUT` | `/admin/links/:linkId/issue-policy` | bearer admin token | issue policy 更新 |
| `POST` | `/admin/links/:linkId/reissue` | bearer admin token | active token を revoke して再発行 |
| `POST` | `/admin/links/:linkId/archive` | bearer admin token | 再発行せず active token を revoke |
| `POST` | `/admin/links/:linkId/tokens` | bearer admin token | token issue |
| `POST` | `/admin/links/:linkId/switch-room` | bearer admin token | link の room を切り替え |
| `POST` | `/admin/links/:linkId/revoke` | bearer admin token | token hash で revoke |
| `POST` | `/admin/rooms/:roomId` | bearer admin token | room content 設定 |

## リクエスト要件

- 管理 JSON API には `Authorization: Bearer <ADMIN_API_TOKEN>` が必要です。
- JSON body を送るリクエストには `Content-Type: application/json` が必要です。
- public link には `?token=...`、`Authorization: Bearer <raw-token>`、または
  query-token access 後に設定される link-scoped HttpOnly cookie のいずれかが
  必要です。
- raw public token は issue/reissue response でのみ返されます。一覧、archive、
  detail endpoint は token hash と metadata だけを返します。
- `/admin/ui/api/*` は browser UI 用です。bearer auth ではなく signed UI
  session cookie を使います。

## 管理 API の例

環境変数:

```bash
export SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787
export SHORT_LINK_ADMIN_TOKEN=local-admin-token
```

Room content を設定:

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/rooms/room-a" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Summer Event","body":"Welcome"}'
```

Token を issue:

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/tokens" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl":"1h","roomId":"room-a","label":"staff","maxUses":10}'
```

レスポンスには public URL、raw token、token hash、expiry、room ID が含まれます。
raw token は保存されないため、必要な場合はこのレスポンスから控えてください。
revoke 用には `tokenHash` を保存します。

Active links を取得:

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Inactive archive を検索:

```bash
curl -sS "$SHORT_LINK_ADMIN_BASE_URL/admin/links/archive?q=summer" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Reissue:

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/reissue" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Archive before TTL:

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/archive" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN"
```

Token revoke:

```bash
curl -sS -X POST "$SHORT_LINK_ADMIN_BASE_URL/admin/links/summer-event/revoke" \
  -H "Authorization: Bearer $SHORT_LINK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokenHash":"<sha-256-hash-from-issue-response>"}'
```

## CLI

CLI は管理 API の薄い wrapper です。

- `SHORT_LINK_ADMIN_BASE_URL`: デフォルトは `http://localhost:8787`
- `SHORT_LINK_ADMIN_TOKEN`: 必須

Token issue と terminal QR 表示:

```bash
SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787 \
SHORT_LINK_ADMIN_TOKEN=local-admin-token \
bun run token:issue --link summer-event --ttl 1h --room room-a --label staff --max-uses 10
```

Room content 設定:

```bash
SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787 \
SHORT_LINK_ADMIN_TOKEN=local-admin-token \
bun run room:set --room room-a --title "Title" --body "Body"
```

Link の room 切り替え:

```bash
SHORT_LINK_ADMIN_BASE_URL=http://localhost:8787 \
SHORT_LINK_ADMIN_TOKEN=local-admin-token \
bun run link:switch --link summer-event --room room-b
```

現在の CLI は issue、room update、room switch をサポートします。status、revoke、
issue-policy、reissue、archive は API または UI を使ってください。

## Admin and Security Model

- public route は deny-by-default です。token がなければ `401` です。
- invalid token は `401`、revoked/expired/over-used token は `403` です。
- 管理 JSON route は `ADMIN_API_TOKEN` で保護されます。
- 管理 UI は `ADMIN_API_TOKEN` を一度だけ受け取り、署名付き HttpOnly session
  cookie を設定します。token を localStorage、sessionStorage、JavaScript から
  読める cookie には保存しません。
- UI session cookie は `/admin/ui` に scope され、8時間で期限切れになります。
- `/admin/ui/api/*` は browser UI 専用です。CLI と直接 API client は
  bearer-protected な `/admin/*` JSON route を使います。
- list endpoint は raw token を返しません。
- reissue は link の active token をすべて revoke してから、新しい raw token、
  URL、QR-ready URL を返します。
- public response は `Cache-Control: no-store`, `Referrer-Policy: no-referrer`,
  `X-Robots-Tag: noindex` を設定します。
- sensitive な production workflow で使う場合は、admin route を Cloudflare
  Access などの network boundary の内側に置いてください。

## Token Lifecycle

1. 管理者が TTL と任意の `maxUses` を指定して token を issue します。
2. `PublicLink` が raw token を生成し、SHA-256 hash だけを保存します。
3. raw token は issue/reissue response で一度だけ返されます。
4. `PublicLink` は link issue policy として TTL、label、`maxUses` を保存します。
5. `roomId` が指定されている場合、issue 時に link の current room を更新します。
6. `Registry` が管理一覧用の candidate として link を記録します。
7. public access は raw token を hash と照合します。
8. browser の query-token access は HttpOnly cookie を設定し、token query を
   URL から消すために redirect します。この query request は use count を消費
   しません。
9. header-token と cookie-token access は `use_count` を増やします。
10. token は expiry、revoke、または `maxUses` 到達で使えなくなります。
11. expired token row は archive detail のために保持されます。

## Deploy

1. production admin secret を設定します。

   ```bash
   bunx wrangler secret put ADMIN_API_TOKEN
   ```

2. `wrangler.jsonc` の `PUBLIC_BASE_URL` が issued URL に使う deployed route
   または custom domain と一致していることを確認します。

3. dry run を実行します。

   ```bash
   bun run deploy:dry-run
   ```

4. deploy します。

   ```bash
   bun run deploy
   ```

5. deployed Worker を確認します。

   ```bash
   curl https://hono-short-link-do.tsapp.workers.dev/health
   ```

## Verification

コード変更の handoff 前には次を実行します。

```bash
bun run check
```

ドキュメントだけの変更では、変更した Markdown を読み、command example が
`package.json`、`wrangler.jsonc`、`src/index.tsx` の mounted routes と一致して
いることを確認します。

## Maintainer Release Flow

package release は `main` から semantic-release で自動化されています。
release workflow は次の2 packageを publish します。

- `hono-door`
- `hono-door-ui`

`1.0` にするまでは `0.x` line に留めます。`feat:`, `fix:`, `perf:` などの
Conventional release commit は minor version を進めるため、automated release は
`0.x.0` version になります。PR の squash merge title も Conventional Commit
にしてください。英語版の [Maintainer Release Flow](../README.md#maintainer-release-flow)
も参照してください。
