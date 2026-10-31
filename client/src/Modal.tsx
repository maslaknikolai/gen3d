import type { ReactNode } from 'react'
import { useEscapeKey } from './useEscapeKey'

// Fullscreen overlay. Render it only while it is open. Closes on the ✕ button and on Escape.
export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEscapeKey(true, onClose)

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black">
      {children}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close fullscreen view"
        className="absolute top-4 right-4 size-12 cursor-pointer border-4 border-white bg-black text-2xl font-black text-white hover:bg-white hover:text-black"
      >
        ✕
      </button>
    </div>
  )
}
