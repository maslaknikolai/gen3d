import { useCallback, useState } from 'react'
import { EndpointHealth } from './EndpointHealth'
import { Gallery } from './Gallery'
import { Generator } from './Generator'
import { Header } from './Header'

export default function App() {
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <Header />
      <EndpointHealth />
      <Generator onSent={reload} />
      <Gallery reloadKey={reloadKey} onChange={reload} />
    </main>
  )
}
