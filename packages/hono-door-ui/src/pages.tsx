import { adminUiCss } from './styles'
import type { AdminUiPageInput } from './types'

export function renderAdminUiPage(input: AdminUiPageInput = {}) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>短縮リンク管理</title>
        <style dangerouslySetInnerHTML={{ __html: adminUiCss }}></style>
      </head>
      <body>
        <main>
          <header>
            <h1>短縮リンク管理</h1>
            <p class="lead">
              ルーム内容を登録し、期限付きの共有 URL と QR コードを発行します。
            </p>
            <nav class="nav">
              <a href="/admin/ui" aria-current="page">
                発行
              </a>
              <a href="/admin/ui/links">有効リンク一覧</a>
              <a href="/admin/ui/archive">アーカイブ</a>
            </nav>
          </header>

          <div id="admin-issue-root"></div>
        </main>
        <script
          id="admin-ui-props"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: jsonScript(input) }}
        ></script>
        <script type="module" src="/admin/ui/client.js"></script>
      </body>
    </html>
  )
}

export function renderAdminLinkListPage(input: AdminUiPageInput = {}) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>有効リンク一覧</title>
        <style dangerouslySetInnerHTML={{ __html: adminUiCss }}></style>
      </head>
      <body>
        <main>
          <header>
            <h1>有効リンク一覧</h1>
            <p class="lead">
              サーバー側に記録された有効なリンクとトークン情報を表示します。
            </p>
            <nav class="nav">
              <a href="/admin/ui">発行</a>
              <a href="/admin/ui/links" aria-current="page">
                有効リンク一覧
              </a>
              <a href="/admin/ui/archive">アーカイブ</a>
            </nav>
          </header>

          <section class="result">
            <p class="hint">
              管理セッションで一覧を取得します。raw token は保存していないため、URL と QR は発行完了画面で共有してください。
            </p>
            <div id="admin-link-list-root" aria-live="polite"></div>
          </section>
        </main>
        <script
          id="admin-ui-props"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: jsonScript(input) }}
        ></script>
        <script type="module" src="/admin/ui/client.js"></script>
      </body>
    </html>
  )
}

export function renderAdminArchivePage(input: AdminUiPageInput = {}) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>アーカイブ</title>
        <style dangerouslySetInnerHTML={{ __html: adminUiCss }}></style>
      </head>
      <body>
        <main>
          <header>
            <h1>アーカイブ</h1>
            <p class="lead">
              期限切れや無効化済みのリンクを検索し、投稿内容と履歴を確認して再発行します。
            </p>
            <nav class="nav">
              <a href="/admin/ui">発行</a>
              <a href="/admin/ui/links">有効リンク一覧</a>
              <a href="/admin/ui/archive" aria-current="page">
                アーカイブ
              </a>
            </nav>
          </header>

          <section class="result">
            <p class="hint">
              raw token は保存していないため過去 URL は再表示できません。必要な場合は再発行で新しい URL と QR を作成します。
            </p>
            <div id="admin-archive-root" aria-live="polite"></div>
          </section>
        </main>
        <script
          id="admin-ui-props"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: jsonScript(input) }}
        ></script>
        <script type="module" src="/admin/ui/client.js"></script>
      </body>
    </html>
  )
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}
