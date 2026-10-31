import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { useEffect, useRef, useState } from 'react'

// The mesh has no texture and renders almost white.
const CLAY: [number, number, number, number] = [0.78, 0.74, 0.68, 1]

// fullscreen: loads at once and fills the parent. onOpen: called on a click that was not a drag.
export function ModelView({ src, fullscreen = false, onOpen }: { src: string; fullscreen?: boolean; onOpen?: () => void }) {
  const ref = useRef<ModelViewerElement>(null)
  const pressedAt = useRef({ x: 0, y: 0 })
  const [shown, setShown] = useState(fullscreen)

  useEffect(() => {
    const viewer = ref.current
    if (!viewer) {
      return
    }
    function paint() {
      for (const material of viewer!.model?.materials ?? []) {
        material.pbrMetallicRoughness.setBaseColorFactor(CLAY)
        material.pbrMetallicRoughness.setMetallicFactor(0)
        material.pbrMetallicRoughness.setRoughnessFactor(0.45)
      }
    }
    viewer.addEventListener('load', paint)
    return () => viewer.removeEventListener('load', paint)
  }, [])

  return (
    <div className={fullscreen ? 'relative size-full' : 'relative'}>
      <model-viewer
        ref={ref}
        src={shown ? src : undefined}
        alt="Generated 3D model"
        loading="lazy"
        auto-rotate
        camera-controls
        shadow-intensity="1"
        shadow-softness="0.6"
        environment-image="neutral"
        exposure="1.1"
        onPointerDown={(e) => (pressedAt.current = { x: e.clientX, y: e.clientY })}
        onClick={(e) => {
          if (onOpen && Math.hypot(e.clientX - pressedAt.current.x, e.clientY - pressedAt.current.y) < 5) {
            onOpen()
          }
        }}
        className={`block w-full ${fullscreen ? 'h-full' : 'aspect-square h-auto'} bg-[radial-gradient(#ffffff30_1px,transparent_1px),radial-gradient(circle,#3a3a3a,#000_75%)] [background-size:18px_18px,100%_100%]`}
      />
      {!shown && (
        <button
          type="button"
          onClick={() => setShown(true)}
          aria-label="Show 3D preview"
          className="absolute inset-0 m-auto size-14 cursor-pointer border-4 border-white bg-black text-white hover:bg-white hover:text-black"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mx-auto size-7">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
    </div>
  )
}
