import { useEffect, useState } from 'react'
import { callApi } from './api'

const HEALTH_POLL_MS = 2000

type Health = { jobs: Record<string, number>; workers: Record<string, number> }

export function EndpointHealth() {
  const [health, setHealth] = useState<Health>()
  const [error, setError] = useState('')

  useEffect(() => {
    async function poll() {
      try {
        setHealth(await callApi<Health>('/api/health'))
        setError('')
      } catch (err) {
        setError((err as Error).message)
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
    <div className="border-4 border-black bg-black p-4 font-mono text-sm text-white">
      {error && <div className="font-bold">Health error: {error}</div>}
      {!health && !error && 'Loading endpoint status...'}
      {health && renderRow('Jobs', health.jobs)}
      {health && renderRow('Workers', health.workers)}
    </div>
  )
}
