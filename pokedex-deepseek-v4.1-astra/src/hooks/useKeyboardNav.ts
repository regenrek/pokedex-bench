import { useEffect, useRef } from 'react'

/** True for inputs, textareas, selects and contenteditable hosts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false
  const element = target as HTMLElement
  if (element.isContentEditable) return true
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export interface KeyboardNavHandlers {
  onStep: (delta: number) => void
  onFirst: () => void
  onLast: () => void
  onFocusSearch: () => void
}

/**
 * Global keyboard control: ←/→ step one entry, Home/End jump to the bounds and
 * `/` focuses the search field. Never fires while the user is typing.
 */
export function useKeyboardNav(handlers: KeyboardNavHandlers): void {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          ref.current.onStep(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          ref.current.onStep(1)
          break
        case 'Home':
          event.preventDefault()
          ref.current.onFirst()
          break
        case 'End':
          event.preventDefault()
          ref.current.onLast()
          break
        case '/':
          event.preventDefault()
          ref.current.onFocusSearch()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
