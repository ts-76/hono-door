/// <reference types="node" />

import qrcode from 'qrcode-terminal'

const baseUrl = process.env.SHORT_LINK_ADMIN_BASE_URL ?? 'http://localhost:8787'
const adminToken = process.env.SHORT_LINK_ADMIN_TOKEN

type CliOptions = Record<string, string | boolean>

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2)
  const options = parseOptions(rest)

  if (!command) {
    printUsage()
    process.exitCode = 1
    return
  }

  if (!adminToken) {
    throw new Error('SHORT_LINK_ADMIN_TOKEN is required.')
  }

  if (command === 'issue-token') {
    await issueToken(options)
    return
  }

  if (command === 'switch-room') {
    await switchRoom(options)
    return
  }

  if (command === 'set-room') {
    await setRoom(options)
    return
  }

  printUsage()
  process.exitCode = 1
}

async function issueToken(options: CliOptions): Promise<void> {
  const link = requiredString(options, 'link')
  const ttl = stringOption(options, 'ttl') ?? '1h'
  const roomId = stringOption(options, 'room')
  const label = stringOption(options, 'label')
  const maxUses = stringOption(options, 'max-uses')

  const payload: Record<string, string | number> = { ttl }
  if (roomId) payload.roomId = roomId
  if (label) payload.label = label
  if (maxUses) payload.maxUses = Number(maxUses)

  const response = await adminFetch(`/admin/links/${encodeURIComponent(link)}/tokens`, payload)
  const publicUrl = requiredResponseValue(response, 'url')
  console.log(`URL: ${publicUrl}`)
  console.log(`Expires: ${response.expiresAt}`)
  console.log(`Room: ${response.roomId}`)
  console.log(`Token hash: ${response.tokenHash}`)
  console.log('QR:')
  qrcode.generate(publicUrl, { small: true })
}

async function switchRoom(options: CliOptions): Promise<void> {
  const link = requiredString(options, 'link')
  const roomId = requiredString(options, 'room')
  const response = await adminFetch(`/admin/links/${encodeURIComponent(link)}/switch-room`, { roomId })
  console.log(JSON.stringify(response, null, 2))
}

async function setRoom(options: CliOptions): Promise<void> {
  const room = requiredString(options, 'room')
  const title = stringOption(options, 'title')
  const body = stringOption(options, 'body')
  const response = await adminFetch(`/admin/rooms/${encodeURIComponent(room)}`, { title, body })
  console.log(JSON.stringify(response, null, 2))
}

async function adminFetch(path: string, payload: unknown): Promise<Record<string, string>> {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  const json = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(`Admin API failed: ${response.status} ${text}`)
  }

  return json as Record<string, string>
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg?.startsWith('--')) continue

    const key = arg.slice(2)
    const next = args[index + 1]
    if (!next || next.startsWith('--')) {
      options[key] = true
      continue
    }

    options[key] = next
    index += 1
  }

  return options
}

function requiredString(options: CliOptions, key: string): string {
  const value = stringOption(options, key)
  if (!value) {
    throw new Error(`--${key} is required.`)
  }

  return value
}

function stringOption(options: CliOptions, key: string): string | undefined {
  const value = options[key]
  return typeof value === 'string' ? value : undefined
}

function requiredResponseValue(response: Record<string, string>, key: string): string {
  const value = response[key]
  if (!value) {
    throw new Error(`Admin API response did not include ${key}.`)
  }

  return value
}

function printUsage(): void {
  console.log(`Usage:
  bun run token:issue --link summer-event --ttl 1h --room room-a --label staff
  bun run link:switch --link summer-event --room room-b
  bun run room:set --room room-a --title "Title" --body "Body"`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
