import { AccessoryArt, EffectLayer, FRAME_STYLE, accessoryOnTop } from '@/features/rewards/RewardArt'
import { Avatar } from './Avatar'

type Props = {
  name: string
  photo?: string | null
  color?: string | null
  frame?: string | null
  accessory?: string | null
  effect?: string | null
  size?: number // px
  className?: string
}

// Avatar con lo que la persona lleva equipado: marco, accesorio y efecto (cosméticos de Logros).
export function ProfileAvatar({ name, photo, color, frame, accessory, effect, size = 80, className = '' }: Props) {
  const frameStyle = frame ? FRAME_STYLE[frame] : undefined
  const ring = frameStyle ? Math.max(3, Math.round(size * 0.06)) : 0
  const onTop = accessoryOnTop(accessory ?? null)
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <EffectLayer id={effect ?? null} />
      {frameStyle && (
        <span
          className={`absolute inset-0 rounded-full ${frameStyle.className ?? ''}`}
          style={{ background: frameStyle.background }}
          aria-hidden="true"
        />
      )}
      <span className="absolute rounded-full bg-surface" style={{ inset: ring ? ring - 1 : 0 }} aria-hidden="true" />
      <Avatar
        name={name}
        photo={photo}
        color={color}
        className="absolute"
        style={{ inset: ring, width: size - ring * 2, height: size - ring * 2, fontSize: size * 0.4 }}
      />
      {accessory && (
        <span
          className={onTop ? 'absolute left-1/2 -translate-x-1/2 -rotate-12' : 'absolute -bottom-[4%] -right-[4%]'}
          style={
            onTop
              ? { top: -size * 0.3, width: size * 0.55, height: size * 0.38 }
              : { width: size * 0.38, height: size * 0.38 }
          }
          aria-hidden="true"
        >
          <AccessoryArt id={accessory} />
        </span>
      )}
    </span>
  )
}
