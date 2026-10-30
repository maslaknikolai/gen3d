import '@google/model-viewer'
import { useEffect, useState } from 'react'
import { api } from './api'

type Generation = { id: string; createdAt: string; imageUrl: string; modelUrl?: string }

// Past generations from the bucket: the input image and its model, one card each.
// reloadKey changes after each finished job, so the new one shows up.
export function Gallery({ reloadKey }: { reloadKey: number }) {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<Generation[]>('/api/generations')
      .then((list) => {
        setGenerations(list)
        setError('')
      })
      .catch((err: Error) => setError(err.message))
  }, [reloadKey])

  if (error) {
    return <p className="border-4 border-black p-3 font-mono font-bold">Gallery error: {error}</p>
  }
  if (generations.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h2 className="border-b-4 border-black pb-1 text-2xl font-black uppercase">Generated</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {generations.map((g) => (
          <article key={g.id} className="border-4 border-black">
            <div className="grid grid-cols-2 border-b-4 border-black">
              <img src={g.imageUrl} alt="Input image" className="aspect-square w-full border-r-4 border-black object-contain" />
              {g.modelUrl ? (
                <model-viewer
                  src={g.modelUrl}
                  alt="Generated 3D model"
                  loading="lazy"
                  auto-rotate
                  camera-controls
                  className="block aspect-square h-auto w-full bg-white"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center font-bold uppercase">No model</div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 p-2 font-mono text-sm font-bold">
              <span>{new Date(g.createdAt).toLocaleString()}</span>
              {g.modelUrl && (
                <a href={g.modelUrl} download="model.glb" className="border-4 border-black bg-black px-3 py-1 text-white uppercase hover:bg-white hover:text-black">
                  .glb
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
