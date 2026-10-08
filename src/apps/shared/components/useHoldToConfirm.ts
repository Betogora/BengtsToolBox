import { useEffect, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'

export type HoldPhase = 'idle' | 'holding' | 'hint' | 'confirming' | 'done'

export const holdToConfirmTiming = { holdMs: 1500, hintMs: 1200, doneMs: 1600 }

/** Framework-free hold gesture: completes only after an uninterrupted hold. */
export function createHoldGesture({
  onPhaseChange,
}: {
  onPhaseChange: (phase: HoldPhase) => void
}) {
  let phase: HoldPhase = 'idle'
  let timer: ReturnType<typeof setTimeout> | undefined

  const setPhase = (next: HoldPhase, resetAfterMs?: number) => {
    clearTimeout(timer)
    phase = next
    onPhaseChange(next)
    if (resetAfterMs !== undefined) timer = setTimeout(() => setPhase('idle'), resetAfterMs)
  }

  const complete = async (onComplete: () => Promise<boolean>) => {
    setPhase('confirming')
    // A rejected action counts as not confirmed; the caller surfaces its own error state.
    const succeeded = await onComplete().catch(() => false)
    setPhase(succeeded ? 'done' : 'idle', succeeded ? holdToConfirmTiming.doneMs : undefined)
  }

  return {
    start(onComplete: () => Promise<boolean>) {
      if (phase !== 'idle' && phase !== 'hint') return
      setPhase('holding')
      timer = setTimeout(() => void complete(onComplete), holdToConfirmTiming.holdMs)
    },
    release() {
      if (phase === 'holding') setPhase('hint', holdToConfirmTiming.hintMs)
    },
    cancel() {
      if (phase === 'holding') setPhase('idle')
    },
    dispose() {
      clearTimeout(timer)
    },
  }
}

const isHoldKey = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' '

export function useHoldToConfirm(onComplete: () => Promise<boolean>) {
  const [phase, setPhase] = useState<HoldPhase>('idle')
  const [gesture] = useState(() => createHoldGesture({ onPhaseChange: setPhase }))
  useEffect(() => () => gesture.dispose(), [gesture])

  return {
    phase,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture?.(event.pointerId)
        gesture.start(onComplete)
      },
      onPointerUp: () => gesture.release(),
      onPointerCancel: () => gesture.cancel(),
      onBlur: () => gesture.cancel(),
      onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (!isHoldKey(event)) return
        event.preventDefault()
        if (!event.repeat) gesture.start(onComplete)
      },
      onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
        if (!isHoldKey(event)) return
        event.preventDefault()
        gesture.release()
      },
    },
  }
}
