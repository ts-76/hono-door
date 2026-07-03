import { adminUiCss } from './styles'
import { adminUiDefaultLocale, adminUiText, resolveAdminUiLocale } from './i18n'
import type { AdminUiPageInput } from './types'

type ArchiveRoomPreviewInput = {
  linkId: string
  room: {
    roomId: string
    title?: string | undefined
    body?: string | undefined
    updatedAt: string
  }
}

export function renderAdminUiPage(input: AdminUiPageInput = {}) {
  const locale = resolveAdminUiLocale(input.locale)
  const t = adminUiText[locale]
  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t.appTitle}</title>
        <style dangerouslySetInnerHTML={{ __html: adminUiCss }}></style>
      </head>
      <body>
        <main>
          <header>
            <h1>{t.appTitle}</h1>
            <p class="lead">{t.appLead}</p>
            <AdminNav active="issue" t={t} />
          </header>

          <div id="admin-issue-root"></div>
        </main>
        <script
          id="admin-ui-props"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: jsonScript({ ...input, locale }) }}
        ></script>
        <script type="module" src="/admin/ui/client.js"></script>
      </body>
    </html>
  )
}

function AdminNav({ active, t }: { active: 'issue' | 'links' | 'archive'; t: typeof adminUiText[typeof adminUiDefaultLocale] }) {
  return (
    <nav class="nav">
      <a href="/admin/ui" aria-current={active === 'issue' ? 'page' : undefined}>
        {t.navIssue}
      </a>
      <a href="/admin/ui/links" aria-current={active === 'links' ? 'page' : undefined}>
        {t.navLinks}
      </a>
      <a href="/admin/ui/archive" aria-current={active === 'archive' ? 'page' : undefined}>
        {t.navArchive}
      </a>
    </nav>
  )
}

export function renderAdminLinkListPage(input: AdminUiPageInput = {}) {
  const locale = resolveAdminUiLocale(input.locale)
  const t = adminUiText[locale]
  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t.activeLinksTitle}</title>
        <style dangerouslySetInnerHTML={{ __html: adminUiCss }}></style>
      </head>
      <body>
        <main>
          <header>
            <h1>{t.activeLinksTitle}</h1>
            <p class="lead">{t.activeLinksLead}</p>
            <AdminNav active="links" t={t} />
          </header>

          <section class="workspace">
            <p class="hint">{t.linkListIntro}</p>
            <div id="admin-link-list-root" aria-live="polite"></div>
          </section>
        </main>
        <script
          id="admin-ui-props"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: jsonScript({ ...input, locale }) }}
        ></script>
        <script type="module" src="/admin/ui/client.js"></script>
      </body>
    </html>
  )
}

export function renderAdminArchivePage(input: AdminUiPageInput = {}) {
  const locale = resolveAdminUiLocale(input.locale)
  const t = adminUiText[locale]
  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t.archiveTitle}</title>
        <style dangerouslySetInnerHTML={{ __html: adminUiCss }}></style>
      </head>
      <body>
        <main>
          <header>
            <h1>{t.archiveTitle}</h1>
            <p class="lead">{t.archiveLead}</p>
            <AdminNav active="archive" t={t} />
          </header>

          <section class="workspace">
            <p class="hint">{t.archiveIntro}</p>
            <div id="admin-archive-root" aria-live="polite"></div>
          </section>
        </main>
        <script
          id="admin-ui-props"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: jsonScript({ ...input, locale }) }}
        ></script>
        <script type="module" src="/admin/ui/client.js"></script>
      </body>
    </html>
  )
}

export function renderAdminArchivePreviewPage({ linkId, room }: ArchiveRoomPreviewInput) {
  const t = adminUiText[adminUiDefaultLocale]
  return (
    <html lang={adminUiDefaultLocale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{room.title ?? room.roomId}</title>
        <style dangerouslySetInnerHTML={{ __html: adminUiCss }}></style>
      </head>
      <body>
        <main>
          <header>
            <p class="eyebrow">{t.adminPreview}</p>
            <h1>{room.title ?? room.roomId}</h1>
            <p class="lead">{t.archivePreviewLead}</p>
            <nav class="nav">
              <a href="/admin/ui/archive">{t.archiveBack}</a>
            </nav>
          </header>

          <section class="result">
            <dl class="compact-meta">
              <div>
                <dt>Link ID</dt>
                <dd>{linkId}</dd>
              </div>
              <div>
                <dt>Room ID</dt>
                <dd>{room.roomId}</dd>
              </div>
              <div>
                <dt>{t.updatedAt}</dt>
                <dd>{room.updatedAt}</dd>
              </div>
            </dl>
            <article class="archive-preview">
              <p>{room.body ?? t.noBody}</p>
            </article>
          </section>
        </main>
      </body>
    </html>
  )
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}
