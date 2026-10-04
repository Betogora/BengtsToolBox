import { useLayoutEffect, useRef } from 'react'

export function useSlidingIndicator() {
  const listRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    const measure = () => {
      const selected = list.querySelector<HTMLElement>(
        '[data-state="active"], [aria-checked="true"]',
      )
      if (!selected) {
        indicator.hidden = true
        return
      }
      const width = selected.offsetWidth
      const height = selected.offsetHeight
      const left = selected.offsetLeft
      const top = selected.offsetTop
      indicator.hidden = false
      indicator.style.width = `${width}px`
      indicator.style.height = `${height}px`
      indicator.style.transform = `translate(${left}px, ${top}px)`
    }
    const resize = new ResizeObserver(measure)
    const observeItems = () => {
      resize.disconnect()
      resize.observe(list)
      for (const item of list.children) {
        if (item !== indicator) resize.observe(item)
      }
      measure()
    }
    const mutation = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList')) observeItems()
      else measure()
    })
    mutation.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-checked'],
    })
    observeItems()
    return () => {
      resize.disconnect()
      mutation.disconnect()
    }
  }, [])

  return { listRef, indicatorRef }
}
