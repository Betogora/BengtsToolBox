// Bündelt den Codenames-KI-Proxy zu einer einzigen Vercel Function und deployt sie in das
// eigene Vercel-Projekt (nie in ein anderes). Aufruf: node scripts/deployCodenamesProxy.mjs [--dry-run]
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'rolldown'

const PROJECT = 'bengtstoolbox-ki'
const SCOPE = 'bengt2'
const VERCEL_CLI = 'vercel@65.12.1'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Bewusst außerhalb des Repositorys: Liegt der Ordner in einem Git-Repo, verknüpft `vercel link`
// das Projekt mit GitHub, und jeder Push überschreibt den Proxy mit einem Build der ganzen ToolBox.
const outDir = path.join(tmpdir(), 'bengtstoolbox-codenames-proxy')
const dryRun = process.argv.includes('--dry-run')

await rm(path.join(outDir, 'api'), { recursive: true, force: true })
await mkdir(path.join(outDir, 'api'), { recursive: true })
await build({
  input: path.join(root, 'src/apps/codenames/server/vercelEntry.ts'),
  platform: 'node',
  output: { file: path.join(outDir, 'api', 'codenames.js'), format: 'esm' },
})
await writeFile(path.join(outDir, 'package.json'), `${JSON.stringify({ name: PROJECT, private: true, type: 'module' }, null, 2)}\n`)
await writeFile(
  path.join(outDir, 'vercel.json'),
  `${JSON.stringify({ $schema: 'https://openapi.vercel.sh/vercel.json', framework: null, regions: ['fra1'], functions: { 'api/codenames.js': { maxDuration: 300 } } }, null, 2)}\n`,
)
console.log(`Proxy gebündelt: ${outDir}`)

if (!dryRun) {
  const [command, prefix] = process.platform === 'win32' ? ['cmd.exe', ['/d', '/s', '/c', 'npx']] : ['npx', []]
  const run = (args) => execFileSync(command, [...prefix, '--yes', VERCEL_CLI, ...args], { cwd: outDir, stdio: 'inherit' })
  if (!existsSync(path.join(outDir, '.vercel', 'project.json'))) run(['link', '--yes', '--project', PROJECT, '--scope', SCOPE])
  run(['deploy', '--prod', '--yes', '--scope', SCOPE])
}
