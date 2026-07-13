import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MARKER_NAME = 'specs-source-sha256'
const MARKER_PATTERN = new RegExp(
  `<meta\\b[^>]*\\bname=["']${MARKER_NAME}["'][^>]*>`,
  'gi',
)
const FINGERPRINT_PATTERN = /\bcontent=(["'])sha256:([0-9a-f]{64})\1/i

function fingerprint(markdown) {
  const normalized = markdown
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')

  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

function readMarker(html) {
  const markers = [...html.matchAll(MARKER_PATTERN)]

  if (markers.length !== 1) {
    throw new Error(
      `Expected exactly one ${MARKER_NAME} marker, found ${markers.length}.`,
    )
  }

  const marker = markers[0][0]
  const fingerprintMatch = marker.match(FINGERPRINT_PATTERN)

  if (!fingerprintMatch) {
    throw new Error(
      `${MARKER_NAME} must contain content="sha256:<64 lowercase hex characters>".`,
    )
  }

  return {
    fingerprint: fingerprintMatch[2],
    marker,
  }
}

export function verifySpecsFingerprint(markdown, html) {
  const actual = readMarker(html).fingerprint
  const expected = fingerprint(markdown)

  if (actual !== expected) {
    throw new Error(
      'docs/specs.html is not acknowledged for the current docs/specs.md. ' +
        'Review the reading version and run npm run docs:acknowledge.',
    )
  }
}

export function acknowledgeSpecsFingerprint(markdown, html) {
  const { marker } = readMarker(html)
  const expected = fingerprint(markdown)
  const updatedMarker = marker.replace(
    FINGERPRINT_PATTERN,
    (_match, quote) => `content=${quote}sha256:${expected}${quote}`,
  )

  return html.replace(marker, updatedMarker)
}

async function run() {
  const [mode, ...extraArguments] = process.argv.slice(2)

  if (!['--check', '--write'].includes(mode) || extraArguments.length > 0) {
    throw new Error(
      'Usage: node scripts/syncSpecsFingerprint.mjs --check|--write',
    )
  }

  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const markdownPath = resolve(repositoryRoot, 'docs/specs.md')
  const htmlPath = resolve(repositoryRoot, 'docs/specs.html')
  const [markdown, html] = await Promise.all([
    readFile(markdownPath, 'utf8'),
    readFile(htmlPath, 'utf8'),
  ])

  if (mode === '--check') {
    verifySpecsFingerprint(markdown, html)
    console.log('Specification fingerprint is current.')
    return
  }

  const updatedHtml = acknowledgeSpecsFingerprint(markdown, html)

  if (updatedHtml !== html) {
    await writeFile(htmlPath, updatedHtml, 'utf8')
  }

  console.log('Specification fingerprint acknowledged.')
}

const isDirectInvocation =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isDirectInvocation) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
