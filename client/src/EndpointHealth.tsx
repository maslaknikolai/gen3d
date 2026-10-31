import { useEffect, useState } from 'react'
import { callApi } from './api'
import { Spinner } from './Spinner'

const HEALTH_POLL_MS = 2000

type Health = { jobs: Record<string, number>; workers: Record<string, number> }

export function EndpointHealth() {
  const [health, setHealth] = useState<Health>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function poll() {
      setLoading(true)
      try {
        setHealth(await callApi<Health>('/api/health'))
        setError('')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    poll()
    const timer = setInterval(poll, HEALTH_POLL_MS)
    return () => clearInterval(timer)
  }, [])

  const renderRow = (title: string, counts: Record<string, number>) => (
    <div>
      <span className="font-bold uppercase">{title}:</span>{' '}
      {Object.entries(counts).map(([name, n]) => `${name} ${n}`).join(', ')}
    </div>
  )

  return (
    <div className="relative border-4 border-black bg-black p-4 font-mono text-sm text-white">
      <span className="absolute top-2 right-2"><Spinner visible={loading} /></span>
      {error && <div className="font-bold">Health error: {error}</div>}
      {!health && !error && 'Loading endpoint status...'}
      {health && renderRow('Jobs', health.jobs)}
      {health && renderRow('Workers', health.workers)}
    </div>
  )
}
