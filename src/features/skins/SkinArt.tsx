import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { skinCode, skinSrc } from './skinRules'
import type { Skin } from './skinRules'

type Layer = { src: string; x: number; y: number; w: number; h: number; anim: string; z: string; ox: number; oy: number; dir: number; delay: number }
type Manifest = { w: number; h: number; body: string; layers: Layer[] }

// Las capas de cada skin (public/skins/<código>/manifest.json). Se piden solo para las skins que ya tienes.
function useManifest(code: string) {
  return useQuery({
    queryKey: ['skin-manifest', code],
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 0,
    queryFn: async (): Promise<Manifest> => {
      const response = await fetch(`/skins/${code}/manifest.json`)
      if (!response.ok) throw new Error('manifest')
      return (await response.json()) as Manifest
    },
  })
}

type Props = { skin: Pick<Skin, 'file' | 'width' | 'height'>; className?: string; still?: boolean }

// Skin animada: el cuerpo respira, mueve las orejas y la cola, y lo de alrededor (estrellas, burbujas,
// notas…) tiene vida propia. Es decorativa (alt=""). Sin capas (aún cargando o error) = imagen quieta.
export function SkinArt({ skin, className = 'h-32', still = false }: Props) {
  const code = skinCode(skin)
  const manifest = useManifest(code)
  // Las animaciones de entrada (animate-*, origin-*) van en la caja; el tamaño, en la imagen que la mide
  const parts = className.split(/\s+/)
  const outer = parts.filter((c) => c.startsWith('animate-') || c.startsWith('origin-') || c === 'shrink-0').join(' ')
  const sizing = parts.filter((c) => !(c.startsWith('animate-') || c.startsWith('origin-') || c === 'shrink-0')).join(' ')
  const data = manifest.data

  const sizer = (
    <img
      src={skinSrc(skin)}
      alt=""
      aria-hidden="true"
      width={skin.width}
      height={skin.height}
      decoding="async"
      draggable={false}
      className={`w-auto select-none ${sizing} ${data && !still ? 'invisible' : ''}`}
    />
  )
  if (!data || still) return <span className={`relative inline-flex ${outer}`}>{sizer}</span>

  const layer = (l: Layer) => (
    <img
      key={l.src}
      src={`/skins/${code}/${l.src}`}
      alt=""
      draggable={false}
      className={`skin-layer ${l.anim !== 'none' ? `skin-anim-${l.anim}` : ''}`}
      style={
        {
          left: `${l.x}%`,
          top: `${l.y}%`,
          width: `${l.w}%`,
          height: `${l.h}%`,
          transformOrigin: `${l.ox}% ${l.oy}%`,
          animationDelay: `${l.delay}s`,
          '--dir': l.dir,
        } as CSSProperties
      }
    />
  )
  const inBody = data.layers.filter((l) => l.z !== 'deco')
  const around = data.layers.filter((l) => l.z === 'deco')

  return (
    <span className={`relative inline-flex ${outer}`} aria-hidden="true">
      {sizer}
      <span className={`absolute inset-0 skin-anim-${data.body}`}>{inBody.map(layer)}</span>
      <span className="absolute inset-0">{around.map(layer)}</span>
    </span>
  )
}
