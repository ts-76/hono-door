import type { Context, Env as HonoEnv } from 'hono'

import type { ShortLinkContext } from './types'

export function defaultPublicPage<T extends HonoEnv>({
  link,
}: {
  c: Context<T>
  link: ShortLinkContext
}): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authorized</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f6f7f9; color: #15171a; }
      main { width: min(520px, calc(100vw - 32px)); }
      h1 { font-size: 1.5rem; line-height: 1.2; margin: 0 0 12px; }
      p { color: #5f6872; font-size: 1rem; line-height: 1.6; margin: 0; }
      @media (prefers-color-scheme: dark) {
        body { background: #101214; color: #f5f7fa; }
        p { color: #aab3bd; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Authorized</h1>
      <p>This request passed token validation. Provide a custom renderer to display application content.</p>
    </main>
  </body>
</html>`
}
