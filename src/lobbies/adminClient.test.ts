import { describe, expect, it } from 'vitest'

import { isLobbyAdminPin } from '@/lobbies/adminClient'

describe('lobby admin PIN', () => {
  it('accepts only the configured convenience PIN', () => {
    expect(isLobbyAdminPin('5340')).toBe(true)
    expect(isLobbyAdminPin('05340')).toBe(false)
    expect(isLobbyAdminPin('1234')).toBe(false)
  })
})
