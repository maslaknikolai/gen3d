import { EndpointHealth } from './EndpointHealth'
import { Generator } from './Generator'

export default function App() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Image to 3D</h1>
      <EndpointHealth />
      <Generator />
    </main>
  )
}
