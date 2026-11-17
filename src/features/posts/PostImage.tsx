import { useState } from 'react'
import { Icon } from '@/components/Icon'

type Props = { url: string | undefined; alt: string; className?: string; loading?: boolean }

// Foto de una publicación: esqueleto mientras carga, aparece suave, y aviso si no se puede ver.
export function PostImage({ url, alt, className = '', loading = false }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [lastUrl, setLastUrl] = useState(url)
  if (url !== lastUrl) {
    setLastUrl(url)
    setState('loading')
  }

  if (!url) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-surface-2 text-muted ${loading ? 'skeleton' : ''} ${className}`}>
        {!loading && <Icon name="lock" className="h-6 w-6" />}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-surface-2 ${state === 'loading' ? 'skeleton' : ''} ${className}`}>
      {state === 'error' ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-sm text-muted">
          <Icon name="image" className="h-6 w-6" />
          No se pudo cargar
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover transition-opacity duration-500 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}
