import { EndpointHealth } from './EndpointHealth'
import { Generator } from './Generator'

export default function App() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <h1 className="border-b-8 border-black pb-2 text-5xl font-black tracking-tight uppercase">Image to 3D</h1>
      <EndpointHealth />
      <Generator />
    </main>
  )
}
