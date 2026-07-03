/** @jsxImportSource hono/jsx/dom */
/// <reference lib="dom" />

import { render, useEffect, useState } from 'hono/jsx/dom'

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
      message?: string
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
}: AdminIssuePayload) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated)

  const logout = () => {
    setAuthenticated(false)
  }

  if (!authenticated) {
    return (
      <>
        {error ? <p class="alert">{error}</p> : null}
        <section class="step">
          <div class="step-body">
            <h2>管理トークン</h2>
            <p class="hint">
              初回のみ管理トークンを入力してください。認証後は HttpOnly Cookie の管理セッションで操作します。
            </p>
            <AdminLoginPanel onAuthenticated={() => setAuthenticated(true)} />
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <SessionBar onLogout={logout} />
      {error ? <p class="alert">{error}</p> : null}

      <form method="post" class="steps">
        <section class="step">
          <div class="step-body">
            <h2>リンクを発行</h2>
            <p class="hint">
              Link ID は公開 URL のパスになります。Room ID はアプリケーション側で管理するデータのキーです。
            </p>
            <div class="grid">
              <label>
                Link ID
                <input name="linkId" required defaultValue={values.linkId ?? ''} placeholder="summer-event" />
              </label>
              <label>
                Room ID
                <input name="roomId" required defaultValue={values.roomId ?? ''} placeholder="room-a" />
              </label>
            </div>
            <div class="grid">
              <label>
                有効期限
                <input name="ttl" defaultValue={values.ttl ?? '1h'} placeholder="15m" />
                <span class="field-help">例: 15m, 1h, 1d</span>
              </label>
              <label>
                ラベル
                <input name="label" defaultValue={values.label ?? ''} placeholder="staff" />
                <span class="field-help">管理用のメモです。公開側では token の label として参照できます。</span>
              </label>
              <label>
                最大利用回数
                <input
                  name="maxUses"
                  inputmode="numeric"
                  defaultValue={values.maxUses ?? ''}
                  placeholder="空欄 = 無制限"
                />
                <span class="field-help">空欄の場合は期限まで回数制限なしです。</span>
              </label>
            </div>
            <div class="step-controls">
              <button type="submit">URL と QR を発行</button>
            </div>
          </div>
        </section>
      </form>

      {result ? <IssuedResult result={result} /> : null}
    </>
  )
}

function AdminLoginPanel({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [adminToken, setAdminToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string>()

  const login = async () => {
    const token = adminToken.trim()
    if (!token) {
      setStatus('error')
      setError('管理トークンを入力してください。')
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
          管理トークン
          <input
            type="password"
            autocomplete="current-password"
            value={adminToken}
            onInput={(event: Event) => setAdminToken((event.target as HTMLInputElement | null)?.value ?? '')}
            placeholder="ADMIN_API_TOKEN"
          />
        </label>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '認証中' : 'ログイン'}
        </button>
      </form>
      {status === 'error' ? <p class="alert">{error}</p> : null}
    </>
  )
}

function SessionBar({ onLogout }: { onLogout: () => void }) {
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
      <span>管理セッションで認証済み</span>
      <button type="button" class="secondary" disabled={loggingOut} onClick={() => void logout()}>
        ログアウト
      </button>
    </div>
  )
}

function IssuedResult({ result }: { result: AdminUiResult }) {
  return (
    <section class="result">
      <h2>発行完了</h2>
      <p class="hint">URL を共有するか、QR コードを読み取ってください。QR は正方形で表示されます。</p>
      <div class="issued-layout">
        <div class="issued-main">
          <label>
            URL
            <input readonly value={result.url} />
          </label>
          <div class="actions">
            <a href={result.url} target="_blank" rel="noreferrer">
              URL を開く
            </a>
          </div>
          <LinkMeta link={result} />
        </div>
        <QrPanel qrSvg={result.qrSvg} />
      </div>
    </section>
  )
}

function LinkListApp({ authenticated: initialAuthenticated = false }: { authenticated?: boolean }) {
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
      setError('管理セッションが必要です。')
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
        [linkId]: { status: 'error', error },
      }))
      return
    }

    const policy = (await response.json()) as IssuePolicy
    setDetails((records) => ({
      ...records,
      [linkId]: {
        ...current,
        policy,
        message: '発行設定を保存しました。',
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
          [linkId]: { status: 'error', error },
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
                message: `${result.revokedTokenCount ?? 0} 件の既存トークンを無効化して再発行しました。`,
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
    if (!window.confirm('このリンクの有効な token を無効化してアーカイブします。よろしいですか？')) return

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
          [linkId]: { status: 'error', error },
        }))
        return
      }

      const result = (await response.json()) as ArchiveResult
      setDetails((records) => ({
        ...records,
        [linkId]: {
          ...current,
          message: `${result.revokedTokenCount} 件の有効 token を無効化してアーカイブしました。`,
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
          有効リンク一覧を見るには管理トークンでログインしてください。トークン自体は保存しません。
        </p>
        <AdminLoginPanel
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
      <SessionBar onLogout={logout} />
      <form
        class="list-auth"
        onSubmit={(event) => {
          event.preventDefault()
          void loadLinks()
        }}
      >
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '取得中' : '一覧を更新'}
        </button>
      </form>
      <p class="hint">
        一覧は管理セッションを使ってサーバー側の Registry から取得します。
      </p>
      {status === 'error' ? <p class="alert">{error}</p> : null}
      <div class="list-header">
        <div>
          <h2>有効なリンク</h2>
        </div>
      </div>
      {status === 'loaded' && links.length === 0 ? (
        <p class="empty-state">有効なリンクはありません。期限切れ、無効化済み、利用上限到達済みのトークンは表示されません。</p>
      ) : null}
      <div class="link-list">
        {links.map((link) => (
          <article class="link-item" key={link.linkId}>
            <div class="link-item-main">
              <h3>{link.linkId || 'link'}</h3>
              <dl class="compact-meta">
                <div>
                  <dt>ルーム</dt>
                  <dd>{link.currentRoomId}</dd>
                </div>
                <div>
                  <dt>有効トークン</dt>
                  <dd>{link.activeTokenCount}</dd>
                </div>
                <div>
                  <dt>最終期限</dt>
                  <dd>{link.latestExpiresAt}</dd>
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
              <summary>詳細を見る</summary>
              <div class="link-detail-body">
                <p class="hint">
                  raw token は保存していないため、この一覧から URL や QR は再表示できません。QR は発行直後の完了画面で共有してください。
                </p>
                <LinkDetails
                  state={details[link.linkId]}
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
  onSavePolicy,
  onReissue,
  onArchive,
  reissuing,
  archiving,
}: {
  state: LinkDetailsState | undefined
  onSavePolicy(input: IssuePolicyInput): void
  onReissue(): void
  onArchive(): void
  reissuing: boolean
  archiving: boolean
}) {
  if (!state || state.status === 'loading') {
    return <p class="empty-state">詳細を取得中です。</p>
  }

  if (state.status === 'error') {
    return <p class="alert">{state.error}</p>
  }

  return (
    <div class="link-details-content">
      {state.message ? <p class="hint status-message">{state.message}</p> : null}
      <IssuePolicyForm
        policy={state.policy}
        onSave={onSavePolicy}
        onReissue={onReissue}
        onArchive={onArchive}
        reissuing={reissuing}
        archiving={archiving}
      />
      {state.reissueResult ? <ReissuedResult result={state.reissueResult} /> : null}
      <TokenList tokens={state.tokens} />
    </div>
  )
}

function IssuePolicyForm({
  policy,
  onSave,
  onReissue,
  onArchive,
  reissuing,
  archiving,
}: {
  policy: IssuePolicy
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
      <h3>発行設定</h3>
      <div class="grid">
        <label>
          有効期限
          <input name="ttl" defaultValue={formatTtl(policy.ttlSeconds)} placeholder="15m" />
        </label>
        <label>
          ロール
          <input name="role" defaultValue={policy.role} placeholder="viewer" />
        </label>
        <label>
          ラベル
          <input name="label" defaultValue={policy.label ?? ''} placeholder="reissued" />
        </label>
        <label>
          最大利用回数
          <input name="maxUses" inputmode="numeric" defaultValue={policy.maxUses ?? ''} placeholder="空欄 = 無制限" />
        </label>
      </div>
      <div class="step-controls">
        <button type="submit" class="secondary">
          発行設定を保存
        </button>
        <button type="button" disabled={reissuing || archiving} onClick={onReissue}>
          {reissuing ? '再発行中' : 'URL/QR を再発行'}
        </button>
        <button type="button" class="danger" disabled={reissuing || archiving} onClick={onArchive}>
          {archiving ? 'アーカイブ中' : '手動アーカイブ'}
        </button>
      </div>
    </form>
  )
}

function ReissuedResult({ result }: { result: AdminUiResult }) {
  return (
    <section class="reissue-result">
      <h2>再発行完了</h2>
      <p class="hint">古い有効トークンを無効化し、新しい URL と QR を発行しました。</p>
      <div class="issued-layout">
        <div class="issued-main">
          <label>
            URL
            <input readonly value={result.url} />
          </label>
          <div class="actions">
            <a href={result.url} target="_blank" rel="noreferrer">
              URL を開く
            </a>
          </div>
          <LinkMeta link={result} />
        </div>
        <QrPanel qrSvg={result.qrSvg} />
      </div>
    </section>
  )
}

function TokenList({ tokens }: { tokens: TokenSummary[] }) {
  if (tokens.length === 0) {
    return <p class="empty-state">有効なトークンはありません。</p>
  }

  return (
    <div class="token-list">
      {tokens.map((token) => (
        <article class="token-item" key={token.tokenHash}>
          <dl>
            <div>
              <dt>ラベル</dt>
              <dd>{token.label ?? '-'}</dd>
            </div>
            <div>
              <dt>ロール</dt>
              <dd>{token.role}</dd>
            </div>
            <div>
              <dt>ルーム</dt>
              <dd>{token.roomId}</dd>
            </div>
            <div>
              <dt>期限</dt>
              <dd>{token.expiresAt}</dd>
            </div>
            <div>
              <dt>利用回数</dt>
              <dd>
                {token.useCount}
                {token.maxUses ? ` / ${token.maxUses}` : ''}
              </dd>
            </div>
            <div>
              <dt>トークンハッシュ</dt>
              <dd>{token.tokenHash}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}

function ArchiveApp({ authenticated: initialAuthenticated = false }: { authenticated?: boolean }) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated)
  const [query, setQuery] = useState('')
  const [links, setLinks] = useState<ArchiveLinkSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [error, setError] = useState<string>()
  const [details, setDetails] = useState<Record<string, ArchiveDetailState>>({})

  useEffect(() => {
    if (authenticated && status === 'idle') {
      void loadArchive()
    }
  }, [authenticated, status])

  const loadArchive = async () => {
    if (!authenticated) {
      setStatus('error')
      setError('管理セッションが必要です。')
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

  const logout = () => {
    setAuthenticated(false)
    setStatus('idle')
    setLinks([])
    setDetails({})
  }

  if (!authenticated) {
    return (
      <>
        <p class="hint">アーカイブを見るには管理トークンでログインしてください。</p>
        <AdminLoginPanel
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
      <SessionBar onLogout={logout} />
      <form
        class="list-auth"
        onSubmit={(event) => {
          event.preventDefault()
          void loadArchive()
        }}
      >
        <label>
          検索
          <input
            value={query}
            onInput={(event: Event) => setQuery((event.target as HTMLInputElement | null)?.value ?? '')}
            placeholder="linkId / roomId / label / title / body"
          />
        </label>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '検索中' : 'アーカイブを検索'}
        </button>
      </form>
      <p class="hint">期限切れ、無効化済み、利用上限到達済みのリンクを表示します。</p>
      {status === 'error' ? <p class="alert">{error}</p> : null}
      {status === 'loaded' && links.length === 0 ? (
        <p class="empty-state">該当するアーカイブはありません。</p>
      ) : null}
      <div class="link-list">
        {links.map((link) => (
          <article class="link-item" key={link.linkId}>
            <div class="link-item-main">
              <h3>{link.linkId}</h3>
              <dl class="compact-meta">
                <div>
                  <dt>ルーム</dt>
                  <dd>{link.currentRoomId}</dd>
                </div>
                <div>
                  <dt>トークン数</dt>
                  <dd>{link.tokenCount}</dd>
                </div>
                <div>
                  <dt>最終期限</dt>
                  <dd>{link.latestExpiresAt ?? '-'}</dd>
                </div>
              </dl>
              <RoomPreview room={link.latestRoom} />
            </div>
            <details
              class="link-detail"
              onToggle={(event: Event) => {
                const opened = Boolean((event.target as HTMLDetailsElement | null)?.open)
                if (opened) void loadDetail(link.linkId)
              }}
            >
              <summary>投稿内容と履歴を見る</summary>
              <div class="link-detail-body">
                <ArchiveDetails
                  linkId={link.linkId}
                  state={details[link.linkId]}
                />
              </div>
            </details>
          </article>
        ))}
      </div>
    </>
  )
}

function ArchiveDetails({
  linkId,
  state,
}: {
  linkId: string
  state: ArchiveDetailState | undefined
}) {
  if (!state || state.status === 'loading') {
    return <p class="empty-state">詳細を取得中です。</p>
  }

  if (state.status === 'error') {
    return <p class="alert">{state.error}</p>
  }

  return (
    <div class="link-details-content">
      <p class="hint">
        アーカイブの再閲覧は管理セッション必須のプレビューで行います。公開 URL や新しい token は発行しません。
      </p>
      <section class="archive-room">
        <h3>投稿内容</h3>
        {state.detail.rooms.length === 0 ? (
          <p class="empty-state">保存済みの投稿内容はありません。</p>
        ) : (
          state.detail.rooms.map((room) => <RoomCard linkId={linkId} room={room} key={room.roomId} />)
        )}
      </section>
      <ArchiveTokenList tokens={state.detail.tokens} />
    </div>
  )
}

function RoomPreview({ room }: { room?: RoomSnapshot | undefined }) {
  if (!room) return null
  return (
    <p class="hint">
      {room.title ? `${room.title} / ` : ''}
      {room.body ? truncate(room.body, 120) : '本文なし'}
    </p>
  )
}

function RoomCard({ linkId, room }: { linkId: string; room: RoomSnapshot }) {
  const previewPath = `/admin/ui/archive/${encodeURIComponent(linkId)}/rooms/${encodeURIComponent(room.roomId)}/preview`

  return (
    <article class="token-item">
      <dl>
        <div>
          <dt>Room ID</dt>
          <dd>{room.roomId}</dd>
        </div>
        <div>
          <dt>タイトル</dt>
          <dd>{room.title ?? '-'}</dd>
        </div>
        <div>
          <dt>本文</dt>
          <dd>{room.body ?? '-'}</dd>
        </div>
        <div>
          <dt>更新日時</dt>
          <dd>{room.updatedAt}</dd>
        </div>
      </dl>
      <div class="actions">
        <a href={previewPath} target="_blank" rel="noreferrer">
          管理プレビューを開く
        </a>
      </div>
    </article>
  )
}

function ArchiveTokenList({ tokens }: { tokens: TokenSummary[] }) {
  if (tokens.length === 0) {
    return <p class="empty-state">保存済みのトークン履歴はありません。</p>
  }

  return (
    <div class="token-list">
      <h3>トークン履歴</h3>
      {tokens.map((token) => (
        <article class="token-item" key={token.tokenHash}>
          <dl>
            <div>
              <dt>状態</dt>
              <dd>{formatTokenState(token.state)}</dd>
            </div>
            <div>
              <dt>ラベル</dt>
              <dd>{token.label ?? '-'}</dd>
            </div>
            <div>
              <dt>ロール</dt>
              <dd>{token.role}</dd>
            </div>
            <div>
              <dt>期限</dt>
              <dd>{token.expiresAt}</dd>
            </div>
            <div>
              <dt>無効化</dt>
              <dd>{token.revokedAt ?? '-'}</dd>
            </div>
            <div>
              <dt>利用回数</dt>
              <dd>
                {token.useCount}
                {token.maxUses ? ` / ${token.maxUses}` : ''}
              </dd>
            </div>
            <div>
              <dt>トークンハッシュ</dt>
              <dd>{token.tokenHash}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}

function formatTokenState(state: TokenSummary['state']): string {
  if (state === 'active') return '有効'
  if (state === 'expired') return '期限切れ'
  if (state === 'revoked') return '無効化済み'
  if (state === 'max_uses_reached') return '利用上限到達'
  return '-'
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

function LinkMeta({ link }: { link: Pick<AdminUiResult, 'expiresAt' | 'roomId' | 'tokenHash'> }) {
  return (
    <dl>
      <div>
        <dt>期限</dt>
        <dd>{link.expiresAt}</dd>
      </div>
      <div>
        <dt>ルーム</dt>
        <dd>{link.roomId}</dd>
      </div>
      <div>
        <dt>トークンハッシュ</dt>
        <dd>{link.tokenHash}</dd>
      </div>
    </dl>
  )
}

function QrPanel({ qrSvg }: { qrSvg: string }) {
  return (
    <div class="qr-panel">
      <div class="qr-code" aria-label="QR コード" dangerouslySetInnerHTML={{ __html: qrSvg }} />
    </div>
  )
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
  render(<LinkListApp authenticated={Boolean(adminUiPayload.authenticated)} />, listRoot)
}

const archiveRoot = document.getElementById('admin-archive-root')
if (archiveRoot) {
  render(<ArchiveApp authenticated={Boolean(adminUiPayload.authenticated)} />, archiveRoot)
}
