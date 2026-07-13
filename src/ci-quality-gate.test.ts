import { describe, expect, it } from 'vitest'

describe('CI quality gate', () => {
  it('blocks a pull request when a core test fails', () => {
    expect(true).toBe(false)
  })
})
