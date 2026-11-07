import { describe, expect, it } from 'vitest'

import { hyphenate } from './hyphenate'

const show = (w: string) => hyphenate(w).replace(/­/g, '-')

describe('hyphenate', () => {
  it('setzt weiche Trennstellen an Silbengrenzen', () => {
    expect(show('ZEHENSPITZEN')).toBe('ZE-HEN-SPIT-ZEN')
    expect(show('SAMMLUNG')).toBe('SAMM-LUNG')
    expect(show('RASENMÄHER')).toBe('RA-SEN-MÄ-HER')
    expect(show('LUNCHBOX')).toBe('LUNCH-BOX')
    expect(show('JAHR')).toBe('JAHR')
    expect(show('Kugelschreiber')).toBe('Ku-gel-schrei-ber')
    expect(show('Zentrum')).toBe('Zen-trum')
    expect(show('Präsentation')).toBe('Prä-sen-ta-tion')
    expect(show('Segler')).toBe('Seg-ler')
    expect(hyphenate('PLATZHALTER').replace(/­/g, '')).toBe('PLATZHALTER')
  })
})
