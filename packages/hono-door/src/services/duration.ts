const DURATION_RE = /^(\d+)(m|h|d)$/

export function parseDurationSeconds(input: string): number {
  const match = DURATION_RE.exec(input.trim())
  if (!match) {
    throw new Error('Duration must use m, h, or d, for example 15m, 1h, or 1d.')
  }

  const value = Number(match[1])
  const unit = match[2]

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Duration value must be a positive integer.')
  }

  if (unit === 'm') return value * 60
  if (unit === 'h') return value * 60 * 60
  return value * 24 * 60 * 60
}

