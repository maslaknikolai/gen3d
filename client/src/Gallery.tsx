import { useEffect, useState } from 'react'
import { callApi } from './api'
import { JobStatus } from './JobStatus'
import { ModelView } from './ModelView'
import { Spinner } from './Spinner'

export type Generation = { id: string; createdAt: string; imageUrl: string; modelUrl?: string }

// No colons: Windows does not allow them in file names.
function makeFileName(createdAt: string): string {
  return `gen3d_${createdAt.slice(0, 19).replace('T', '_').replaceAll(':', '-')}.glb`
}

export function Gallery({ reloadKey, onChange }: { reloadKey: number; onChange: () => void }) {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    callApi<Generation[]>('/api/generations')
      .then((list) => {
        setGenerations(list)
        setError('')
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [reloadKey])

  if (error) {
    return <p className="border-4 border-black p-3 font-mono font-bold">Gallery error: {error}</p>
  }
  if (generations.length === 0) {
    return loading ? <Spinner /> : null
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 border-b-4 border-black pb-1 text-2xl font-black uppercase">
        Generated {loading && <Spinner />}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {generations.map((g) => (
          <article key={g.id} className="border-4 border-black">
            <div className="grid grid-cols-2 border-b-4 border-black">
              <a href={g.imageUrl} target="_blank" rel="noreferrer" className="border-r-4 border-black">
                <img src={g.imageUrl} alt="Input image" className="aspect-square w-full object-contain" />
              </a>
              {g.modelUrl ? (
                <ModelView src={g.modelUrl} />
              ) : (
                <div className="flex aspect-square overflow-hidden p-2 font-mono text-sm font-bold uppercase">
                  <JobStatus generation={g} onDone={onChange} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 p-2 font-mono text-sm font-bold">
              <span>{new Date(g.createdAt).toLocaleString()}</span>
              {g.modelUrl && (
                <a href={g.modelUrl} download={makeFileName(g.createdAt)} className="border-4 border-black bg-black px-3 py-1 text-white uppercase hover:bg-white hover:text-black">
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
