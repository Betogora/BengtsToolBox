import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createRandomId } from '@/apps/shared/utils'
import {
  defaultVotingRoundTitle,
  findDuplicateHints,
  findPersonIdByName,
  getDuplicateHintKey,
  getMergeUpdates,
  getNextPersonPosition,
  getVisiblePeople,
  normalizeBallot,
  normalizePerson,
  normalizeRound,
  pickNextColor,
  resolvePersonId,
  sanitizeVotingName,
  tallyVotes,
} from '@/apps/voting/logic'
import type {
  VotingBallot,
  VotingDuplicateHint,
  VotingPerson,
  VotingPersonSource,
  VotingRound,
  VotingState,
} from '@/apps/voting/types'
import { readLocalValue, removeLocalValue, writeLocalValue } from '@/lib/firebase/localStore'
import { firebasePaths } from '@/lib/firebase/paths'
import { commitSyncBatch, type SyncBatch } from '@/lib/firebase/syncBatch'
import { syncFailure, syncSuccess, type SyncResult } from '@/lib/firebase/syncError'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

const activeRoundId = 'round-current'
const initialState: VotingState = { activeRoundId }

function createRound(title = defaultVotingRoundTitle, position = 1): VotingRound {
  return {
    id: activeRoundId,
    key: `key-${createRandomId()}`,
    position,
    title,
    status: 'open',
    votersVisible: false,
    createdAtClientIso: new Date().toISOString(),
    closedAtClientIso: null,
    archivedAtClientIso: null,
    ballotCount: 0,
    results: [],
  }
}

const identityKey = (lobbyId: string) => `app-hub:voting:${lobbyId}:person-id`

function readIdentity(lobbyId: string) {
  return readLocalValue<string | null>(identityKey(lobbyId), null).value
}

export type VotingCandidateChoice = { personId: string } | { name: string }

export function useVoting(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const roundInitializationStarted = useRef(false)
  const [identity, setIdentity] = useState(() => ({
    lobbyId: activeLobbyId,
    personId: readIdentity(activeLobbyId),
  }))
  // Beim Lobbywechsel gilt sofort die Identität der neuen Lobby.
  const storedPersonId =
    identity.lobbyId === activeLobbyId ? identity.personId : readIdentity(activeLobbyId)

  const stateStore = useFirestoreDoc<VotingState>(
    useMemo(() => firebasePaths.votingState(activeLobbyId), [activeLobbyId]),
    initialState,
  )
  const peopleStore = useFirestoreCollection<VotingPerson>(
    useMemo(() => firebasePaths.votingPeople(activeLobbyId), [activeLobbyId]),
    [],
  )
  const roundsStore = useFirestoreCollection<VotingRound>(
    useMemo(() => firebasePaths.votingRounds(activeLobbyId), [activeLobbyId]),
    [],
  )
  const ballotsStore = useFirestoreCollection<VotingBallot>(
    useMemo(() => firebasePaths.votingBallots(activeLobbyId), [activeLobbyId]),
    [],
  )

  const allPeople = useMemo(() => peopleStore.data.map(normalizePerson), [peopleStore.data])
  const peopleById = useMemo(() => new Map(allPeople.map((person) => [person.id, person])), [allPeople])
  const people = useMemo(() => getVisiblePeople(allPeople), [allPeople])
  const rounds = useMemo(() => roundsStore.data.map(normalizeRound), [roundsStore.data])
  const ballots = useMemo(
    () => ballotsStore.data.map(normalizeBallot).filter((ballot): ballot is VotingBallot => ballot !== null),
    [ballotsStore.data],
  )
  const activeRound = useMemo(
    () =>
      rounds.find((round) => round.id === stateStore.data.activeRoundId && round.status !== 'archived') ??
      rounds.find((round) => round.id === activeRoundId) ??
      createRound(),
    [rounds, stateStore.data.activeRoundId],
  )
  const archivedRounds = useMemo(
    () =>
      rounds
        .filter((round) => round.status === 'archived')
        .sort(
          (left, right) =>
            Date.parse(right.archivedAtClientIso ?? right.createdAtClientIso) -
            Date.parse(left.archivedAtClientIso ?? left.createdAtClientIso),
        ),
    [rounds],
  )
  const tally = useMemo(
    () => tallyVotes(allPeople, ballots, activeRound.key),
    [activeRound.key, allPeople, ballots],
  )
  const dismissedDuplicateKeys = stateStore.data.dismissedDuplicateKeys
  const duplicateHints = useMemo(
    () => findDuplicateHints(allPeople, dismissedDuplicateKeys ?? []),
    [allPeople, dismissedDuplicateKeys],
  )
  const myPersonId = resolvePersonId(peopleById, storedPersonId)
  const me = myPersonId ? peopleById.get(myPersonId) ?? null : null
  const myChoiceId = me ? tally.choiceByVoterId.get(me.id) ?? null : null
  const myChoice = myChoiceId ? peopleById.get(myChoiceId) ?? null : null

  useEffect(() => {
    if (
      roundsStore.isLoading || !roundsStore.hasServerSnapshot ||
      (roundsStore.error && roundsStore.error.source !== 'local-storage') ||
      rounds.some((round) => round.id === activeRoundId) ||
      roundInitializationStarted.current
    ) return
    roundInitializationStarted.current = true
    void roundsStore.setItem(activeRoundId, { ...omitId(createRound()), lastUpdatedBy: session.userId })
  }, [rounds, roundsStore, session.userId])

  const rememberIdentity = useCallback((personId: string | null) => {
    if (personId) writeLocalValue(identityKey(activeLobbyId), personId)
    else removeLocalValue(identityKey(activeLobbyId))
    setIdentity({ lobbyId: activeLobbyId, personId })
  }, [activeLobbyId])

  const stagePerson = (
    batch: SyncBatch,
    name: string,
    source: VotingPersonSource,
    color: string = pickNextColor(allPeople),
  ) => {
    const id = `person-${createRandomId()}`
    peopleStore.setItem(id, {
      name,
      color,
      position: getNextPersonPosition(allPeople),
      source,
      mergedIntoId: null,
      createdAtClientIso: new Date().toISOString(),
      lastUpdatedBy: session.userId,
    }, batch)
    return id
  }

  const register = async (rawName: string, color: string): Promise<SyncResult<string | null>> => {
    const name = sanitizeVotingName(rawName)
    if (!name) return syncSuccess(null)
    const existingId = findPersonIdByName(allPeople, name)
    let personId = existingId
    const result = await commitSyncBatch((batch) => {
      if (existingId) {
        // Wer schon als Kandidat genannt wurde, übernimmt beim Anmelden diesen Eintrag.
        peopleStore.mergeItem(existingId, { source: 'self', color, lastUpdatedBy: session.userId }, batch)
      } else {
        personId = stagePerson(batch, name, 'self', color)
      }
    })
    if (!result.ok) return syncFailure(null, result.error)
    rememberIdentity(personId)
    return syncSuccess(personId)
  }

  const forgetIdentity = () => rememberIdentity(null)

  const castVote = async (choice: VotingCandidateChoice): Promise<SyncResult<string | null>> => {
    if (!me || activeRound.status !== 'open') return syncSuccess(null)
    let candidateId = 'personId' in choice ? resolvePersonId(peopleById, choice.personId) : null
    const writeInName = 'name' in choice ? sanitizeVotingName(choice.name) : ''
    if (!candidateId && writeInName) candidateId = findPersonIdByName(allPeople, writeInName)
    const now = new Date()
    const result = await commitSyncBatch((batch) => {
      if (!candidateId) {
        if (!writeInName) throw new Error('No candidate selected.')
        candidateId = stagePerson(batch, writeInName, 'write-in')
      }
      ballotsStore.setItem(me.id, {
        position: now.getTime(),
        roundKey: activeRound.key,
        voterId: me.id,
        candidateId,
        updatedAtClientIso: now.toISOString(),
        lastUpdatedBy: session.userId,
      }, batch)
    })
    return result.ok ? syncSuccess(candidateId) : syncFailure(null, result.error)
  }

  const addPerson = async (rawName: string) => {
    const name = sanitizeVotingName(rawName)
    if (!name || findPersonIdByName(allPeople, name)) return syncSuccess(undefined)
    return commitSyncBatch((batch) => {
      stagePerson(batch, name, 'admin')
    })
  }

  const renamePerson = (personId: string, rawName: string) => {
    const name = sanitizeVotingName(rawName)
    if (!name) return Promise.resolve(syncSuccess(undefined))
    return peopleStore.mergeItem(personId, { name, lastUpdatedBy: session.userId })
  }

  const recolorPerson = (personId: string, color: string) =>
    peopleStore.mergeItem(personId, { color, lastUpdatedBy: session.userId })

  // Löscht die Person samt Aliasen und eigener Stimmen; Stimmen für sie entfallen in der Auszählung.
  const deletePerson = (personId: string) => {
    const ids = allPeople
      .filter((person) => resolvePersonId(peopleById, person.id) === personId)
      .map((person) => person.id)
    const ballotIds = ballots.filter((ballot) => ids.includes(ballot.voterId)).map((ballot) => ballot.id)
    return commitSyncBatch((batch) => {
      peopleStore.deleteItems(ids, batch)
      if (ballotIds.length > 0) ballotsStore.deleteItems(ballotIds, batch)
    })
  }

  const deleteAllPeople = () =>
    commitSyncBatch((batch) => {
      peopleStore.clearItems(batch)
      ballotsStore.clearItems(batch)
    })

  const mergePeople = (targetId: string, sourceIds: string[]) => {
    const ids = getMergeUpdates(allPeople, targetId, sourceIds)
    return commitSyncBatch((batch) => {
      for (const id of ids) {
        peopleStore.mergeItem(id, { mergedIntoId: targetId, lastUpdatedBy: session.userId }, batch)
      }
    })
  }

  const unmergePerson = (personId: string) =>
    peopleStore.mergeItem(personId, { mergedIntoId: null, lastUpdatedBy: session.userId })

  const dismissDuplicateHint = (hint: VotingDuplicateHint) =>
    stateStore.merge((current) => ({
      dismissedDuplicateKeys: [...new Set([...(current.dismissedDuplicateKeys ?? []), getDuplicateHintKey(hint)])],
      updatedBy: session.userId,
    }))

  const saveActiveRound = (partialValue: Partial<VotingRound>) =>
    roundsStore.mergeItem(activeRound.id, { ...partialValue, lastUpdatedBy: session.userId })

  const updateRoundTitle = (rawTitle: string) =>
    saveActiveRound({ title: sanitizeVotingName(rawTitle) || defaultVotingRoundTitle })

  const closeRound = () =>
    saveActiveRound({ status: 'closed', closedAtClientIso: new Date().toISOString() })

  const reopenRound = () => saveActiveRound({ status: 'open', closedAtClientIso: null })

  const setVotersVisible = (votersVisible: boolean) => saveActiveRound({ votersVisible })

  // Archiviert die aktuelle Runde mit festem Ergebnis und startet mit denselben Personen neu.
  const startNewRound = () => {
    const now = new Date().toISOString()
    const archiveId = `round-${createRandomId()}`
    const position = rounds.reduce((max, round) => Math.max(max, round.position), 0) + 1
    const nextRound = createRound(activeRound.title, 1)
    const ballotIds = ballots.map((ballot) => ballot.id)

    return commitSyncBatch((batch) => {
      roundsStore.setItem(archiveId, {
        ...omitId(activeRound),
        position,
        status: 'archived',
        closedAtClientIso: activeRound.closedAtClientIso ?? now,
        archivedAtClientIso: now,
        ballotCount: tally.ballotCount,
        results: tally.results,
        lastUpdatedBy: session.userId,
      }, batch)
      roundsStore.setItem(activeRoundId, { ...omitId(nextRound), lastUpdatedBy: session.userId }, batch)
      if (ballotIds.length > 0) ballotsStore.deleteItems(ballotIds, batch)
      stateStore.merge({ activeRoundId, updatedBy: session.userId }, batch)
    })
  }

  const renameArchivedRound = (roundId: string, rawTitle: string) =>
    roundsStore.mergeItem(roundId, {
      title: sanitizeVotingName(rawTitle) || defaultVotingRoundTitle,
      lastUpdatedBy: session.userId,
    })

  const deleteArchivedRound = (roundId: string) => roundsStore.deleteItem(roundId)

  return {
    activeRound,
    addPerson,
    allPeople,
    archivedRounds,
    castVote,
    closeRound,
    deleteAllPeople,
    deleteArchivedRound,
    deletePerson,
    dismissDuplicateHint,
    duplicateHints,
    error:
      stateStore.error ?? peopleStore.error ?? roundsStore.error ?? ballotsStore.error ?? session.error,
    forgetIdentity,
    isLoading:
      stateStore.isLoading || peopleStore.isLoading || roundsStore.isLoading || ballotsStore.isLoading,
    isPending:
      stateStore.isPending || peopleStore.isPending || roundsStore.isPending || ballotsStore.isPending,
    isRealtime:
      stateStore.isRealtime && peopleStore.isRealtime && roundsStore.isRealtime && ballotsStore.isRealtime,
    me,
    mergePeople,
    myChoice,
    people,
    peopleById,
    recolorPerson,
    register,
    renameArchivedRound,
    renamePerson,
    reopenRound,
    setVotersVisible,
    startNewRound,
    tally,
    unmergePerson,
    updateRoundTitle,
  }
}

function omitId<T extends { id: string }>(value: T): Omit<T, 'id'> {
  const { id, ...rest } = value
  void id
  return rest
}
