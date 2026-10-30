import '@google/model-viewer'
import { useState, type FormEvent } from 'react'

const POLL_MS = 3000
const RESOLUTIONS = [512, 1024, 1536]

type Job = { status: string; error?: string; modelUrl?: string; resolution?: number }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error || res.statusText)
  }
  return body as T
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [file, setFile] = useState<File>()
  const [resolution, setResolution] = useState(1024)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [modelUrl, setModelUrl] = useState<string>()

  async function onSubmit(event: FormEvent) {
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
    <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Image to 3D</h1>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-neutral-100 p-5 dark:bg-neutral-800">
        <label className="block">
          <span className="mb-1 block text-sm">Image</span>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setFile(e.target.files?.[0])}
            className="block w-full text-sm"
          />
        </label>
        {file && <img src={URL.createObjectURL(file)} alt="Selected image" className="max-w-40 rounded-lg" />}

        <label className="block">
          <span className="mb-1 block text-sm">Resolution</span>
          <select
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-600"
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
          className="rounded-lg bg-teal-700 px-4 py-2 text-white disabled:opacity-50"
        >
          Generate
        </button>
      </form>

      {status && (
        <p role="status" className="text-neutral-500">
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
            className="block h-[420px] w-full rounded-lg bg-neutral-100 dark:bg-neutral-800"
          />
          <a href={modelUrl} download="model.glb" className="inline-block rounded-lg bg-teal-700 px-4 py-2 text-white">
            Download .glb
          </a>
        </div>
      )}
    </main>
  )
}
