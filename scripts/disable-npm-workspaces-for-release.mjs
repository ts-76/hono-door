import { readFile, writeFile } from 'node:fs/promises'

const rootPackageJsonPath = new URL('../package.json', import.meta.url)
const packageJson = JSON.parse(await readFile(rootPackageJsonPath, 'utf8'))

delete packageJson.workspaces

await writeFile(
  rootPackageJsonPath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
)
