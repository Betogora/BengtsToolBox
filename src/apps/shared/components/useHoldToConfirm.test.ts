import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createHoldGesture, holdToConfirmTiming, type HoldPhase } from './useHoldToConfirm'

const { doneMs, hintMs, holdMs } = holdToConfirmTiming

function gesture(result: boolean | Error = true) {
  const phases: HoldPhase[] = []
  const onComplete = vi.fn(async () => {
    if (result instanceof Error) throw result
    return result
  })
  const gesture = createHoldGesture({ onPhaseChange: (phase) => phases.push(phase) })
  const hold = { ...gesture, start: () => gesture.start(onComplete) }
  return { hold, onComplete, phases, last: () => phases.at(-1) }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('hold to confirm', () => {
  it('confirms only after the full hold and then shows the success state', async () => {
    const { hold, onComplete, phases } = gesture()
    hold.start()
    await vi.advanceTimersByTimeAsync(holdMs - 1)
    expect(onComplete).not.toHaveBeenCalled()
    hold.start()
    await vi.advanceTimersByTimeAsync(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
    hold.release()
    await vi.advanceTimersByTimeAsync(doneMs)
    expect(phases).toEqual(['holding', 'confirming', 'done', 'idle'])
  })

  it('cancels an early release with a hint and allows a fresh hold', async () => {
    const { hold, onComplete, last } = gesture()
    hold.start()
    await vi.advanceTimersByTimeAsync(holdMs - 100)
    hold.release()
    expect(last()).toBe('hint')
    await vi.advanceTimersByTimeAsync(holdMs)
    expect(onComplete).not.toHaveBeenCalled()
    expect(last()).toBe('idle')

    hold.start()
    hold.cancel()
    expect(last()).toBe('idle')
    await vi.advanceTimersByTimeAsync(holdMs + hintMs)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it.each([
    ['a reported failure', false],
    ['a thrown error', new Error('denied')],
  ])('returns to idle without success after %s', async (_label, result) => {
    const { hold, phases } = gesture(result)
    hold.start()
    await vi.advanceTimersByTimeAsync(holdMs)
    expect(phases).toEqual(['holding', 'confirming', 'idle'])
  })
})
