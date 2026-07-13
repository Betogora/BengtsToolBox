import { describe, expect, it } from 'vitest'

import {
  acknowledgeSpecsFingerprint,
  verifySpecsFingerprint,
} from './syncSpecsFingerprint.mjs'

const placeholderFingerprint = '0'.repeat(64)

function htmlWithFingerprint(value = placeholderFingerprint) {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    `  <meta name="specs-source-sha256" content="sha256:${value}">`,
    '</head>',
    '</html>',
    '',
  ].join('\n')
}

describe('specification fingerprint', () => {
  it('normalizes a UTF-8 BOM and Windows line endings', () => {
    const lfResult = acknowledgeSpecsFingerprint(
      '# Specification\n\nContent\n',
      htmlWithFingerprint(),
    )
    const windowsResult = acknowledgeSpecsFingerprint(
      '\uFEFF# Specification\r\n\r\nContent\r\n',
      htmlWithFingerprint(),
    )

    expect(windowsResult).toBe(lfResult)
    expect(() =>
      verifySpecsFingerprint('\uFEFF# Specification\r\n\r\nContent\r\n', lfResult),
    ).not.toThrow()
  })

  it('rejects a stale fingerprint after any other source change', () => {
    const html = acknowledgeSpecsFingerprint('# Specification\n', htmlWithFingerprint())

    expect(() => verifySpecsFingerprint('# Changed specification\n', html)).toThrow(
      'npm run docs:acknowledge',
    )
  })

  it.each([
    ['missing', '<html><head></head></html>'],
    [
      'duplicate',
      `${htmlWithFingerprint()}\n<meta name="specs-source-sha256" content="sha256:${placeholderFingerprint}">`,
    ],
    [
      'malformed',
      '<meta name="specs-source-sha256" content="sha256:not-a-fingerprint">',
    ],
  ])('rejects a %s marker', (_label, html) => {
    expect(() => verifySpecsFingerprint('# Specification\n', html)).toThrow()
    expect(() => acknowledgeSpecsFingerprint('# Specification\n', html)).toThrow()
  })

  it('changes only the fingerprint and is idempotent', () => {
    const original = htmlWithFingerprint()
    const acknowledged = acknowledgeSpecsFingerprint('# Specification\n', original)
    const expectedShape = original.replace(placeholderFingerprint, '<fingerprint>')
    const actualShape = acknowledged.replace(
      /(?<=content="sha256:)[0-9a-f]{64}(?=")/,
      '<fingerprint>',
    )

    expect(actualShape).toBe(expectedShape)
    expect(acknowledgeSpecsFingerprint('# Specification\n', acknowledged)).toBe(
      acknowledged,
    )
  })
})
