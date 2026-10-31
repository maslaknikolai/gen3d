import type { ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { ModelView } from './ModelView'
import { useEscapeKey } from './useEscapeKey'

// Black fullscreen page with a ✕ button. ✕ and Escape go back like the browser Back button.
function ViewerPage({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  // On a direct link there is no page to go back to, so go home.
  function close() {
    if (location.key === 'default') {
      navigate('/', { replace: true })
    } else {
      navigate(-1)
    }
  }

  useEscapeKey(true, close)

  return (
    <main className="fixed inset-0 bg-black">
      {children}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute top-4 right-4 size-12 cursor-pointer border-4 border-white bg-black text-2xl font-black text-white hover:bg-white hover:text-black"
      >
        ✕
      </button>
    </main>
  )
}

export function ModelPage() {
  const { id } = useParams()
  return (
    <ViewerPage>
      <ModelView src={`/api/generations/${id}/model.glb`} fullscreen />
    </ViewerPage>
  )
}

export function ImagePage() {
  const { id } = useParams()
  return (
    <ViewerPage>
      <img src={`/api/generations/${id}/image`} alt="Input image" className="size-full object-contain" />
    </ViewerPage>
  )
}
