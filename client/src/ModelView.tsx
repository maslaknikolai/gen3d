import '@google/model-viewer'
import type { ModelViewerElement } from '@google/model-viewer'
import { useEffect, useRef } from 'react'

// The mesh comes without a texture and renders almost white. Paint it gray matte (like clay)
// after load, so light and shadow show the shape.
const CLAY: [number, number, number, number] = [0.5, 0.5, 0.5, 1]

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
        material.pbrMetallicRoughness.setRoughnessFactor(0.7)
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
      shadow-softness="0.3"
      exposure="1.2"
      className="block aspect-square h-auto w-full bg-black bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[18px_18px]"
    />
  )
}
