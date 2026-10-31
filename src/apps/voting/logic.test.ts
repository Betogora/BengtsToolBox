import { describe, expect, it } from 'vitest'

import {
  findDuplicateHints,
  findPersonIdByName,
  getMergeUpdates,
  getVisiblePeople,
  rankResults,
  tallyVotes,
} from '@/apps/voting/logic'
import type { VotingBallot, VotingPerson } from '@/apps/voting/types'

const person = (
  id: string,
  name: string,
  position: number,
  extra: Partial<VotingPerson> = {},
): VotingPerson => ({
  id,
  name,
  color: '#0D8E90',
  position,
  source: 'self',
  mergedIntoId: null,
  createdAtClientIso: '2026-10-31T18:00:00.000Z',
  ...extra,
})

const ballot = (voterId: string, candidateId: string, minute: number, roundKey = 'round-a'): VotingBallot => ({
  id: voterId,
  position: minute,
  roundKey,
  voterId,
  candidateId,
  updatedAtClientIso: `2026-10-31T20:${String(minute).padStart(2, '0')}:00.000Z`,
})

const people = [
  person('heinz', 'Heinz', 1),
  person('franz', 'Franz', 2, { source: 'write-in' }),
  person('anna', 'Anna', 3),
  person('hz', 'HZ', 4, { source: 'write-in', mergedIntoId: 'heinz' }),
]

describe('voting logic', () => {
  it('matches names regardless of case and spacing and resolves aliases', () => {
    expect(findPersonIdByName(people, '  franz ')).toBe('franz')
    expect(findPersonIdByName(people, 'hz')).toBe('heinz')
    expect(findPersonIdByName(people, 'Fridolin')).toBeNull()
    expect(getVisiblePeople(people).map((entry) => entry.id)).toEqual(['heinz', 'franz', 'anna'])
  })

  it('counts only the current round and credits aliases to their target person', () => {
    const tally = tallyVotes(people, [
      ballot('heinz', 'franz', 1),
      ballot('anna', 'hz', 2),
      ballot('franz', 'heinz', 3),
      ballot('anna', 'franz', 4, 'round-old'),
    ], 'round-a')

    expect(tally.ballotCount).toBe(3)
    expect(tally.results.map(({ name, votes, rank }) => [name, votes, rank])).toEqual([
      ['Heinz', 2, 1],
      ['Franz', 1, 2],
    ])
    expect(tally.results[0].voterNames).toEqual(['Anna', 'Franz'])
    expect(tally.choiceByVoterId.get('anna')).toBe('heinz')
  })

  it('keeps only the latest vote of merged voters and drops votes for deleted people', () => {
    const tally = tallyVotes(people, [
      ballot('heinz', 'anna', 1),
      ballot('hz', 'franz', 5),
      ballot('anna', 'deleted-person', 2),
    ], 'round-a')

    expect(tally.ballotCount).toBe(1)
    expect(tally.choiceByVoterId.get('heinz')).toBe('franz')
  })

  it('shares ranks on ties and skips the following rank', () => {
    const ranked = rankResults([
      { personId: 'a', name: 'Anna', color: '#000000', votes: 2, voterNames: [] },
      { personId: 'b', name: 'Bert', color: '#000000', votes: 2, voterNames: [] },
      { personId: 'c', name: 'Cleo', color: '#000000', votes: 1, voterNames: [] },
    ])

    expect(ranked.map((entry) => entry.rank)).toEqual([1, 1, 3])
  })

  it('moves existing aliases of merged people directly to the new target', () => {
    expect(getMergeUpdates(people, 'franz', ['heinz']).sort()).toEqual(['heinz', 'hz'])
  })

  it.each([
    ['Heinz', 'Heinz Müller', 'heinz', 'self'],
    ['Lena', 'Leena', 'lena', 'write-in'],
  ] as const)('suggests %s and %s as likely duplicates', (keptName, otherName, keepId, otherSource) => {
    const hints = findDuplicateHints([
      person(keepId, keptName, 1),
      person('other', otherName, 2, { source: otherSource }),
    ])

    expect(hints).toHaveLength(1)
    expect(hints[0]).toEqual(
      otherSource === 'self' ? { keepId: 'other', mergeId: keepId } : { keepId, mergeId: 'other' },
    )
    expect(findDuplicateHints([person(keepId, keptName, 1), person('other', otherName, 2)], ['heinz|other', 'lena|other']))
      .toEqual([])
  })

  it('does not flag clearly different short names', () => {
    expect(findDuplicateHints([person('tom', 'Tom', 1), person('tim', 'Tim', 2)])).toEqual([])
  })
})
