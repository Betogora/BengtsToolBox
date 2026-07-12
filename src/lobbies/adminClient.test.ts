import { describe, expect, it } from 'vitest'

import {
  isLobbyAdminPermissionError,
  isLobbyAdminPin,
} from '@/lobbies/adminClient'

describe('lobby admin PIN', () => {
  it('accepts only the configured convenience PIN', () => {
    expect(isLobbyAdminPin('5340')).toBe(true)
    expect(isLobbyAdminPin('05340')).toBe(false)
    expect(isLobbyAdminPin('1234')).toBe(false)
  })

  it('recognizes Firestore permission errors separately from invalid PINs', () => {
    expect(isLobbyAdminPermissionError({ code: 'permission-denied' })).toBe(true)
    expect(isLobbyAdminPermissionError({ code: 'unavailable' })).toBe(false)
    expect(isLobbyAdminPermissionError(new Error('network'))).toBe(false)
  })
})
