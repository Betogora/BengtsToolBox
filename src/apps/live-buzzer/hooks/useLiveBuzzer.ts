import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BUZZ_COLLECTION_MS, CLOCK_RECENT_MS, decideRound, estimatePress, orderBuzzes } from '@/apps/live-buzzer/buzzerLogic'
import { loadExistingBuzzer, normalizeBuzzerState, normalizePlayer, readLocalBuzzer, recordSessionBuzz } from '@/apps/live-buzzer/buzzerSession'
import { buzzerTeams } from '@/apps/live-buzzer/teams'
import type { BuzzerBuzz, BuzzerPlayer, BuzzerTeamId } from '@/apps/live-buzzer/types'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import { readLocalValue, writeLocalValue } from '@/lib/firebase/localStore'
import { getRealtimeDatabase, updateRealtimeValue } from '@/lib/firebase/realtimeDatabase'
import { createSyncError, syncFailure, syncSuccess, type SyncError, type SyncResult } from '@/lib/firebase/syncError'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useRealtimeDatabaseDoc } from '@/lib/firebase/useRealtimeDatabaseDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'
import { useBuzzerClock } from './useBuzzerClock'

const playerIdKey = 'app-hub:live-buzzer:player-id'

function getOrCreatePlayerId(): SyncResult<string> {
  const legacy = readLocalValue<{ playerId?: string } | null>('app-hub:live-buzzer:identity', null)
  const existing = readLocalValue<string | null>(playerIdKey, legacy.value?.playerId ?? null)
  const playerId = existing.value ?? `player-${createRandomId()}`
  const result = writeLocalValue(playerIdKey, playerId)
  return result.ok ? syncSuccess(playerId) : syncFailure(playerId, result.error)
}

export function useLiveBuzzer(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const [identity] = useState(getOrCreatePlayerId)
  const selectedPlayerId = identity.value
  const [pendingRoundId, setPendingRoundId] = useState<string | null>(null)
  const [buzzError, setBuzzError] = useState<SyncError | null>(null)
  const refreshedPlayer = useRef<string | null>(null)
  const acknowledgedClock = useRef<string | null>(null)
  const buzzInFlight = useRef<string | null>(null)
  const initialValue = useMemo(() => readLocalBuzzer(activeLobbyId), [activeLobbyId])
  const store = useRealtimeDatabaseDoc(firebasePaths.liveBuzzerRealtime(activeLobbyId), initialValue, () => loadExistingBuzzer(activeLobbyId))
  const sessionState = normalizeBuzzerState(store.data.state)
  const players = useMemo(() => Object.entries(store.data.players ?? {})
    .map(([id, p], i) => normalizePlayer({ ...p, id }, i)).filter((p) => p.isActive && p.ownerUid)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)), [store.data.players])
  const storedPlayer = store.data.players?.[selectedPlayerId]
  const selectedPlayer = storedPlayer?.ownerUid === session.userId ? normalizePlayer(storedPlayer, 0) : null
  const isHost = store.data.hostUid === session.userId
  const { isRealtime, online, change } = store
  const syncId = sessionState.clockSyncId ?? null
  const eligibleForSync = Boolean(syncId && selectedPlayer && (isHost && !selectedPlayer.isActive ||
    (selectedPlayer.joinedAtMs ?? Infinity) <= (sessionState.clockSyncRequestedAtMs ?? 0)))
  const { clock, error: clockError } = useBuzzerClock(isRealtime && eligibleForSync, online, syncId)
  const serverNow = clock?.serverAtMidpointMs ?? sessionState.clockSyncRequestedAtMs ?? 0
  const syncedPlayers = players.filter((p) => p.clockSyncId === syncId && syncId &&
    typeof p.clockSyncedAtMs === 'number' && (!isRealtime || serverNow - p.clockSyncedAtMs < CLOCK_RECENT_MS))
  const allClocksReady = Boolean(syncId && players.length && syncedPlayers.length === players.length)
  const clockReady = eligibleForSync && (!isRealtime || Boolean(clock && online)) && selectedPlayer?.clockSyncId === syncId

  const timestamp = useCallback(async () => isRealtime
    ? (await import('firebase/database')).serverTimestamp() as unknown as number : Date.now(), [isRealtime])
  const updatePlayer = useCallback((patch: Partial<BuzzerPlayer>) => change((current) =>
    current?.players?.[selectedPlayerId]?.ownerUid === session.userId
      ? { ...current, players: { ...current.players, [selectedPlayerId]: { ...current.players[selectedPlayerId], ...patch } } }
      : undefined), [change, selectedPlayerId, session.userId])

  // A recent reload keeps the approved epoch; a stale return waits for a host-triggered sync.
  useEffect(() => {
    if (store.isLoading || !session.isReady || !selectedPlayer) return
    if (!online) { refreshedPlayer.current = null; return }
    const key = `${activeLobbyId}/${selectedPlayerId}`
    if (refreshedPlayer.current === key) return
    refreshedPlayer.current = key
    if (!isRealtime || !selectedPlayer.isActive || !selectedPlayer.clockSyncedAtMs) return
    void (async () => {
      const { onValue, ref } = await import('firebase/database')
      const database = (await getRealtimeDatabase())!
      const offset = await new Promise<number>((resolve, reject) => onValue(
        ref(database, '.info/serverTimeOffset'),
        (snapshot) => resolve(Number(snapshot.val()) || 0), reject, { onlyOnce: true }))
      if (Date.now() + offset - selectedPlayer.clockSyncedAtMs! >= CLOCK_RECENT_MS) {
        await updatePlayer({ joinedAtMs: await timestamp(), clockSyncId: null, clockSyncedAtMs: null })
      }
    })().catch(() => { /* A failed check requires a new explicit clock sync. */
      void timestamp().then((joinedAtMs) => updatePlayer({ joinedAtMs, clockSyncId: null, clockSyncedAtMs: null }))
    })
  }, [activeLobbyId, selectedPlayerId, selectedPlayer, session.isReady, store.isLoading, isRealtime, online, timestamp, updatePlayer])

  useEffect(() => {
    if (!eligibleForSync || !selectedPlayer?.isActive || (isRealtime && !clock)) return
    const key = `${syncId}/${clock?.midpointMs ?? 'local'}/${selectedPlayerId}`
    if (acknowledgedClock.current === key) return
    acknowledgedClock.current = key
    void timestamp().then((clockSyncedAtMs) => change((current) => {
      const player = current?.players?.[selectedPlayerId]
      if (!current || !player || current.state.clockSyncId !== syncId || player.ownerUid !== session.userId ||
        (player.joinedAtMs ?? Infinity) > (current.state.clockSyncRequestedAtMs ?? 0)) return undefined
      return { ...current, players: { ...current.players, [selectedPlayerId]: { ...player, clockSyncId: syncId, clockSyncedAtMs } } }
    }))
  }, [change, clock, eligibleForSync, isRealtime, selectedPlayer?.isActive, selectedPlayerId, session.userId, syncId, timestamp])

  const { firstReceivedAtMs, roundId, winnerPlayerId, isOpen } = sessionState
  const hasBuzzes = Object.keys(sessionState.buzzes ?? {}).length > 0
  useEffect(() => {
    if (!isOpen || !roundId || winnerPlayerId || firstReceivedAtMs != null || !hasBuzzes) return
    void change((current) => {
      if (!current || current.state.roundId !== roundId || !current.state.isOpen || current.state.firstReceivedAtMs != null) return undefined
      const arrivals = Object.values(current.state.buzzes ?? {}).map((buzz) => buzz.receivedAtMs)
      return arrivals.length ? { ...current, state: { ...current.state, firstReceivedAtMs: Math.min(...arrivals) } } : undefined
    })
  }, [change, firstReceivedAtMs, hasBuzzes, isOpen, roundId, winnerPlayerId])
  useEffect(() => {
    if (!isOpen || !roundId || winnerPlayerId || typeof firstReceivedAtMs !== 'number' || (isRealtime && !clock)) return
    const now = () => clock && isRealtime ? estimatePress(clock, performance.now()).pressedAtMs : Date.now()
    const timer = window.setTimeout(() => { void change((current) => {
      if (!current || current.state.roundId !== roundId) return undefined
      const patch = decideRound(normalizeBuzzerState(current.state), now())
      return patch ? { ...current, state: { ...current.state, ...patch } } : undefined
    }) }, Math.max(0, firstReceivedAtMs + BUZZ_COLLECTION_MS - now() +
      (clock ? estimatePress(clock, performance.now()).uncertaintyMs : 0) + 20))
    return () => window.clearTimeout(timer)
  }, [change, clock, isRealtime, firstReceivedAtMs, isOpen, roundId, winnerPlayerId])

  const buzzes = orderBuzzes(sessionState.buzzes ?? [])
  const winner = buzzes.find((b) => b.playerId === sessionState.winnerPlayerId) ?? null
  const winnerTeam = buzzerTeams.find((team) => team.id === winner?.teamId) ?? null
  const ownBuzz = buzzes.find((b) => b.playerId === selectedPlayerId) ?? null
  const isBuzzPending = pendingRoundId !== null && pendingRoundId === sessionState.roundId
  const currentRoundId = String(sessionState.roundId ?? '')
  const canBuzz = Boolean(!store.isLoading && sessionState.isOpen && sessionState.roundId && selectedPlayer?.isActive &&
    !ownBuzz && !isBuzzPending && clockReady && online)

  const buzz = useCallback(async () => {
    const now = performance.now()
    const roundId = currentRoundId
    if (!canBuzz || !roundId || !selectedPlayer || buzzInFlight.current === roundId) return 'blocked' as const
    if (isRealtime && (!clock || now - clock.midpointMs > 60_000)) return 'blocked' as const
    const timing = clock && isRealtime ? estimatePress(clock, now) : { pressedAtMs: Date.now(), uncertaintyMs: 0 }
    buzzInFlight.current = roundId
    setPendingRoundId(roundId)
    try {
      const candidate: BuzzerBuzz = { roundId, playerId: selectedPlayerId, playerName: selectedPlayer.name,
        teamId: selectedPlayer.teamId, ...timing, receivedAtMs: await timestamp() }
      if (isRealtime) {
        const result = await updateRealtimeValue<BuzzerBuzz | null>((await getRealtimeDatabase())!,
          firebasePaths.liveBuzzerBuzz(activeLobbyId, selectedPlayerId), (current) => current ? undefined : candidate)
        setBuzzError(null)
        return result.committed ? 'saved' as const : 'blocked' as const
      }
      const result = await change((current) => {
        if (current?.players?.[selectedPlayerId]?.ownerUid !== session.userId ||
          current.state.clockSyncId !== current.players[selectedPlayerId].clockSyncId) return undefined
        return recordSessionBuzz(current, roundId, candidate)
      })
      return result.ok ? result.value ? 'saved' as const : 'blocked' as const : 'sync-error' as const
    } catch (error) {
      setBuzzError(createSyncError(error, 'realtime-database', 'save'))
      return 'sync-error' as const
    } finally {
      if (buzzInFlight.current === roundId) buzzInFlight.current = null
      setPendingRoundId((current) => current === roundId ? null : current)
    }
  }, [activeLobbyId, canBuzz, clock, currentRoundId, isRealtime, selectedPlayer, selectedPlayerId, change, session.userId, timestamp])

  const join = async (name: string, teamId: BuzzerTeamId | null, asHost: boolean) => {
    if (!session.isReady || store.isLoading) return syncSuccess(false)
    const joinedAtMs = await timestamp()
    return change((current) => {
      if (!current || asHost && current.hostUid && current.hostUid !== session.userId) return undefined
      const previous = current.players?.[selectedPlayerId]
      if (previous?.ownerUid && previous.ownerUid !== session.userId) return undefined
      const position = previous?.position ?? Object.values(current.players ?? {}).reduce((max, p) => Math.max(max, p.position || 0), 0) + 1
      const player: BuzzerPlayer = { ...previous, id: selectedPlayerId, position, name: name.trim().slice(0, 40) || `Person ${position}`,
        teamId, isActive: !asHost, ownerUid: session.userId, joinedAtMs, clockSyncId: null, clockSyncedAtMs: null,
        buzzedAt: null, buzzedAtClientIso: null }
      return { ...current, ...(asHost ? { hostUid: session.userId } : {}), players: { ...current.players, [selectedPlayerId]: player } }
    })
  }
  const startClockSync = async () => {
    const clockSyncId = createRandomId()
    const clockSyncRequestedAtMs = await timestamp()
    return change((current) => current?.hostUid === session.userId ? { ...current, state: {
      ...current.state, isOpen: false, clockSyncId, clockSyncRequestedAtMs,
    } } : undefined)
  }
  const canOpenRound = isHost && allClocksReady && online && !store.isPending
  const openRound = () => {
    const roundId = createRandomId()
    if (!canOpenRound) return Promise.resolve(syncSuccess(false))
    return change((current) => {
      if (!current || current.hostUid !== session.userId || !current.state.clockSyncId) return undefined
      const active = Object.values(current.players ?? {}).filter((p) => p.isActive && p.ownerUid)
      const now = clock && isRealtime ? estimatePress(clock, performance.now()).pressedAtMs : Date.now()
      if (!active.length || active.some((p) => p.clockSyncId !== current.state.clockSyncId ||
        !p.clockSyncedAtMs || isRealtime && now - p.clockSyncedAtMs >= CLOCK_RECENT_MS)) return undefined
      return { ...current, state: { ...normalizeBuzzerState(current.state), roundId, roundNumber: current.state.roundNumber + 1,
        buzzes: [], isOpen: true, winnerPlayerId: null, winnerTeamId: null, firstReceivedAtMs: null,
        lastBuzzedAt: null, lastBuzzedAtClientIso: null } }
    })
  }
  const closeRound = () => change((current) => current?.hostUid === session.userId && current.state.roundId === sessionState.roundId
    ? { ...current, state: { ...current.state, isOpen: false } } : undefined)
  const updatePlayerName = (name: string) => updatePlayer({ name: name.trim().slice(0, 40) || selectedPlayer?.name || 'Person' })
  const updatePlayerTeam = (teamId: BuzzerTeamId | null) => updatePlayer({ teamId })
  const toggleHostPlaying = async () => {
    if (!isHost || !selectedPlayer) return syncSuccess(false)
    return updatePlayer({ isActive: !selectedPlayer.isActive, joinedAtMs: await timestamp(), clockSyncId: null, clockSyncedAtMs: null })
  }
  const clearHistory = () => change((current) => current?.hostUid === session.userId ? { ...current, state: {
    ...current.state, history: (current.state.history ?? []).filter((entry) => entry.id === current.state.roundId),
  } } : undefined)

  return {
    buzz, buzzes, buzzerTeams, canBuzz, canOpenRound, clearHistory, closeRound, clock, clockReady,
    error: store.error ?? buzzError ?? clockError ?? session.error ?? (identity.ok ? null : identity.error),
    isLoading: store.isLoading || !session.isReady, isPending: store.isPending,
    isBuzzPending, isRealtime, online, openRound, players, selectedPlayer,
    sessionState, updatePlayerName, updatePlayerTeam, winner, winnerTeam, ownBuzz,
    isHost, hostTaken: Boolean(store.data.hostUid && !isHost), join, toggleHostPlaying, startClockSync,
    allClocksReady, syncReadyCount: syncedPlayers.length, eligibleForSync,
  }
}
