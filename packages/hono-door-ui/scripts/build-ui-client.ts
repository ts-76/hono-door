/// <reference types="node" />

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { build } from 'esbuild'

const outputPath = 'src/generated/admin-ui-client.ts'
const checkOnly = process.argv.includes('--check')

const result = await build({
  entryPoints: ['src/admin-ui-client.tsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx/dom',
  minify: true,
  write: false,
})

const code = result.outputFiles[0]?.text
if (!code) {
  throw new Error('Admin UI client bundle was not generated.')
}

const output = `export const adminUiClientJs = ${JSON.stringify(code)}\n`

if (checkOnly) {
  const current = await readFile(outputPath, 'utf8').catch(() => undefined)
  if (current !== output) {
    throw new Error(
      `Generated admin UI client is stale. Run "bun run --cwd packages/hono-door-ui build:ui-client" and commit ${outputPath}.`,
    )
  }
  process.exit(0)
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, output)
