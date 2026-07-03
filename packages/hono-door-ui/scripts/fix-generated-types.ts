/// <reference types="node" />

import { writeFile } from 'node:fs/promises'

await writeFile(
  'dist/generated/admin-ui-client.d.ts',
  'export declare const adminUiClientJs: string\n',
)
