type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string // nombre del grupo, para lectores de pantalla
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

// Fila de opciones tipo "píldora" donde solo se puede elegir una (frecuencia, dificultad, filtros...).
export function ChoiceChips<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              selected ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
