import { useCallback, useState } from 'react'
import { Route, Routes } from 'react-router'
import { EndpointHealth } from './EndpointHealth'
import { Gallery } from './Gallery'
import { Generator } from './Generator'
import { Header } from './Header'
import { ImagePage, ModelPage } from './ViewerPages'

function HomePage() {
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

// Page routes. The server must serve index.html for each of them (server/server.ts).
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/models/:id" element={<ModelPage />} />
      <Route path="/images/:id" element={<ImagePage />} />
    </Routes>
  )
}
