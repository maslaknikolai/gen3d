import { useEffect, useState } from 'react'
import { api } from './api'

const POLL_MS = 3000
const FINAL = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']

type Job = { status: string; error?: string }

// Live Runpod status of one job, for a gallery card that has no model yet.
// Calls onDone when the job finishes, so the gallery reloads and gets the model.
export function JobStatus({ id, onDone }: { id: string; onDone: () => void }) {
  const [job, setJob] = useState<Job>()
  const [error, setError] = useState('')

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const next = await api<Job>(`/api/jobs/${id}`)
        setJob(next)
        setError('')
        if (next.status === 'COMPLETED') {
          onDone()
        }
        if (FINAL.includes(next.status)) {
          return
        }
      } catch (err) {
        setError((err as Error).message)
        return
      }
      timer = setTimeout(poll, POLL_MS)
    }
    poll()
    return () => clearTimeout(timer)
  }, [id, onDone])

  if (error) {
    return <span>{error}</span>
  }
  if (!job) {
    return <span>Checking...</span>
  }
  return (
    <span>
      {job.status}
      {job.error ? `: ${job.error}` : ''}
    </span>
  )
}
