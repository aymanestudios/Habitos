type Props = {
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
}

// Campo de texto con etiqueta. Tamaño de letra de 16 px: en iPhone, menos hace que Safari amplíe la pantalla.
export function TextField({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: Props) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none transition-colors placeholder:text-muted focus:border-brand"
      />
    </label>
  )
}
