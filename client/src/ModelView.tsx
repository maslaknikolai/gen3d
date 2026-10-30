import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { useEffect, useRef } from 'react'

// The mesh has no texture and renders almost white.
const CLAY: [number, number, number, number] = [0.78, 0.74, 0.68, 1]

export function ModelView({ src }: { src: string }) {
  const ref = useRef<ModelViewerElement>(null)

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
    <model-viewer
      ref={ref}
      src={src}
      alt="Generated 3D model"
      loading="lazy"
      auto-rotate
      camera-controls
      shadow-intensity="1"
      shadow-softness="0.6"
      environment-image="neutral"
      exposure="1.1"
      className="block aspect-square h-auto w-full bg-[radial-gradient(#ffffff30_1px,transparent_1px),radial-gradient(circle,#3a3a3a,#000_75%)] [background-size:18px_18px,100%_100%]"
    />
  )
}
