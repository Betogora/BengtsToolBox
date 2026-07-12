import { describe, expect, it } from 'vitest'

import {
  createLobbyCode,
  isValidDeviceName,
  isValidLobbyId,
  isValidLobbyName,
  normalizeDeviceName,
  normalizeLobbyName,
} from '@/lobbies/domain'

describe('lobby domain', () => {
  it('normalizes names and enforces their limits', () => {
    expect(normalizeLobbyName('  Spiele   Abend  ')).toBe('Spiele Abend')
    expect(normalizeDeviceName('  Bengts   Laptop ')).toBe('Bengts Laptop')
    expect(isValidLobbyName('Lobby')).toBe(true)
    expect(isValidLobbyName(' '.repeat(3))).toBe(false)
    expect(isValidLobbyName('x'.repeat(61))).toBe(false)
    expect(isValidDeviceName('Laptop')).toBe(true)
    expect(isValidDeviceName('x'.repeat(41))).toBe(false)
  })

  it('creates a six-character code without ambiguous characters', () => {
    const code = createLobbyCode(new Uint32Array([0, 1, 2, 3, 4, 5]))

    expect(code).toBe('ABCDEF')
    expect(isValidLobbyId(code)).toBe(true)
    expect(isValidLobbyId('A0O1I2')).toBe(false)
    expect(isValidLobbyId('default')).toBe(true)
  })
})
