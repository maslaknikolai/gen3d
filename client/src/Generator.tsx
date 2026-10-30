import '@google/model-viewer'
import { useState, type SubmitEvent } from 'react'
import { api } from './api'

const POLL_MS = 3000
const RESOLUTIONS = [512, 1024, 1536]

type Job = { status: string; error?: string; modelUrl?: string; resolution?: number }

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function Generator({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File>()
  const [resolution, setResolution] = useState(1024)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [modelUrl, setModelUrl] = useState<string>()

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      return
    }
    setBusy(true)
    setModelUrl(undefined)
    setStatus('Uploading...')
    const startedAt = Date.now()
    try {
      const { id } = await api<{ id: string }>('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: await readAsDataUrl(file), resolution }),
      })
      while (true) {
        const job = await api<Job>(`/api/jobs/${id}`)
        const seconds = Math.round((Date.now() - startedAt) / 1000)
        if (job.status === 'COMPLETED') {
          setStatus(`Done in ${seconds}s (resolution ${job.resolution}).`)
          setModelUrl(job.modelUrl)
          onDone()
          break
        }
        if (['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(job.status)) {
          throw new Error(`job ${job.status.toLowerCase()}${job.error ? `: ${job.error}` : ''}`)
        }
        // The first job on a cold worker takes a few minutes while the models load.
        const what = job.status === 'IN_QUEUE' ? 'Waiting for a GPU' : 'Generating'
        setStatus(`${what}... ${seconds}s (job ${id})`)
        await new Promise((r) => setTimeout(r, POLL_MS))
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5 border-4 border-black p-5">
        <label className="block">
          <span className="mb-2 block font-bold uppercase">Image</span>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setFile(e.target.files?.[0])}
            className="block w-full file:mr-3 file:cursor-pointer file:border-4 file:border-black file:bg-white file:px-3 file:py-1 file:font-bold file:uppercase hover:file:bg-black hover:file:text-white"
          />
        </label>
        {file && <img src={URL.createObjectURL(file)} alt="Selected image" className="max-w-40 border-4 border-black" />}

        <label className="block">
          <span className="mb-2 block font-bold uppercase">Resolution</span>
          <select
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            className="border-4 border-black bg-white px-3 py-1 font-bold"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <button
          disabled={busy || !file}
          className="cursor-pointer border-4 border-black bg-black px-5 py-2 font-bold text-white uppercase hover:bg-white hover:text-black disabled:cursor-default disabled:bg-white disabled:text-black disabled:opacity-40"
        >
          Generate
        </button>
      </form>

      {status && (
        <p role="status" className="border-4 border-black p-3 font-mono font-bold">
          {status}
        </p>
      )}

      {modelUrl && (
        <div className="space-y-3">
          <model-viewer
            src={modelUrl}
            alt="Generated 3D model"
            auto-rotate
            camera-controls
            className="block h-105 w-full border-4 border-black bg-white"
          />
          <a href={modelUrl} download="model.glb" className="inline-block border-4 border-black bg-black px-5 py-2 font-bold text-white uppercase hover:bg-white hover:text-black">
            Download .glb
          </a>
        </div>
      )}
    </>
  )
}
