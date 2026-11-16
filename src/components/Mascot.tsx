// La mascota: el panda rojo de Progress&Go. La imagen vive en public/mascota.webp
// (ya sin fondo, así queda bien tanto en modo claro como en oscuro).
// Es decorativa: el texto de al lado ya dice todo, por eso alt="" y aria-hidden.

type Props = { className?: string }

export function Mascot({ className = 'h-32' }: Props) {
  return (
    <img
      src="/mascota.webp"
      alt=""
      aria-hidden="true"
      width={600}
      height={620}
      decoding="async"
      draggable={false}
      className={`w-auto select-none ${className}`}
    />
  )
}
