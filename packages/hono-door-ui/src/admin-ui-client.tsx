/** @jsxImportSource hono/jsx/dom */
/// <reference lib="dom" />

import { render, useEffect, useState } from 'hono/jsx/dom'
import { adminUiDefaultLocale, adminUiText, resolveAdminUiLocale, type AdminUiLocale, type AdminUiText } from './i18n'

type AdminUiValues = {
  adminToken?: string
  linkId?: string
  roomId?: string
  ttl?: string
  label?: string
  maxUses?: string
}

type AdminUiResult = {
  linkId: string
  url: string
  expiresAt: string
  roomId: string
  tokenHash: string
  qrSvg: string
  reissued?: boolean
  revokedTokenCount?: number
}

type ArchiveResult = {
  linkId: string
  archived: true
  revokedTokenCount: number
}

type AdminIssuePayload = {
  values?: AdminUiValues
  result?: AdminUiResult
  error?: string
  authenticated?: boolean
  locale?: AdminUiLocale
}

type LinkSummary = {
  linkId: string
  currentRoomId: string
  activeTokenCount: number
  latestIssuedAt: string
  latestExpiresAt: string
}

type TokenSummary = {
  tokenHash: string
  label?: string
  role: string
  roomId: string
  createdAt: string
  expiresAt: string
  revokedAt?: string
  maxUses?: number
  useCount: number
  ttlSeconds?: number
  state?: 'active' | 'expired' | 'revoked' | 'max_uses_reached'
}

type RoomSnapshot = {
  roomId: string
  title?: string
  body?: string
  updatedAt: string
}

type ArchiveLinkSummary = {
  linkId: string
  currentRoomId: string
  latestIssuedAt?: string
  latestExpiresAt?: string
  tokenCount: number
  latestRoom?: RoomSnapshot
}

type ArchiveLinkDetail = ArchiveLinkSummary & {
  rooms: RoomSnapshot[]
  tokens: TokenSummary[]
}

type IssuePolicy = {
  ttlSeconds: number
  role: string
  label?: string
  maxUses?: number
}

type LinkDetailsState =
  | { status: 'loading' }
  | {
      status: 'loaded'
      tokens: TokenSummary[]
      policy: IssuePolicy
      reissueResult?: AdminUiResult
      message?: string | undefined
      error?: string | undefined
    }
  | { status: 'error'; error: string }

type ArchiveDetailState =
  | { status: 'loading' }
  | { status: 'loaded'; detail: ArchiveLinkDetail }
  | { status: 'error'; error: string }

function IssueApp({
  values = {},
  result,
  error,
  authenticated: initialAuthenticated = false,
  locale: initialLocale = adminUiDefaultLocale,
}: AdminIssuePayload) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated)
  const locale = resolveAdminUiLocale(initialLocale)
  const t = adminUiText[locale]

  const logout = () => {
    setAuthenticated(false)
  }

  if (!authenticated) {
    return (
      <>
        {error ? <p class="alert" role="alert">{error}</p> : null}
        <section class="step">
          <div class="step-body">
            <h2>{t.adminToken}</h2>
            <p class="hint">
              {t.adminTokenHint}
            </p>
            <AdminLoginPanel t={t} onAuthenticated={() => setAuthenticated(true)} />
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <SessionBar t={t} onLogout={logout} />
      {error ? <p class="alert" role="alert">{error}</p> : null}

      <form method="post" class="steps">
        <section class="step">
          <div class="step-body">
            <h2>{t.issueTitle}</h2>
            <p class="hint">
              {t.issueHint}
            </p>

            <div class="form-section">
              <div class="form-section-heading">
                <h3>{t.requiredInfo}</h3>
                <p class="hint">{t.requiredInfoHint}</p>
              </div>
              <div class="grid">
                <label>
                  {t.publicPageId}
                  <input
                    name="linkId"
                    required
                    maxLength={128}
                    pattern="[A-Za-z0-9][A-Za-z0-9._~-]*"
                    defaultValue={values.linkId ?? ''}
                    placeholder="summer-event"
                  />
                  <span class="field-help">{t.publicPageIdHelp}</span>
                </label>
                <label>
                  {t.contentId}
                  <input name="roomId" required maxLength={128} defaultValue={values.roomId ?? ''} placeholder="room-a" />
                  <span class="field-help">{t.contentIdHelp}</span>
                </label>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-heading">
                <h3>{t.issueConditions}</h3>
                <p class="hint">{t.issueConditionsHint}</p>
              </div>
              <div class="grid">
                <label>
                  {t.ttl}
                  <input name="ttl" defaultValue={values.ttl ?? '1h'} placeholder="15m" pattern="[0-9]+[smhd]?" />
                  <span class="field-help">{t.ttlHelp}</span>
                </label>
                <label>
                  {t.maxUses}
                  <input
                    name="maxUses"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    step="1"
                    defaultValue={values.maxUses ?? ''}
                    placeholder={t.unlimitedPlaceholder}
                  />
                  <span class="field-help">{t.maxUsesHelp}</span>
                </label>
                <label>
                  {t.label}
                  <input name="label" maxLength={80} defaultValue={values.label ?? ''} placeholder="staff" />
                  <span class="field-help">{t.labelHelp}</span>
                </label>
              </div>
            </div>
            <div class="step-controls">
              <button type="submit">{t.issueSubmit}</button>
            </div>
          </div>
        </section>
      </form>

      {result ? <IssuedResult t={t} result={result} locale={locale} /> : null}
    </>
  )
}

function AdminLoginPanel({ t, onAuthenticated }: { t: AdminUiText; onAuthenticated: () => void }) {
  const [adminToken, setAdminToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string>()

  const login = async () => {
    const token = adminToken.trim()
    if (!token) {
      setStatus('error')
      setError(t.adminTokenRequired)
      return
    }

    setStatus('loading')
    setError(undefined)

    const response = await fetch('/admin/ui/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ adminToken: token }),
    })

    if (!response.ok) {
      setStatus('error')
      setError(await responseError(response))
      return
    }

    setAdminToken('')
    setStatus('idle')
    onAuthenticated()
  }

  return (
    <>
      <form
        class="login-panel"
        onSubmit={(event) => {
          event.preventDefault()
          void login()
        }}
      >
        <label>
          {t.adminToken}
          <input
            type="password"
            autocomplete="current-password"
            value={adminToken}
            onInput={(event: Event) => setAdminToken((event.target as HTMLInputElement | null)?.value ?? '')}
            placeholder={t.adminTokenPlaceholder}
          />
        </label>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? t.loggingIn : t.login}
        </button>
      </form>
      {status === 'error' ? <p class="alert" role="alert">{error}</p> : null}
    </>
  )
}

function SessionBar({ t, onLogout }: { t: AdminUiText; onLogout: () => void }) {
  const [loggingOut, setLoggingOut] = useState(false)

  const logout = async () => {
    setLoggingOut(true)
    await fetch('/admin/ui/api/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    }).catch(() => undefined)
    setLoggingOut(false)
    onLogout()
  }

  return (
    <div class="session-bar">
      <span>{t.sessionAuthenticated}</span>
      <button type="button" class="secondary" disabled={loggingOut} onClick={() => void logout()}>
        {t.logout}
      </button>
    </div>
  )
}

function IssuedResult({ t, result, locale }: { t: AdminUiText; result: AdminUiResult; locale: AdminUiLocale }) {
  return (
    <section class="result handoff-result" aria-live="polite">
      <h2>{t.issuedComplete}</h2>
      <p class="one-time-warning">
        {t.issuedWarning}
      </p>
      <div class="issued-layout">
        <div class="issued-main">
          <label>
            {t.url}
            <input readonly value={result.url} />
          </label>
          <ResultActions t={t} result={result} />
          <LinkMeta t={t} link={result} locale={locale} />
        </div>
        <QrPanel t={t} qrSvg={result.qrSvg} />
      </div>
    </section>
  )
}

function LinkListApp({
  authenticated: initialAuthenticated = false,
  locale: initialLocale = adminUiDefaultLocale,
}: {
  authenticated?: boolean
  locale?: AdminUiLocale | undefined
}) {
  const locale = resolveAdminUiLocale(initialLocale)
  const t = adminUiText[locale]
  const [authenticated, setAuthenticated] = useState(initialAuthenticated)
  const [links, setLinks] = useState<LinkSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [error, setError] = useState<string>()
  const [details, setDetails] = useState<Record<string, LinkDetailsState>>({})
  const [openLinkIds, setOpenLinkIds] = useState<string[]>([])
  const [pendingReissueLinkId, setPendingReissueLinkId] = useState<string>()
  const [pendingArchiveLinkId, setPendingArchiveLinkId] = useState<string>()

  useEffect(() => {
    if (authenticated && status === 'idle') {
      void loadLinks()
    }
  }, [authenticated, status])

  const loadLinks = async (clearDetails = true) => {
    if (!authenticated) {
      setStatus('error')
      setError(t.sessionRequired)
      return
    }

    setStatus('loading')
    setError(undefined)
    if (clearDetails) setDetails({})

    const response = await fetch('/admin/ui/api/links', {
      credentials: 'same-origin',
    })

    if (!response.ok) {
      setStatus('error')
      setError(await responseError(response))
      return
    }

    const body = (await response.json()) as { links?: LinkSummary[] }
    const nextLinks = body.links ?? []
    setLinks(nextLinks)
    setStatus('loaded')
    if (clearDetails) {
      for (const link of nextLinks) {
        void loadDetails(link.linkId, { force: true })
      }
    }
  }

  const loadDetails = async (linkId: string, options: { force?: boolean } = {}) => {
    if (!options.force && (details[linkId]?.status === 'loaded' || details[linkId]?.status === 'loading')) return

    if (!authenticated) return

    setDetails((current) => ({
      ...current,
      [linkId]: { status: 'loading' },
    }))

    const state = await fetchLinkDetails(linkId)
    setDetails((current) => ({
      ...current,
      [linkId]: state,
    }))
  }

  const fetchLinkDetails = async (linkId: string): Promise<LinkDetailsState> => {
    const [tokensResponse, policyResponse] = await Promise.all([
      fetch(`/admin/ui/api/links/${encodeURIComponent(linkId)}/tokens`, {
        credentials: 'same-origin',
      }),
      fetch(`/admin/ui/api/links/${encodeURIComponent(linkId)}/issue-policy`, {
        credentials: 'same-origin',
      }),
    ])

    if (!tokensResponse.ok) {
      return { status: 'error', error: await responseError(tokensResponse) }
    }

    if (!policyResponse.ok) {
      return { status: 'error', error: await responseError(policyResponse) }
    }

    const tokensBody = (await tokensResponse.json()) as { tokens?: TokenSummary[] }
    const policy = (await policyResponse.json()) as IssuePolicy
    return { status: 'loaded', tokens: tokensBody.tokens ?? [], policy }
  }

  const saveIssuePolicy = async (linkId: string, input: IssuePolicyInput) => {
    const current = details[linkId]
    if (!authenticated || current?.status !== 'loaded') return

    const response = await fetch(`/admin/ui/api/links/${encodeURIComponent(linkId)}/issue-policy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await responseError(response)
      setDetails((records) => ({
        ...records,
        [linkId]: {
          ...current,
          error,
        },
      }))
      return
    }

    const policy = (await response.json()) as IssuePolicy
    setDetails((records) => ({
      ...records,
      [linkId]: {
        ...current,
        policy,
        message: t.issuePolicySaved,
        error: undefined,
      },
    }))
  }

  const reissueLink = async (linkId: string, input?: IssuePolicyInput) => {
    const current = details[linkId]
    if (!authenticated || current?.status !== 'loaded' || pendingReissueLinkId !== undefined) return

    setPendingReissueLinkId(linkId)
    try {
      const request: RequestInit = {
        method: 'POST',
        credentials: 'same-origin',
      }
      if (input) {
        request.headers = { 'Content-Type': 'application/json' }
        request.body = JSON.stringify(input)
      }
      const response = await fetch(`/admin/ui/api/links/${encodeURIComponent(linkId)}/reissue`, request)

      if (!response.ok) {
        const error = await responseError(response)
        setDetails((records) => ({
          ...records,
          [linkId]: {
            ...current,
            error,
          },
        }))
        return
      }

      const result = (await response.json()) as AdminUiResult
      const refreshed = await fetchLinkDetails(linkId)
      setDetails((records) => ({
        ...records,
        [linkId]:
          refreshed.status === 'loaded'
            ? {
                ...refreshed,
                reissueResult: result,
                message: t.reissueMessage(result.revokedTokenCount),
                error: undefined,
              }
            : refreshed,
      }))
      void loadLinks(false)
    } finally {
      setPendingReissueLinkId(undefined)
    }
  }

  const archiveLink = async (linkId: string) => {
    const current = details[linkId]
    if (!authenticated || current?.status !== 'loaded' || pendingArchiveLinkId !== undefined) return
    if (!window.confirm(t.archiveConfirm)) return

    setPendingArchiveLinkId(linkId)
    try {
      const response = await fetch(`/admin/ui/api/links/${encodeURIComponent(linkId)}/archive`, {
        method: 'POST',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const error = await responseError(response)
        setDetails((records) => ({
          ...records,
          [linkId]: {
            ...current,
            error,
          },
        }))
        return
      }

      const result = (await response.json()) as ArchiveResult
      setDetails((records) => ({
        ...records,
        [linkId]: {
          ...current,
          message: t.archiveMessage(result.revokedTokenCount),
          error: undefined,
        },
      }))
      setOpenLinkIds((currentOpen) => currentOpen.filter((openLinkId) => openLinkId !== linkId))
      void loadLinks()
    } finally {
      setPendingArchiveLinkId(undefined)
    }
  }

  const logout = () => {
    setAuthenticated(false)
    setStatus('idle')
    setLinks([])
    setDetails({})
    setOpenLinkIds([])
    setPendingReissueLinkId(undefined)
    setPendingArchiveLinkId(undefined)
  }

  if (!authenticated) {
    return (
      <>
        <p class="hint">
          {t.activeLinksLoginHint}
        </p>
        <AdminLoginPanel
          t={t}
          onAuthenticated={() => {
            setAuthenticated(true)
            setStatus('idle')
          }}
        />
      </>
    )
  }

  return (
    <>
      <SessionBar t={t} onLogout={logout} />
      <div class="list-header">
        <div>
          <h2>{t.activeLinksSection}</h2>
          <p class="hint">
            {t.activeLinksSectionHint}
          </p>
        </div>
        <form
          class="list-auth"
          onSubmit={(event) => {
            event.preventDefault()
            void loadLinks()
          }}
        >
          <button type="submit" class="secondary" disabled={status === 'loading'}>
            {status === 'loading' ? t.loadingList : t.refreshList}
          </button>
        </form>
      </div>
      {status === 'error' ? <p class="alert" role="alert">{error}</p> : null}
      {status === 'loaded' && links.length === 0 ? (
        <p class="empty-state">{t.noActiveLinks}</p>
      ) : null}
      {links.length > 0 ? (
        <div class="link-list">
          {links.map((link) => {
            const detailOpen = openLinkIds.includes(link.linkId)
            return (
              <article class="link-item" key={link.linkId}>
                <div class="active-link-row">
                  <div class="link-item-main">
                    <h3>{link.linkId || 'link'}</h3>
                    <dl class="compact-meta">
                      <div>
                        <dt>{t.contentId}</dt>
                        <dd>{link.currentRoomId}</dd>
                      </div>
                      <div>
                        <dt>{t.latestExpiry}</dt>
                        <dd>{formatDateTime(link.latestExpiresAt, locale)}</dd>
                      </div>
                    </dl>
                  </div>
                  <ActiveRowActions
                    t={t}
                    detailsOpen={detailOpen}
                    onToggleDetails={() => {
                      setOpenLinkIds((current) =>
                        current.includes(link.linkId)
                          ? current.filter((openLinkId) => openLinkId !== link.linkId)
                          : [...current, link.linkId],
                      )
                      void loadDetails(link.linkId)
                    }}
                    onArchive={() => void archiveLink(link.linkId)}
                    archiving={pendingArchiveLinkId === link.linkId}
                    disabled={pendingArchiveLinkId !== undefined || pendingReissueLinkId !== undefined}
                  />
                </div>
                {detailOpen ? (
                <div class="link-detail-body">
                  <LinkDetails
                    state={details[link.linkId]}
                    t={t}
                    locale={locale}
                    onSavePolicy={(input) => void saveIssuePolicy(link.linkId, input)}
                    onReissue={(input) => void reissueLink(link.linkId, input)}
                    reissuing={pendingReissueLinkId === link.linkId}
                    archiving={pendingArchiveLinkId === link.linkId}
                  />
                </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </>
  )
}

type IssuePolicyInput = {
  ttl?: string
  role?: string
  label?: string | null
  maxUses?: string | null
}

function ActiveRowActions({
  t,
  detailsOpen,
  onToggleDetails,
  onArchive,
  archiving,
  disabled,
}: {
  t: AdminUiText
  detailsOpen: boolean
  onToggleDetails(): void
  onArchive(): void
  archiving: boolean
  disabled: boolean
}) {
  return (
    <aside class="active-row-actions">
      <button type="button" class="secondary" onClick={onToggleDetails}>
        {detailsOpen ? t.closeDetails : t.details}
      </button>
      <button type="button" class="danger" disabled={disabled || archiving} onClick={onArchive}>
        {archiving ? t.archiving : t.archiveManual}
      </button>
    </aside>
  )
}

function LinkDetails({
  state,
  t,
  locale,
  onSavePolicy,
  onReissue,
  reissuing,
  archiving,
}: {
  state: LinkDetailsState | undefined
  t: AdminUiText
  locale: AdminUiLocale
  onSavePolicy(input: IssuePolicyInput): void
  onReissue(input: IssuePolicyInput): void
  reissuing: boolean
  archiving: boolean
}) {
  if (!state || state.status === 'loading') {
    return <p class="empty-state">{t.loadingDetails}</p>
  }

  if (state.status === 'error') {
    return <p class="alert" role="alert">{state.error}</p>
  }

  return (
    <div class="link-details-content">
      {state.error ? <p class="alert" role="alert">{state.error}</p> : null}
      {state.message ? <p class="hint status-message" role="status">{state.message}</p> : null}
      {state.reissueResult ? <ReissuedResult t={t} result={state.reissueResult} locale={locale} /> : null}
      <IssuePolicyForm
        t={t}
        policy={state.policy}
        onSave={onSavePolicy}
        onReissue={onReissue}
        reissuing={reissuing}
        archiving={archiving}
      />
    </div>
  )
}

function IssuePolicyForm({
  policy,
  t,
  onSave,
  onReissue,
  reissuing,
  archiving,
}: {
  policy: IssuePolicy
  t: AdminUiText
  onSave(input: IssuePolicyInput): void
  onReissue(input: IssuePolicyInput): void
  reissuing: boolean
  archiving: boolean
}) {
  return (
    <form
      class="policy-form"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget as HTMLFormElement
        onSave(issuePolicyInputFromForm(form, policy))
      }}
    >
      <section class="detail-section">
        <h3>{t.nextIssuePolicy}</h3>
        <p class="hint">{t.nextIssuePolicyHint}</p>
        <div class="grid">
          <label>
            {t.ttl}
            <input name="ttl" defaultValue={formatTtl(policy.ttlSeconds)} placeholder="15m" pattern="[0-9]+[smhd]?" />
            <span class="field-help">{t.currentSetting}: {formatDuration(policy.ttlSeconds, t)}</span>
          </label>
          <label>
            {t.role}
            <input name="role" maxLength={80} defaultValue={policy.role} placeholder="viewer" />
          </label>
          <label>
            {t.label}
            <input name="label" maxLength={80} defaultValue={policy.label ?? ''} placeholder="reissued" />
          </label>
          <label>
            {t.maxUses}
            <input
              name="maxUses"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              defaultValue={policy.maxUses ?? ''}
              placeholder={t.unlimitedPlaceholder}
            />
          </label>
        </div>
        <div class="step-controls">
          <button type="submit" class="secondary">
            {t.saveIssuePolicy}
          </button>
          <button
            type="button"
            disabled={reissuing || archiving}
            onClick={(event) => {
              const form = (event.currentTarget as HTMLButtonElement).form
              if (!form) return
              onReissue(issuePolicyInputFromForm(form, policy))
            }}
          >
            {reissuing ? t.reissuing : t.reissue}
          </button>
        </div>
      </section>
    </form>
  )
}

function issuePolicyInputFromForm(form: HTMLFormElement, policy: IssuePolicy): IssuePolicyInput {
  const data = new FormData(form)
  const label = formDataString(data, 'label')
  const maxUses = formDataString(data, 'maxUses')
  return {
    ttl: formDataString(data, 'ttl') ?? String(policy.ttlSeconds),
    role: formDataString(data, 'role') ?? policy.role,
    label: label ?? null,
    maxUses: maxUses ?? null,
  }
}

function ReissuedResult({ t, result, locale }: { t: AdminUiText; result: AdminUiResult; locale: AdminUiLocale }) {
  return (
    <section class="reissue-result handoff-result" aria-live="polite">
      <h2>{t.reissuedComplete}</h2>
      <p class="one-time-warning">{t.reissuedWarning}</p>
      <div class="issued-layout">
        <div class="issued-main">
          <label>
            {t.url}
            <input readonly value={result.url} />
          </label>
          <ResultActions t={t} result={result} />
          <LinkMeta t={t} link={result} locale={locale} />
        </div>
        <QrPanel t={t} qrSvg={result.qrSvg} />
      </div>
    </section>
  )
}

function ArchiveApp({
  authenticated: initialAuthenticated = false,
  locale: initialLocale = adminUiDefaultLocale,
}: {
  authenticated?: boolean
  locale?: AdminUiLocale | undefined
}) {
  const locale = resolveAdminUiLocale(initialLocale)
  const t = adminUiText[locale]
  const [authenticated, setAuthenticated] = useState(initialAuthenticated)
  const [query, setQuery] = useState('')
  const [links, setLinks] = useState<ArchiveLinkSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [error, setError] = useState<string>()
  const [details, setDetails] = useState<Record<string, ArchiveDetailState>>({})
  const [pendingDeleteLinkId, setPendingDeleteLinkId] = useState<string>()

  useEffect(() => {
    if (authenticated && status === 'idle') {
      void loadArchive()
    }
  }, [authenticated, status])

  const loadArchive = async () => {
    if (!authenticated) {
      setStatus('error')
      setError(t.sessionRequired)
      return
    }

    setStatus('loading')
    setError(undefined)
    setDetails({})

    const url = new URL('/admin/ui/api/links/archive', window.location.origin)
    const trimmed = query.trim()
    if (trimmed) url.searchParams.set('q', trimmed)

    const response = await fetch(url, { credentials: 'same-origin' })
    if (!response.ok) {
      setStatus('error')
      setError(await responseError(response))
      return
    }

    const body = (await response.json()) as { links?: ArchiveLinkSummary[] }
    const nextLinks = body.links ?? []
    setLinks(nextLinks)
    setStatus('loaded')
    for (const link of nextLinks) {
      void loadDetail(link.linkId, { force: true })
    }
  }

  const loadDetail = async (linkId: string, options: { force?: boolean } = {}) => {
    if (!options.force && (details[linkId]?.status === 'loaded' || details[linkId]?.status === 'loading')) return

    setDetails((current) => ({
      ...current,
      [linkId]: { status: 'loading' },
    }))

    const response = await fetch(`/admin/ui/api/links/archive/${encodeURIComponent(linkId)}`, {
      credentials: 'same-origin',
    })
    if (!response.ok) {
      const error = await responseError(response)
      setDetails((current) => ({
        ...current,
        [linkId]: { status: 'error', error },
      }))
      return
    }

    const detail = (await response.json()) as ArchiveLinkDetail
    setDetails((current) => ({
      ...current,
      [linkId]: { status: 'loaded', detail },
    }))
  }

  const deleteArchiveLink = async (linkId: string) => {
    if (pendingDeleteLinkId !== undefined) return
    if (!window.confirm(t.deleteArchiveConfirm)) return

    setPendingDeleteLinkId(linkId)
    setError(undefined)
    try {
      const response = await fetch(`/admin/ui/api/links/archive/${encodeURIComponent(linkId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        setStatus('error')
        setError(await responseError(response))
        return
      }

      setLinks((current) => current.filter((link) => link.linkId !== linkId))
      setDetails((current) => {
        const next = { ...current }
        delete next[linkId]
        return next
      })
    } finally {
      setPendingDeleteLinkId(undefined)
    }
  }

  const logout = () => {
    setAuthenticated(false)
    setStatus('idle')
    setLinks([])
    setDetails({})
    setPendingDeleteLinkId(undefined)
  }

  if (!authenticated) {
    return (
      <>
        <p class="hint">{t.archiveLoginHint}</p>
        <AdminLoginPanel
          t={t}
          onAuthenticated={() => {
            setAuthenticated(true)
            setStatus('idle')
          }}
        />
      </>
    )
  }

  return (
    <>
      <SessionBar t={t} onLogout={logout} />
      <form
        class="list-auth"
        onSubmit={(event) => {
          event.preventDefault()
          void loadArchive()
        }}
      >
        <label>
          {t.search}
          <input
            value={query}
            onInput={(event: Event) => setQuery((event.target as HTMLInputElement | null)?.value ?? '')}
            placeholder="linkId / roomId / label / title / body"
          />
        </label>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? t.searching : t.archiveSearch}
        </button>
      </form>
      <p class="hint">{t.archiveSearchHint}</p>
      {status === 'error' ? <p class="alert" role="alert">{error}</p> : null}
      {status === 'loaded' && links.length === 0 ? (
        <p class="empty-state">{t.noArchive}</p>
      ) : null}
      {links.length > 0 ? (
        <div class="link-list">
          {links.map((link) => (
            <article class="link-item" key={link.linkId}>
              <div class="archive-link-row">
                <div class="link-item-main">
                  <h3>{link.linkId}</h3>
                  <dl class="compact-meta">
                    <div>
                      <dt>{t.contentId}</dt>
                      <dd>{link.currentRoomId}</dd>
                    </div>
                    <div>
                      <dt>{t.latestExpiry}</dt>
                      <dd>{link.latestExpiresAt ? formatDateTime(link.latestExpiresAt, locale) : t.none}</dd>
                    </div>
                  </dl>
                </div>
                <ArchiveRowActions
                  t={t}
                  linkId={link.linkId}
                  room={link.latestRoom}
                  onDelete={() => void deleteArchiveLink(link.linkId)}
                  deleting={pendingDeleteLinkId === link.linkId}
                  deleteDisabled={pendingDeleteLinkId !== undefined}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </>
  )
}

function ArchiveRowActions({
  t,
  linkId,
  room,
  onDelete,
  deleting,
  deleteDisabled,
}: {
  t: AdminUiText
  linkId: string
  room?: RoomSnapshot | undefined
  onDelete: () => void
  deleting: boolean
  deleteDisabled: boolean
}) {
  return (
    <aside class="archive-actions">
      <PreviewLink t={t} linkId={linkId} room={room} />
      <button type="button" class="danger archive-delete-button" disabled={deleteDisabled} onClick={onDelete}>
        {deleting ? t.deletingArchive : t.deleteArchive}
      </button>
    </aside>
  )
}

function PreviewLink({ t, linkId, room }: { t: AdminUiText; linkId: string; room?: RoomSnapshot | undefined }) {
  if (!room) return <p class="hint archive-preview-unavailable">{t.previewUnavailable}</p>
  const previewPath = archivePreviewPath(linkId, room.roomId)

  return (
    <a class="inline-link archive-preview-link" href={previewPath} target="_blank" rel="noreferrer">
      {t.openAdminPreview}
    </a>
  )
}

function archivePreviewPath(linkId: string, roomId: string) {
  return `/admin/ui/archive/${encodeURIComponent(linkId)}/rooms/${encodeURIComponent(roomId)}/preview`
}

function formDataString(data: FormData, name: string): string | undefined {
  const value = data.get(name)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function formatTtl(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400}d`
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds % 60 === 0) return `${seconds / 60}m`
  return String(seconds)
}

function LinkMeta({ t, link, locale }: { t: AdminUiText; link: Pick<AdminUiResult, 'expiresAt' | 'roomId'>; locale: AdminUiLocale }) {
  return (
    <dl>
      <div>
        <dt>{t.expires}</dt>
        <dd>{formatDateTime(link.expiresAt, locale)}</dd>
      </div>
      <div>
        <dt>{t.contentId}</dt>
        <dd>{link.roomId}</dd>
      </div>
    </dl>
  )
}

function ResultActions({ t, result }: { t: AdminUiText; result: AdminUiResult }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const copyUrl = async () => {
    setCopyStatus('copied')
    const copied = await copyText(result.url)
    if (!copied) setCopyStatus('error')
  }

  const downloadQr = () => {
    try {
      const blob = new Blob([result.qrSvg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${safeFilename(result.linkId || 'hono-door-link')}-qr.svg`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setDownloadStatus('saved')
    } catch {
      setDownloadStatus('error')
    }
  }

  return (
    <>
      <div class="actions result-actions">
        <button type="button" onClick={() => void copyUrl()}>
          {t.copyUrl}
        </button>
        <button type="button" class="secondary" onClick={downloadQr}>
          {t.saveQr}
        </button>
        <a href={result.url} target="_blank" rel="noreferrer">
          {t.openUrl}
        </a>
      </div>
      <p class="field-help" role="status" aria-live="polite">
        {copyStatus === 'copied'
          ? t.copySuccess
          : copyStatus === 'error'
            ? t.copyError
            : downloadStatus === 'saved'
              ? t.qrSaveSuccess
              : downloadStatus === 'error'
                ? t.qrSaveError
                : t.copyOrSaveHint}
      </p>
    </>
  )
}

function QrPanel({ t, qrSvg }: { t: AdminUiText; qrSvg: string }) {
  return (
    <div class="qr-panel">
      <div class="qr-code" aria-label={t.qrCode} dangerouslySetInnerHTML={{ __html: qrSvg }} />
    </div>
  )
}

async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Continue to the textarea fallback for browsers that block clipboard permissions.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto -9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

function safeFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'hono-door-link'
}

function formatDateTime(value: string, locale: AdminUiLocale): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDuration(seconds: number, t: AdminUiText): string {
  if (seconds % 86400 === 0) return t === adminUiText.ja ? `${seconds / 86400}日` : `${seconds / 86400}d`
  if (seconds % 3600 === 0) return t === adminUiText.ja ? `${seconds / 3600}時間` : `${seconds / 3600}h`
  if (seconds % 60 === 0) return t === adminUiText.ja ? `${seconds / 60}分` : `${seconds / 60}m`
  return t === adminUiText.ja ? `${seconds}秒` : `${seconds}s`
}

function readIssuePayload(): AdminIssuePayload {
  const element = document.getElementById('admin-ui-props')
  if (!element?.textContent) return {}

  try {
    return JSON.parse(element.textContent)
  } catch {
    return {}
  }
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error ?? `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

const adminUiPayload = readIssuePayload()

const issueRoot = document.getElementById('admin-issue-root')
if (issueRoot) {
  render(<IssueApp {...adminUiPayload} />, issueRoot)
}

const listRoot = document.getElementById('admin-link-list-root')
if (listRoot) {
  render(<LinkListApp authenticated={Boolean(adminUiPayload.authenticated)} locale={adminUiPayload.locale} />, listRoot)
}

const archiveRoot = document.getElementById('admin-archive-root')
if (archiveRoot) {
  render(<ArchiveApp authenticated={Boolean(adminUiPayload.authenticated)} locale={adminUiPayload.locale} />, archiveRoot)
}
