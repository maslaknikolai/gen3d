import { useEffect, useState } from 'react'
import { callApi } from './api'
import { Spinner } from './Spinner'

const POLL_MS = 3000
const FINAL = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']

type Job = {
  status: string
  error?: string
  workerId?: string
  delayTime?: number
  executionTime?: number
  logs: string[]
}

function formatSeconds(ms?: number): string {
  return ms === undefined ? '-' : `${Math.round(ms / 1000)}s`
}

// Progress bars redraw one line with \r.
function getLastState(line: string): string {
  return line.split('\r').filter(Boolean).pop() ?? ''
}

export function JobStatus({ id, onDone }: { id: string; onDone: () => void }) {
  const [job, setJob] = useState<Job>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      setLoading(true)
      try {
        const next = await callApi<Job>(`/api/jobs/${id}`)
        setJob(next)
        setError('')
        if (next.status === 'COMPLETED') {
          onDone()
        }
        if (FINAL.includes(next.status)) {
          return
        }
      } catch (err) {
        // Runpod forgets a job ~30 min after it ends.
        setError((err as Error).message)
        return
      } finally {
        setLoading(false)
      }
      timer = setTimeout(poll, POLL_MS)
    }
    poll()
    return () => clearTimeout(timer)
  }, [id, onDone])

  if (error) {
    return <div>{error}</div>
  }
  if (!job) {
    return <Spinner />
  }
  const logs = job.logs.map(getLastState)
  return (
    <div className="flex h-full w-full flex-col gap-2 text-left">
      <div className="flex items-center gap-2">
        {job.status}
        {job.error ? `: ${job.error}` : ''}
        {loading && <Spinner />}
      </div>
      <div className="text-xs normal-case">
        worker {job.workerId ?? '-'} · queue {formatSeconds(job.delayTime)} · run {formatSeconds(job.executionTime)}
      </div>
      {logs.length > 0 && (
        <pre className="min-h-0 flex-1 overflow-auto bg-black p-2 text-[10px] leading-tight font-normal whitespace-pre-wrap normal-case text-white">
          {logs.join('\n')}
        </pre>
      )}
    </div>
  )
}
