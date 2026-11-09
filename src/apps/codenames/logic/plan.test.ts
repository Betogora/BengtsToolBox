import { describe, expect, it } from 'vitest'

import { MATADOR, SCHACH } from './__fixtures__/replay'
import { createGame } from './engine'
import { reachesAll, situationText, turnPlan, turnsNeeded } from './plan'
import { seededRandomInt } from './random'

describe('turnsNeeded', () => {
  it('2 pro Zug plus höchstens ein Rest je Zug', () => {
    expect(turnsNeeded(0, 0)).toBe(0)
    expect(turnsNeeded(1, 0)).toBe(1)
    expect(turnsNeeded(3, 0)).toBe(2)
    expect(turnsNeeded(3, 1)).toBe(1)
    expect(turnsNeeded(5, 2)).toBe(2)
    expect(turnsNeeded(8, 0)).toBe(4)
  })
})

describe('Runde 3: MATADOR', () => {
  const state = MATADOR()

  it('ergibt LETZTE CHANCE mit Mindestzahl 3', () => {
    const plan = turnPlan(state)
    expect(state.turn).toBe('rot')
    expect(plan).toMatchObject({
      own: 4,
      opp: 1,
      ownRest: ['Uhr', 'Sekt'],
      oppRest: [],
      turns: 1,
      minNumber: 3,
      profile: 'LETZTE_CHANCE',
    })
    expect(situationText(state)).toMatch(
      /^Gegner ist voraussichtlich im nächsten Zug fertig: alle 4 eigenen Karten in diesem Zug erreichbar machen, also ZAHL mindestens 3\./,
    )
  })

  it('MATADOR 1 → BULLE erreicht nicht alle Karten, EIS/BULLE/UHR + SEKT schon', () => {
    expect(reachesAll(state, 'rot', ['Bulle'])).toMatch(/Eis/)
    expect(reachesAll(state, 'rot', ['Eis', 'Bulle', 'Uhr'])).toBeNull()
    expect(reachesAll(state, 'rot', ['Eis', 'Bulle'])).toMatch(/Zusatzversuch holt nur eine/)
  })
})

describe('Runde 2: SCHACH', () => {
  const state = SCHACH()

  it('ergibt LETZTE CHANCE mit Mindestzahl 1, Rest PFERD', () => {
    expect(state.turn).toBe('rot')
    expect(turnPlan(state)).toMatchObject({
      own: 2,
      opp: 3,
      ownRest: ['Pferd'],
      oppRest: ['Mauer'],
      turns: 1,
      minNumber: 1,
      profile: 'LETZTE_CHANCE',
    })
  })

  it('SCHACH 1 → PFERD lässt KRAKE unerreichbar; ein Hinweis auf KRAKE reicht', () => {
    expect(reachesAll(state, 'rot', ['Pferd'])).toMatch(/Krake/)
    expect(reachesAll(state, 'rot', ['Krake'])).toBeNull()
    expect(reachesAll(state, 'rot', ['Krake', 'Pferd'])).toBeNull()
  })
})

describe('Letzte Chance ohne Reste', () => {
  it('lässt genau eine beliebige eigene Karte für einen Glückstreffer ungenannt', () => {
    const state = createGame(MATADOR().words, { start: 'rot', randomInt: seededRandomInt(5) })
    const own = state.words.filter((_, i) => state.colors[i] === 'rot')
    expect(reachesAll(state, 'rot', own.slice(1))).toBeNull()
    expect(reachesAll(state, 'rot', own.slice(2))).toMatch(/2 eigene Karten bleiben ungenannt/)
  })
})
