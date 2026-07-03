import type { Context, Env as HonoEnv } from 'hono'
import type { ShortLinkContext } from 'hono-door'

export function renderSamplePublicPage<T extends HonoEnv>({
  link,
}: {
  c: Context<T>
  link: ShortLinkContext
}): string {
  const title = link.room.title
  const body = link.room.body
  const label = link.label ?? 'unlabeled'
  const expiresAt = new Date(link.expiresAt).toLocaleString('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; background: #f4f6f8; color: #14181f; }
      main { width: min(880px, calc(100vw - 32px)); margin: 0 auto; padding: 48px 0; }
      header { display: grid; gap: 10px; margin-bottom: 24px; }
      h1 { margin: 0; font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.05; }
      .eyebrow { margin: 0; color: #1769aa; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .panel { display: grid; gap: 22px; padding: 28px; border: 1px solid #d8dde3; border-radius: 8px; background: #fff; }
      .body { margin: 0; font-size: 1.075rem; line-height: 1.75; white-space: pre-wrap; }
      dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 0; }
      .meta { padding: 12px; border: 1px solid #e2e7ed; border-radius: 8px; background: #f9fafb; }
      dt { color: #5f6872; font-size: .75rem; font-weight: 700; text-transform: uppercase; }
      dd { margin: 4px 0 0; overflow-wrap: anywhere; }
      @media (prefers-color-scheme: dark) {
        body { background: #101214; color: #f5f7fa; }
        .panel { background: #171b20; border-color: #303842; }
        .meta { background: #11151a; border-color: #303842; }
        dt { color: #aab3bd; }
        .eyebrow { color: #7ab7f0; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">Custom public renderer</p>
        <h1>${escapeHtml(title)}</h1>
      </header>
      <section class="panel">
        <p class="body">${escapeHtml(body)}</p>
        ${renderMeta(link, label, expiresAt)}
      </section>
    </main>
  </body>
</html>`
}

function renderMeta(
  link: ShortLinkContext,
  label: string,
  expiresAt: string,
): string {
  return `<dl>
    <div class="meta">
      <dt>Room ID</dt>
      <dd>${escapeHtml(link.roomId)}</dd>
    </div>
    <div class="meta">
      <dt>Token label</dt>
      <dd>${escapeHtml(label)}</dd>
    </div>
    <div class="meta">
      <dt>Role</dt>
      <dd>${escapeHtml(link.role)}</dd>
    </div>
    <div class="meta">
      <dt>Expires</dt>
      <dd>${escapeHtml(expiresAt)}</dd>
    </div>
  </dl>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
