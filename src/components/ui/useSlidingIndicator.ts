import { useLayoutEffect, useRef } from 'react'

export function useSlidingIndicator() {
  const listRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    const measure = () => {
      if (list.dataset.variant === 'icon-tabs') {
        const items = [...list.querySelectorAll<HTMLElement>('.selection-item')]
        const trackStyle = getComputedStyle(list)
        const labelGap = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.5
        const allLabelsVisible = window.matchMedia('(min-width: 430px)').matches
        let baseWidth = 0
        let labelWidth = 0
        for (const item of items) {
          const style = getComputedStyle(item)
          const icon = item.querySelector('svg')
          baseWidth += Math.max(
            parseFloat(style.minWidth),
            parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + (icon?.getBoundingClientRect().width ?? 0),
          )
          const label = item.querySelector('.selection-label > span')
          if (label) {
            const range = document.createRange()
            range.selectNodeContents(label)
            const width = range.getBoundingClientRect().width + labelGap
            labelWidth = allLabelsVisible ? labelWidth + width : Math.max(labelWidth, width)
          }
        }
        const width = baseWidth + labelWidth + Math.max(0, items.length - 1) * parseFloat(trackStyle.columnGap)
          + parseFloat(trackStyle.paddingLeft) + parseFloat(trackStyle.paddingRight)
          + parseFloat(trackStyle.borderLeftWidth) + parseFloat(trackStyle.borderRightWidth)
        list.style.setProperty('--selection-width', `${Math.ceil(width)}px`)
      }
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
      characterData: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-checked', 'data-variant'],
    })
    observeItems()
    document.fonts.addEventListener('loadingdone', measure)
    void document.fonts.ready.then(measure)
    return () => {
      resize.disconnect()
      mutation.disconnect()
      document.fonts.removeEventListener('loadingdone', measure)
    }
  }, [])

  return { listRef, indicatorRef }
}
