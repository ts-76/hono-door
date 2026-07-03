export type AdminUiValues = {
  adminToken?: string | undefined
  linkId?: string | undefined
  roomId?: string | undefined
  ttl?: string | undefined
  label?: string | undefined
  maxUses?: string | undefined
}

export type AdminUiResult = {
  linkId: string
  url: string
  expiresAt: string
  roomId: string
  tokenHash: string
  qrSvg: string
}

export type AdminUiPageInput = {
  values?: AdminUiValues
  result?: AdminUiResult
  error?: string
  authenticated?: boolean
}
