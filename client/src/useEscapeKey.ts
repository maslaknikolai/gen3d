import { useEffect } from 'react'

// Calls onEscape when Escape is pressed while enabled is true.
export function useEscapeKey(enabled: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!enabled) {
      return
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscape()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
}
