import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCodenamesAiSettings } from '@/apps/codenames/hooks/useCodenamesAiSettings'
import type { GameResponse, RevealResponse } from '@/apps/codenames/logic/protocol'
import { codenamesProxy, ProxyRequestError } from '@/apps/codenames/proxyClient'
import type { CodenamesState, HintStatus } from '@/apps/codenames/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

const initialState: CodenamesState = { game: null, view: null }

/** Fehlertext des Proxys oder `null` für „Proxy nicht erreichbar“. */
export function proxyErrorMessage(error: unknown): string | null {
  if (error instanceof ProxyRequestError && error.code !== 'network') return error.message || null
  return null
}

export function useCodenames(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const path = useMemo(() => firebasePaths.codenamesState(activeLobbyId), [activeLobbyId])
  const store = useFirestoreDoc<CodenamesState>(path, initialState)
  const ai = useCodenamesAiSettings()
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<HintStatus>({ status: 'idle' })
  /** null = noch unbekannt oder Proxy nicht erreichbar. */
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)
  const latest = useRef(store.data)
  const hintGame = useRef<string | null>(null)
  const settingsRef = useRef(ai.settings)

  useEffect(() => {
    latest.current = store.data
  }, [store.data])
  useEffect(() => {
    settingsRef.current = ai.settings
  }, [ai.settings])
  useEffect(() => {
    let active = true
    codenamesProxy.status().then(
      ({ aiConfigured: configured }) => active && setAiConfigured(configured),
      () => active && setAiConfigured(null),
    )
    return () => {
      active = false
    }
  }, [])

  const { save } = store
  const userId = session.userId

  const commit = useCallback(
    async (response: GameResponse) => {
      const next: CodenamesState = { game: response.game, view: response.view, updatedBy: userId ?? null }
      latest.current = next
      await save(next)
    },
    [save, userId],
  )

  const requestHint = useCallback(
    async (game = latest.current.game) => {
      if (!game || hintGame.current === game) return
      hintGame.current = game
      setHint({ status: 'loading' })
      const { model, reasoning } = settingsRef.current
      try {
        const response = await codenamesProxy.hint({
          game,
          model,
          reasoning,
        })
        // Inzwischen rückgängig gemacht oder neu gestartet: Hinweis verwerfen.
        if (latest.current.game === game) await commit(response)
        if (hintGame.current === game) setHint({ status: 'idle' })
      } catch (error) {
        if (hintGame.current === game) setHint({ status: 'error', message: proxyErrorMessage(error) ?? '' })
      } finally {
        if (hintGame.current === game) hintGame.current = null
      }
    },
    [commit],
  )

  const run = useCallback(
    async <T extends GameResponse>(action: () => Promise<T>): Promise<T> => {
      setBusy(true)
      try {
        const response = await action()
        await commit(response)
        if (response.view.phase === 'hinweis') void requestHint(response.game)
        else setHint({ status: 'idle' })
        return response
      } finally {
        setBusy(false)
      }
    },
    [commit, requestHint],
  )

  const requireGame = () => {
    const game = latest.current.game
    if (!game) throw new ProxyRequestError('', 'invalid-game')
    return game
  }

  const startGame = () => run(() => codenamesProxy.newGame())
  const reveal = (index: number): Promise<RevealResponse> => run(() => codenamesProxy.reveal(requireGame(), index))
  const pass = () => run(() => codenamesProxy.pass(requireGame()))
  const undo = () => run(() => codenamesProxy.undo(requireGame()))

  return {
    view: store.data.view,
    isLoading: store.isLoading,
    error: store.error ?? session.error,
    busy,
    hint,
    ai: ai.settings,
    aiConfigured,
    updateAi: ai.update,
    startGame,
    reveal,
    pass,
    undo,
    requestHint: () => requestHint(),
  }
}
