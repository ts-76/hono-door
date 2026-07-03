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
    setLinks(body.links ?? [])
    setStatus('loaded')

    if (clearDetails) {
      for (const linkId of openLinkIds) {
        void loadDetails(linkId, { force: true })
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

  const reissueLink = async (linkId: string) => {
    const current = details[linkId]
    if (!authenticated || current?.status !== 'loaded' || pendingReissueLinkId !== undefined) return

    setPendingReissueLinkId(linkId)
    try {
      const response = await fetch(`/admin/ui/api/links/${encodeURIComponent(linkId)}/reissue`, {
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
          {links.map((link) => (
            <article class="link-item" key={link.linkId}>
              <div class="link-item-main">
                <h3>{link.linkId || 'link'}</h3>
                <dl class="compact-meta">
                  <div>
                    <dt>{t.contentId}</dt>
                    <dd>{link.currentRoomId}</dd>
                  </div>
                  <div>
                    <dt>{t.activeTokens}</dt>
                    <dd>{link.activeTokenCount}</dd>
                  </div>
                  <div>
                    <dt>{t.latestExpiry}</dt>
                    <dd>{formatDateTime(link.latestExpiresAt, locale)}</dd>
                  </div>
                </dl>
              </div>
              <details
                class="link-detail"
                onToggle={(event: Event) => {
                  const opened = Boolean((event.target as HTMLDetailsElement | null)?.open)
                  setOpenLinkIds((current) =>
                    opened
                      ? current.includes(link.linkId)
                        ? current
                        : [...current, link.linkId]
                      : current.filter((openLinkId) => openLinkId !== link.linkId),
                  )
                  if (opened) void loadDetails(link.linkId)
                }}
              >
                <summary>{t.details}</summary>
                <div class="link-detail-body">
                  <p class="hint">
                    {t.tokenNotStoredHint}
                  </p>
                <LinkDetails
                  state={details[link.linkId]}
                  t={t}
                  locale={locale}
                  onSavePolicy={(input) => void saveIssuePolicy(link.linkId, input)}
                  onReissue={() => void reissueLink(link.linkId)}
                  onArchive={() => void archiveLink(link.linkId)}
                  reissuing={pendingReissueLinkId === link.linkId}
                  archiving={pendingArchiveLinkId === link.linkId}
                />
                </div>
              </details>
            </article>
          ))}
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

function LinkDetails({
  state,
  t,
  locale,
  onSavePolicy,
  onReissue,
  onArchive,
  reissuing,
  archiving,
}: {
  state: LinkDetailsState | undefined
  t: AdminUiText
  locale: AdminUiLocale
  onSavePolicy(input: IssuePolicyInput): void
  onReissue(): void
  onArchive(): void
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
      <section class="detail-section">
        <h3>{t.activeTokenSection}</h3>
        <TokenList t={t} tokens={state.tokens} locale={locale} />
      </section>
      <IssuePolicyForm
        t={t}
        policy={state.policy}
        onSave={onSavePolicy}
        onReissue={onReissue}
        onArchive={onArchive}
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
  onArchive,
  reissuing,
  archiving,
}: {
  policy: IssuePolicy
  t: AdminUiText
  onSave(input: IssuePolicyInput): void
  onReissue(): void
  onArchive(): void
  reissuing: boolean
  archiving: boolean
}) {
  return (
    <form
      class="policy-form"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget as HTMLFormElement
        const data = new FormData(form)
        const label = formDataString(data, 'label')
        const maxUses = formDataString(data, 'maxUses')
        onSave({
          ttl: formDataString(data, 'ttl') ?? String(policy.ttlSeconds),
          role: formDataString(data, 'role') ?? policy.role,
          label: label ?? null,
          maxUses: maxUses ?? null,
        })
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
          <button type="button" disabled={reissuing || archiving} onClick={onReissue}>
            {reissuing ? t.reissuing : t.reissue}
          </button>
        </div>
      </section>
      <section class="detail-section danger-zone">
        <h3>{t.dangerZone}</h3>
        <p class="hint">{t.dangerArchiveHint}</p>
        <div class="step-controls">
          <button type="button" class="danger" disabled={reissuing || archiving} onClick={onArchive}>
            {archiving ? t.archiving : t.archiveManual}
          </button>
        </div>
      </section>
    </form>
  )
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

function TokenList({ t, tokens, locale }: { t: AdminUiText; tokens: TokenSummary[]; locale: AdminUiLocale }) {
  if (tokens.length === 0) {
    return <p class="empty-state">{t.noActiveTokens}</p>
  }

  return (
    <div class="token-list">
      {tokens.map((token) => (
        <article class="token-item" key={token.tokenHash}>
          <dl>
            <div>
              <dt>{t.label}</dt>
              <dd>{token.label ?? t.none}</dd>
            </div>
            <div>
              <dt>{t.role}</dt>
              <dd>{token.role}</dd>
            </div>
            <div>
              <dt>{t.contentId}</dt>
              <dd>{token.roomId}</dd>
            </div>
            <div>
              <dt>{t.expires}</dt>
              <dd>{formatDateTime(token.expiresAt, locale)}</dd>
            </div>
            <div>
              <dt>{t.useCount}</dt>
              <dd>
                {token.useCount}
                {token.maxUses ? ` / ${token.maxUses}` : ''}
              </dd>
            </div>
            <div>
              <dt>{t.tokenHash}</dt>
              <dd>{token.tokenHash}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
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
    setLinks(body.links ?? [])
    setStatus('loaded')
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
              <div class="link-item-main">
                <h3>{link.linkId}</h3>
                <dl class="compact-meta">
                  <div>
                    <dt>{t.contentId}</dt>
                    <dd>{link.currentRoomId}</dd>
                  </div>
                  <div>
                    <dt>{t.tokenCount}</dt>
                    <dd>{link.tokenCount}</dd>
                  </div>
                  <div>
                    <dt>{t.latestExpiry}</dt>
                    <dd>{link.latestExpiresAt ? formatDateTime(link.latestExpiresAt, locale) : t.none}</dd>
                  </div>
                </dl>
                <RoomPreview t={t} linkId={link.linkId} room={link.latestRoom} />
              </div>
              <details
                class="link-detail"
                onToggle={(event: Event) => {
                  const opened = Boolean((event.target as HTMLDetailsElement | null)?.open)
                  if (opened) void loadDetail(link.linkId)
                }}
              >
                <summary>{t.viewArchiveDetails}</summary>
                <div class="link-detail-body">
                  <ArchiveDetails
                    t={t}
                    locale={locale}
                    linkId={link.linkId}
                    state={details[link.linkId]}
                    onDelete={() => void deleteArchiveLink(link.linkId)}
                    deleting={pendingDeleteLinkId === link.linkId}
                    deleteDisabled={pendingDeleteLinkId !== undefined}
                  />
                </div>
              </details>
            </article>
          ))}
        </div>
      ) : null}
    </>
  )
}

function ArchiveDetails({
  t,
  locale,
  linkId,
  state,
  onDelete,
  deleting,
  deleteDisabled,
}: {
  t: AdminUiText
  locale: AdminUiLocale
  linkId: string
  state: ArchiveDetailState | undefined
  onDelete: () => void
  deleting: boolean
  deleteDisabled: boolean
}) {
  if (!state || state.status === 'loading') {
    return <p class="empty-state">{t.loadingDetails}</p>
  }

  if (state.status === 'error') {
    return <p class="alert" role="alert">{state.error}</p>
  }

  return (
    <div class="link-details-content">
      <p class="hint">
        {t.archiveDetailsHint}
      </p>
      <section class="archive-room">
        <h3>{t.contentSection}</h3>
        {state.detail.rooms.length === 0 ? (
          <p class="empty-state">{t.noSavedContent}</p>
        ) : (
          state.detail.rooms.map((room) => <RoomCard t={t} locale={locale} linkId={linkId} room={room} key={room.roomId} />)
        )}
      </section>
      <ArchiveTokenList t={t} locale={locale} tokens={state.detail.tokens} />
      <section class="detail-section danger-zone">
        <h3>{t.dangerZone}</h3>
        <p class="hint">{t.deleteArchiveHint}</p>
        <div class="step-controls">
          <button type="button" class="danger" disabled={deleteDisabled} onClick={onDelete}>
            {deleting ? t.deletingArchive : t.deleteArchive}
          </button>
        </div>
      </section>
    </div>
  )
}

function RoomPreview({ t, linkId, room }: { t: AdminUiText; linkId: string; room?: RoomSnapshot | undefined }) {
  if (!room) return <p class="hint archive-preview-unavailable">{t.previewUnavailable}</p>
  const previewPath = archivePreviewPath(linkId, room.roomId)

  return (
    <div class="archive-preview-summary">
      <p class="hint">
        {room.title ? `${room.title} / ` : ''}
        {room.body ? truncate(room.body, 120) : t.noBody}
      </p>
      <a class="inline-link" href={previewPath} target="_blank" rel="noreferrer">
        {t.openAdminPreview}
      </a>
    </div>
  )
}

function RoomCard({ t, locale, linkId, room }: { t: AdminUiText; locale: AdminUiLocale; linkId: string; room: RoomSnapshot }) {
  const previewPath = archivePreviewPath(linkId, room.roomId)

  return (
    <article class="token-item">
      <dl>
        <div>
          <dt>{t.contentId}</dt>
          <dd>{room.roomId}</dd>
        </div>
        <div>
          <dt>{t.title}</dt>
          <dd>{room.title ?? t.none}</dd>
        </div>
        <div>
          <dt>{t.body}</dt>
          <dd>{room.body ?? t.none}</dd>
        </div>
        <div>
          <dt>{t.updatedAt}</dt>
          <dd>{formatDateTime(room.updatedAt, locale)}</dd>
        </div>
      </dl>
      <div class="actions">
        <a href={previewPath} target="_blank" rel="noreferrer">
          {t.openAdminPreview}
        </a>
      </div>
    </article>
  )
}

function archivePreviewPath(linkId: string, roomId: string) {
  return `/admin/ui/archive/${encodeURIComponent(linkId)}/rooms/${encodeURIComponent(roomId)}/preview`
}

function ArchiveTokenList({ t, locale, tokens }: { t: AdminUiText; locale: AdminUiLocale; tokens: TokenSummary[] }) {
  if (tokens.length === 0) {
    return <p class="empty-state">{t.noTokenHistory}</p>
  }

  return (
    <div class="token-list">
      <h3>{t.tokenHistory}</h3>
      {tokens.map((token) => (
        <article class="token-item" key={token.tokenHash}>
          <dl>
            <div>
              <dt>{t.status}</dt>
              <dd>{formatTokenState(token.state, t)}</dd>
            </div>
            <div>
              <dt>{t.label}</dt>
              <dd>{token.label ?? t.none}</dd>
            </div>
            <div>
              <dt>{t.role}</dt>
              <dd>{token.role}</dd>
            </div>
            <div>
              <dt>{t.expires}</dt>
              <dd>{formatDateTime(token.expiresAt, locale)}</dd>
            </div>
            <div>
              <dt>{t.revokedAt}</dt>
              <dd>{token.revokedAt ? formatDateTime(token.revokedAt, locale) : t.none}</dd>
            </div>
            <div>
              <dt>{t.useCount}</dt>
              <dd>
                {token.useCount}
                {token.maxUses ? ` / ${token.maxUses}` : ''}
              </dd>
            </div>
            <div>
              <dt>{t.tokenHash}</dt>
              <dd>{token.tokenHash}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}

function formatTokenState(state: TokenSummary['state'], t: AdminUiText): string {
  if (state === 'active') return t.stateActive
  if (state === 'expired') return t.stateExpired
  if (state === 'revoked') return t.stateRevoked
  if (state === 'max_uses_reached') return t.stateMaxUsesReached
  return t.none
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
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

function LinkMeta({ t, link, locale }: { t: AdminUiText; link: Pick<AdminUiResult, 'expiresAt' | 'roomId' | 'tokenHash'>; locale: AdminUiLocale }) {
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
      <div>
        <dt>{t.tokenHash}</dt>
        <dd>{link.tokenHash}</dd>
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
