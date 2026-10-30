import type { ModelViewerElement } from '@google/model-viewer'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
        src?: string
        alt?: string
        'auto-rotate'?: boolean
        'camera-controls'?: boolean
        'shadow-intensity'?: string
        'shadow-softness'?: string
        exposure?: string
        'environment-image'?: string
        loading?: 'auto' | 'lazy' | 'eager'
      }
    }
  }
}
