/// <reference types="node" />

import { rm } from 'node:fs/promises'
import { build } from 'esbuild'

await rm('dist', { recursive: true, force: true })

await build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx',
  external: [
    'hono',
    'hono/*',
    'hono-door',
    'qrcode-terminal',
    'qrcode-terminal/*',
    'zod',
  ],
})
