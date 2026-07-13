import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

import { runTournamentBenchmark } from './runTournamentBenchmark.mjs'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const benchmarkDirectory = path.join(repositoryRoot, 'benchmarks')
const bundleReportPath = path.join(
  repositoryRoot,
  'dist',
  'performance',
  'bundle-metrics.json',
)

const typescriptCli = path.join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc')
execFileSync(process.execPath, [typescriptCli, '-b'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
})

await build({ root: repositoryRoot })
const bundleReport = JSON.parse(await readFile(bundleReportPath, 'utf8'))
const tournamentReport = await runTournamentBenchmark()

await mkdir(benchmarkDirectory, { recursive: true })
await Promise.all([
  writeFile(
    path.join(benchmarkDirectory, 'bundle-baseline.json'),
    `${JSON.stringify(bundleReport, null, 2)}\n`,
  ),
  writeFile(
    path.join(benchmarkDirectory, 'tournament-baseline.json'),
    `${JSON.stringify(tournamentReport, null, 2)}\n`,
  ),
])

console.log('Bundle- und Turnier-Baselines wurden bewusst aktualisiert.')
