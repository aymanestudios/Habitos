// La mascota: el panda rojo de Progress&Go, con varias poses (public/mascota/*.webp, ya sin fondo:
// queda bien en modo claro y oscuro). Es decorativa: el texto de al lado ya dice todo, por eso alt="".
//
// Dónde sale cada pose:
//   default  → inicio de sesión, ánimo normal
//   sleep    → por la mañana / día libre / "Nada pendiente" en Recordatorios
//   gym      → en marcha con los hábitos / "Crea tu primer hábito"
//   star     → logros, subir de nivel, estadísticas vacías
//   cheer    → ¡día completo!
//   laptop   → amigos (aún sin amigos)

export type MascotPose = 'default' | 'sleep' | 'gym' | 'star' | 'cheer' | 'laptop'

// Tamaño real de cada imagen (evita saltos de la página al cargar)
const POSES: Record<MascotPose, { src: string; width: number; height: number }> = {
  default: { src: '/mascota.webp', width: 600, height: 620 },
  sleep: { src: '/mascota/dormido.webp', width: 520, height: 273 },
  gym: { src: '/mascota/gimnasio.webp', width: 520, height: 376 },
  star: { src: '/mascota/estrella.webp', width: 488, height: 425 },
  cheer: { src: '/mascota/celebra.webp', width: 437, height: 487 },
  laptop: { src: '/mascota/portatil.webp', width: 424, height: 390 },
}

type Props = { className?: string; pose?: MascotPose }

export function Mascot({ className = 'h-32', pose = 'default' }: Props) {
  const image = POSES[pose]
  return (
    <img
      key={pose}
      src={image.src}
      alt=""
      aria-hidden="true"
      width={image.width}
      height={image.height}
      decoding="async"
      draggable={false}
      className={`animate-fade w-auto select-none ${className}`}
    />
  )
}
