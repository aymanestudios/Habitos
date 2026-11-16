// Iconos propios en SVG (así no necesitamos instalar ninguna librería de iconos).
// Para añadir uno nuevo: copia su dibujo aquí con un nombre nuevo.
const paths = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  habits: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 9.8" />
    </>
  ),
  friends: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M21 20v-1a5 5 0 0 0-3-4.5" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  flame: (
    <path d="M12 3c.8 3.2 5 5.2 5 9.8a5 5 0 0 1-10 0c0-2 .9-3.3 2-4.3.2 1 .8 1.8 1.7 2.2C10.3 8.2 11 5.6 12 3z" />
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  chart: <path d="M5 20v-8M12 20V5M19 20v-5" />,
  shield: <path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6z" />,
} as const

export type IconName = keyof typeof paths

export function Icon({ name, className = 'h-6 w-6' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
